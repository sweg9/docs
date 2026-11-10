# API conventions

Each service keeps its API as an OpenAPI 3.1 file. This wiki renders the file as a browsable reference, so the spec is the single source and the page never drifts from it.

## Specs

| Service | Spec | Status |
|---|---|---|
| backend-server | [Reference](./backend-server) · [`backend-server.yaml`](/api/backend-server.yaml){target="_blank"} | <Badge type="warning" text="draft" /> |

## Rules

- **One file per service** at `public/api/<service>.yaml`. The owning repo is the source; copy its spec here when it changes.
- **Names follow the proposal.** Records and states come from [Architecture](/overview/architecture): mapping status `Pending`, `Verified`, `Rejected`, `Stale`; channels `IR`, `WIFI`, `BT`, `ARM`; control kinds `switch`, `toggle`, `power_strip`.
- **Trace requirements.** Each operation lists the requirements it serves in `x-requirements`, for example `[FR-02]`, using the numbers in [Requirements](/product/requirements).
- **Errors** use one shape: `{"code": "...", "message": "...", "reason": "..."}` with a human-readable `reason`.
- **Times** are UTC ISO 8601. **Confidence** is a number from 0 to 1.
- **Live updates** (a new control, a new routine, the progress of a run) are pushed to the app over a WebSocket.
- **Status** goes in `info.x-status`: `draft`, `review` or `stable`.

## Add a spec

1. Put the file at `public/api/<service>.yaml`.
2. Create `api/<service>.md`:

   ```md
   # <service>

   <ApiSpec src="/api/<service>.yaml" />
   ```

3. Add the page to the sidebar in `.vitepress/config.mts`.
