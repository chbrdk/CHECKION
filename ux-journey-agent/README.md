# UX Journey Agent (CHECKION Monorepo)

Browser agent service for CHECKION: runs autonomous navigation tasks (URL + natural language goal) using [browser-use](https://github.com/browser-use/browser-use) (Playwright + LLM).

## API

- **POST /run** – Body: `{ "url": "https://example.com", "task": "Find product X and add to cart" }` → `{ "jobId": "uuid" }`
- **GET /run/{jobId}** – Returns `{ "status": "running"|"complete"|"error", "result?: { steps, success, ... }" }`
- **GET /health** – `{ "status": "ok" }`

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | one of these | Claude (recommended) |
| `OPENAI_API_KEY` | one of these | OpenAI fallback |
| `UX_JOURNEY_MAX_STEPS` | no | Max agent steps (default 25) |
| `UX_JOURNEY_CLAUDE_MODEL` | no | Claude model (default claude-sonnet-4-20250514) |
| `UX_JOURNEY_VIDEO_DIR` | no | Directory for video files (default `/tmp/ux-journey-videos`). Every run attempts to record; video is served at GET /run/{jobId}/video when browser-use supports it. |
| `UX_JOURNEY_STEP_DELAY_SECONDS` | no | Seconds to wait after each step so the recording clearly shows each action (default 2.5). Combined with a red circle overlay at click positions. |
| `PORT` | no | HTTP port (default 8320) |

## Local run

```bash
cd ux-journey-agent
pip install -r requirements.txt
python -m playwright install chromium
export ANTHROPIC_API_KEY=sk-ant-...
python main.py
# POST http://localhost:8320/run with { "url", "task" }
```

## Docker (Coolify)

- **Build context:** `ux-journey-agent` (root directory of this service).
- **Dockerfile path:** `Dockerfile`.
- **Port:** 8320.
- In Coolify: add env `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`). Optionally `UX_JOURNEY_MAX_STEPS`.

See [Coolify deployment](../../docs/deployment/coolify-ux-journey-agent.md) for step-by-step.
