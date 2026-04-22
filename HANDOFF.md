# Mission Control Handoff

## Goal

Build a single-page vanilla `HTML/CSS/JS` dashboard in `mission-control/` with:

- dark NASA / mission-control styling
- tabs/sections: Overview, System, Logs, Projects
- auto-refresh every 30 seconds
- responsive layout
- real local data where possible

## Files Intended

- `mission-control/index.html`
- `mission-control/styles.css`
- `mission-control/app.js`

## Current State

- The dashboard is **not finished yet**.
- `mission-control/index.html` existed as a stub before work started.
- No final `styles.css` or `app.js` was completed in this session.

## Real Data Sources Identified

- Workspace state:
  - `/home/yeetoz/.openclaw/workspace/.openclaw/workspace-state.json`
- Session records:
  - `/home/yeetoz/.openclaw/workspace/state/sessions/*.json`

Known example session file:

- `/home/yeetoz/.openclaw/workspace/state/sessions/agent%3Acodex%3Aacp%3A8e648301-4795-4c10-bc19-4a1fce4a68a5.json`

Useful fields in session JSON:

- `acpx_record_id`
- `acp_session_id`
- `agent_command`
- `cwd`
- `created_at`
- `updated_at`
- `closed`
- `pid`
- `agent_started_at`
- `agent_capabilities`

## Practical Dashboard Plan

Serve from the workspace root so the page can fetch sibling directories:

```bash
cd /home/yeetoz/.openclaw/workspace
python3 -m http.server 8080
```

Open:

- `http://127.0.0.1:8080/mission-control/`

Implementation approach that was planned:

- `Overview`
  - OpenClaw workspace status from `.openclaw/workspace-state.json`
  - active sessions from `state/sessions/*.json`
  - derived model/runtime list from session metadata
  - derived channel/capability list from `agent_capabilities`
- `System`
  - browser-accessible telemetry for CPU-like load, memory, storage
  - process table derived from session JSONs (`pid`, command, cwd, status)
- `Logs`
  - live operational feed from refresh events and session diffs
  - actual file tail only if a readable log source becomes available
- `Projects`
  - configurable project tabs stored in `localStorage`

## ACP / Codex Investigation

The visible recurring error during this session was:

- `ACP_TURN_FAILED: Timed out after 120000ms`

What was verified:

- `~/.npm/_logs/2026-04-21T*.log` showed repeated `codex-acp` launches succeeding.
- `~/.codex/log/codex-tui.log` did **not** show a matching ACP crash trace.
- `~/.codex/config.toml` did **not** expose a local timeout setting to change.

Conclusion:

- The timeout appears to be a **Codex/ACP client turn timeout**, not a dashboard bug.
- This session also made it worse by using long/noisy tool patterns.

## Recommendations For Next Session

- Keep turns small and atomic.
- Avoid background-polled commands.
- Prefer one direct patch at a time.
- Finish the dashboard in a few short edit/verify steps instead of one large turn.

