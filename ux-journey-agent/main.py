"""
UX Journey Agent HTTP API for CHECKION.
Uses browser-use (Playwright + LLM) to run autonomous browser tasks.
POST /run -> { url, task } -> { jobId }; GET /run/{jobId} -> status + result.
"""
from __future__ import annotations

import asyncio
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

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


def _history_to_steps(history: Any) -> list[dict[str, Any]]:
    """Map browser-use history to CHECKION steps format."""
    steps: list[dict[str, Any]] = []
    try:
        urls = list(history.urls()) if hasattr(history, "urls") and callable(history.urls) else []
        actions = list(history.action_history()) if hasattr(history, "action_history") and callable(history.action_history) else []
        for i, action_item in enumerate(actions):
            step_num = i + 1
            action_name = getattr(action_item, "name", str(action_item)) if not isinstance(action_item, str) else action_item
            steps.append({
                "step": step_num,
                "action": action_name,
                "target": getattr(action_item, "selector", None) or getattr(action_item, "target", None),
                "reasoning": getattr(action_item, "reasoning", None),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        if not steps and urls:
            for i, u in enumerate(urls):
                steps.append({"step": i + 1, "action": "navigate", "target": u, "timestamp": datetime.now(timezone.utc).isoformat()})
    except Exception as e:
        steps = [{"step": 1, "action": "run", "reasoning": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}]
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
    try:
        llm = _make_llm()
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

        result = {
            "jobId": job_id,
            "taskDescription": task,
            "siteDomain": domain,
            "steps": steps,
            "success": success,
            "screenshots": screenshots[:50],
        }

        async with _jobs_lock:
            if job_id in _jobs:
                _jobs[job_id].status = "complete"
                _jobs[job_id].result = result
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

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8320"))
    uvicorn.run(app, host="0.0.0.0", port=port)
