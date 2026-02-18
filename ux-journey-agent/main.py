"""
UX Journey Agent HTTP API for CHECKION.
Uses browser-use (Playwright + LLM) to run autonomous browser tasks.
POST /run -> { url, task } -> { jobId }; GET /run/{jobId} -> status + result.
Screen recording is attempted for every run; GET /run/{jobId}/video returns the video (when browser-use supports record_video_dir).
"""
from __future__ import annotations

import asyncio
import glob
import os
import shutil
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Directory for recorded videos (per job)
VIDEO_BASE_DIR = Path(os.environ.get("UX_JOURNEY_VIDEO_DIR", "/tmp/ux-journey-videos"))

# Seconds to wait after each step so the video clearly shows each action (configurable)
STEP_DELAY_SECONDS = float(os.environ.get("UX_JOURNEY_STEP_DELAY_SECONDS", "2.5"))
# How long the red click circle stays visible (seconds)
CLICK_CIRCLE_VISIBLE_SECONDS = 1.5

# ---------------------------------------------------------------------------
# Job store (in-memory; replace with Redis/DB for multi-instance)
# ---------------------------------------------------------------------------

@dataclass
class JobState:
    job_id: str
    status: str  # "running" | "complete" | "error"
    url: str
    task: str
    result: dict[str, Any] | None = None
    error: str | None = None
    video_path: str | None = None  # path to recorded video file (if any)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

_jobs: dict[str, JobState] = {}
_jobs_lock = asyncio.Lock()

# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    url: str
    task: str

class RunResponse(BaseModel):
    jobId: str

# ---------------------------------------------------------------------------
# Browser-use agent runner (async, one job at a time per process)
# ---------------------------------------------------------------------------

def _make_llm():
    """Create LLM from env: Anthropic (ANTHROPIC_API_KEY) or OpenAI (OPENAI_API_KEY)."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            from browser_use import ChatAnthropic
        except ImportError:
            from browser_use.llm.anthropic import ChatAnthropic
        return ChatAnthropic(
            model=os.environ.get("UX_JOURNEY_CLAUDE_MODEL", "claude-sonnet-4-20250514"),
            temperature=0,
        )
    if os.environ.get("OPENAI_API_KEY"):
        try:
            from browser_use import ChatOpenAI
        except ImportError:
            from browser_use.llm.openai import ChatOpenAI
        return ChatOpenAI(model=os.environ.get("UX_JOURNEY_OPENAI_MODEL", "gpt-4o"), temperature=0)
    raise RuntimeError("Set ANTHROPIC_API_KEY or OPENAI_API_KEY for the agent LLM.")


def _normalize_action_entry(entry: Any) -> tuple[str, str, str]:
    """Extract (action_label, target, result) from one action_history entry. Entry can be dict, list of dicts, or object."""
    action_label = "step"
    target = ""
    result = ""
    raw: Any = entry
    if isinstance(entry, (list, tuple)) and len(entry) > 0:
        raw = entry[0]
    # Handle list of dicts (e.g. [{'navigate': {...}, 'result': '...'}])
    if isinstance(raw, (list, tuple)) and len(raw) > 0:
        raw = raw[0]
    if not isinstance(raw, dict):
        # May be an object with __dict__ or attributes
        res = getattr(raw, "result", None) or ""
        result = str(res)[:500]
        return (getattr(raw, "name", str(raw))[:50] if hasattr(raw, "name") else str(raw)[:50], "", result)
    # Keys like 'navigate', 'click', 'done' with payload; plus 'result' or 'interacted_element'
    res = raw.get("result") or ""
    elem = raw.get("interacted_element")
    if "navigate" in raw:
        pl = raw["navigate"] or {}
        url = pl.get("url", "")
        action_label = "navigate"
        target = url
        result = (res or "")[:500]
    elif "click" in raw:
        pl = raw["click"] or {}
        action_label = "click"
        if elem is not None:
            attrs = getattr(elem, "attributes", None) or {}
            if isinstance(attrs, dict):
                target = attrs.get("ax_name") or attrs.get("aria-label") or attrs.get("href") or ""
            target = target or getattr(elem, "x_path", "") or str(pl.get("index", ""))
        else:
            target = str(pl.get("index", ""))
        result = (res or "")[:500]
    elif "done" in raw:
        pl = raw["done"] or {}
        action_label = "done"
        target = "—"
        result = (pl.get("text") or res or "")[:1000]
    else:
        key = next((k for k in raw if k not in ("result", "interacted_element")), "step")
        action_label = str(key)
        target = str(raw.get(key, ""))[:200] if isinstance(raw.get(key), dict) else ""
        result = (res or "")[:500]
    return (action_label, target, result)


def _history_to_steps(history: Any) -> list[dict[str, Any]]:
    """Map browser-use action_history to CHECKION steps (readable labels, target, result)."""
    steps: list[dict[str, Any]] = []
    try:
        actions = list(history.action_history()) if hasattr(history, "action_history") and callable(history.action_history) else []
        for i, action_item in enumerate(actions):
            step_num = i + 1
            action_label, target, result = _normalize_action_entry(action_item)
            steps.append({
                "step": step_num,
                "action": action_label,
                "target": target or None,
                "result": result or None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        if not steps and hasattr(history, "urls") and callable(history.urls):
            for i, u in enumerate(history.urls()):
                steps.append({
                    "step": i + 1,
                    "action": "navigate",
                    "target": u,
                    "result": None,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    except Exception as e:
        steps = [{
            "step": 1,
            "action": "run",
            "target": None,
            "result": str(e)[:500],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }]
    return steps


def _history_success(history: Any) -> bool:
    """Whether the agent run completed successfully."""
    if hasattr(history, "is_done") and callable(history.is_done):
        return bool(history.is_done())
    return True


def _history_screenshots(history: Any) -> list[str]:
    """Extract screenshot base64 strings from history (if any)."""
    if not hasattr(history, "screenshots") or not callable(history.screenshots):
        return []
    try:
        out = list(history.screenshots())
        return out if isinstance(out, list) else []
    except Exception:
        return []


async def run_agent(job_id: str, url: str, task: str) -> None:
    try:
        from browser_use import Agent, Browser
    except ImportError as e:
        async with _jobs_lock:
            j = _jobs.get(job_id)
            if j:
                j.status = "error"
                j.error = f"browser-use not available: {e}"
        return

    async with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].status = "running"

    browser = None
    VIDEO_BASE_DIR.mkdir(parents=True, exist_ok=True)
    video_dir = str(VIDEO_BASE_DIR / job_id)
    os.makedirs(video_dir, exist_ok=True)

    try:
        llm = _make_llm()
        try:
            browser = Browser(record_video_dir=video_dir)
        except TypeError:
            browser = Browser()
        # Prefer initial_url if supported; else bake URL into task
        import inspect
        sig = inspect.signature(Agent.__init__)
        agent_kw: dict[str, Any] = {"task": task, "llm": llm, "browser": browser}
        if "initial_url" in sig.parameters:
            agent_kw["initial_url"] = url
        else:
            agent_kw["task"] = f"Go to {url}. Then: {task}"
        agent = Agent(**agent_kw)
        max_steps = int(os.environ.get("UX_JOURNEY_MAX_STEPS", "25"))
        if hasattr(agent, "max_steps"):
            agent.max_steps = max_steps

        async def _on_step_end(agent_instance: Any) -> None:
            # 1) Try to show red circle at last click position (visible in the recording)
            try:
                actions = list(agent_instance.history.action_history()) if hasattr(agent_instance.history, "action_history") and callable(agent_instance.history.action_history) else []
                if actions:
                    last_entry = actions[-1]
                    raw = last_entry[0] if isinstance(last_entry, (list, tuple)) and len(last_entry) > 0 else last_entry
                    if isinstance(raw, dict) and raw.get("interacted_element"):
                        elem = raw["interacted_element"]
                        if hasattr(elem, "bounds") and elem.bounds is not None:
                            b = elem.bounds
                            cx = getattr(b, "x", 0) + getattr(b, "width", 0) / 2
                            cy = getattr(b, "y", 0) + getattr(b, "height", 0) / 2
                            radius = 24
                            ms = int(CLICK_CIRCLE_VISIBLE_SECONDS * 1000)
                            js = (
                                f"(function(){{var el=document.getElementById('agent-click-ring');"
                                f"if(el)el.remove();el=document.createElement('div');el.id='agent-click-ring';"
                                f"el.style.cssText='position:fixed;left:{cx - radius}px;top:{cy - radius}px;"
                                f"width:{radius*2}px;height:{radius*2}px;border-radius:50%;border:4px solid #e53935;"
                                f"pointer-events:none;z-index:2147483647;box-shadow:0 0 0 2px rgba(229,57,53,0.5);';"
                                f"document.body.appendChild(el);setTimeout(function(){{el.remove();}},{ms});}})();"
                            )
                            cdp = await agent_instance.browser_session.get_or_create_cdp_session()
                            if cdp:
                                if hasattr(cdp, "cdp_client"):
                                    send = getattr(cdp.cdp_client, "send", None)
                                    if send and hasattr(send, "Runtime"):
                                        await send.Runtime.evaluate(expression=js, session_id=cdp.session_id)
                                elif hasattr(cdp, "send"):
                                    send = cdp.send
                                    if hasattr(send, "Runtime"):
                                        await send.Runtime.evaluate(expression=js, session_id=cdp.session_id)
                            await asyncio.sleep(CLICK_CIRCLE_VISIBLE_SECONDS)
            except Exception:
                pass
            # 2) Pause so the video clearly shows the state before the next step
            await asyncio.sleep(max(0.5, STEP_DELAY_SECONDS - CLICK_CIRCLE_VISIBLE_SECONDS))

        try:
            history = await agent.run(on_step_end=_on_step_end)
        except TypeError:
            history = await agent.run()

        # Map browser-use history to CHECKION result format
        steps = _history_to_steps(history)
        success = _history_success(history)
        screenshots = _history_screenshots(history)

        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc or url
        except Exception:
            domain = url

        # Move recorded video to a known path (browser-use[video] writes MP4, Playwright can write WebM)
        video_path: str | None = None
        if os.path.isdir(video_dir):
            for ext in ("*.mp4", "*.webm"):
                found = glob.glob(os.path.join(video_dir, ext))
                if found:
                    suffix = ext.replace("*", "")
                    dest = VIDEO_BASE_DIR / f"{job_id}{suffix}"
                    try:
                        shutil.move(found[0], str(dest))
                        video_path = str(dest)
                        break
                    except Exception:
                        pass
            try:
                shutil.rmtree(video_dir, ignore_errors=True)
            except Exception:
                pass

        result = {
            "jobId": job_id,
            "taskDescription": task,
            "siteDomain": domain,
            "steps": steps,
            "success": success,
            "screenshots": screenshots[:50],
        }
        if video_path:
            result["videoUrl"] = f"/run/{job_id}/video"

        async with _jobs_lock:
            if job_id in _jobs:
                _jobs[job_id].status = "complete"
                _jobs[job_id].result = result
                if video_path:
                    _jobs[job_id].video_path = video_path
    except Exception as e:
        async with _jobs_lock:
            if job_id in _jobs:
                _jobs[job_id].status = "error"
                _jobs[job_id].error = str(e)
    finally:
        if browser is not None:
            try:
                await browser.close()
            except Exception:
                pass

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="UX Journey Agent", description="CHECKION browser agent: run tasks via POST /run, poll GET /run/{jobId}")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/run", response_model=RunResponse)
async def start_run(body: RunRequest) -> RunResponse:
    url = (body.url or "").strip()
    task = (body.task or "").strip()
    if not url or not task:
        raise HTTPException(status_code=400, detail="url and task are required")
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="url must be http(s)")

    job_id = str(uuid.uuid4())
    async with _jobs_lock:
        _jobs[job_id] = JobState(job_id=job_id, status="running", url=url, task=task)

    asyncio.create_task(run_agent(job_id, url, task))
    return RunResponse(jobId=job_id)

@app.get("/run/{job_id}")
async def get_run(job_id: str) -> dict[str, Any]:
    async with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    out: dict[str, Any] = {
        "status": job.status,
        "jobId": job_id,
    }
    if job.result:
        out["result"] = job.result
    if job.error:
        out["error"] = job.error
    return out


@app.get("/run/{job_id}/video")
async def get_run_video(job_id: str) -> FileResponse:
    """Return the recorded journey video (MP4 or WebM from browser-use[video] or Playwright)."""
    async with _jobs_lock:
        job = _jobs.get(job_id)
    if not job or not job.video_path or not os.path.isfile(job.video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    media_type = "video/mp4" if job.video_path.lower().endswith(".mp4") else "video/webm"
    filename = f"journey-{job_id}.mp4" if media_type == "video/mp4" else f"journey-{job_id}.webm"
    return FileResponse(
        job.video_path,
        media_type=media_type,
        filename=filename,
    )

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8320"))
    uvicorn.run(app, host="0.0.0.0", port=port)
