# Spectacle SOC — Command Center UI

This frontend is a reusable React + TypeScript view composed with **Tailwind CSS v4 utility classes** and a separate set of custom styles for gradient cards and the app shell. It is integrated with the existing Spectacle SOC case, hunt, timeline, playbook, runs, and report workflows.

## Where to edit

- `src/soc-dashboard.tsx`: Sidebar, headers, metrics, timeline list, recommendation panel, case queue, charts, and mobile navigation. Shared components include `SOCShell`, `SOCPanel`, `SOCMetric`, `SOCSeverity`, and `SOCIcon`.
- `src/soc-dashboard.css`: gradients, dark-mode tokens, glass card surfaces, responsiveness, and workbench-compatible overrides.
- `src/tailwind-build.js`: builds Tailwind v4 utility CSS from class names used in the dashboard. Generated output `src/tailwind.output.css` is checked in so the app can build offline even when Tailwind isn't installed.
- `src/app.tsx`: existing application logic; its `home` route renders `SOCCommandDashboard`, and all pages use `SOCShell`.

## Build and run

From project root, execute `./run.sh` and open `http://localhost:8080` for the full frontend and Python API. `run.sh` recompiles the React/TypeScript code when TypeScript is available.

For UI changes with both development dependencies installed, run:

```bash
cd web
npm install
npm run build
```

To preview the client-side UI without installing anything, open `web/preview-offline.html`. This version embeds React and the Tailwind CSS. Use the sample-data toggle for the visual demonstration. Server login/sync and API features require `./run.sh`.

## Data and behavior

- **Sample data** is visibly labeled; it is mock illustration, not live SOC telemetry.
- **My workspace** reflects locally saved investigation state, captured Hunt events, case findings, evidence items and playbook runs.
- The assistant section is deterministic, **not** an LLM, and recommended actions only navigate to analyst workflows; they do not execute containment on remote endpoints.
- The app does not connect to a live SIEM, EDR, or log ingestion service. Time-range filters apply only to timestamped captured local detection events.
- The original case and playbook persistence, existing API, and offline evidence export are preserved.


## v5 review pane

The new two-column evidence and disposition UI is in `SOCBackendWorkbench` inside `src/soc-dashboard.tsx` with styles under `/* v5 review detail */` in `src/soc-dashboard.css`. It shows the synthetic Kyle fixture read-only when signed out; signed-in users see only their persisted runs. A triage decision is posted to `/v1/soc/triage`, not stored in browser localStorage. Results are redacted event excerpts, not original immutable forensic evidence.
