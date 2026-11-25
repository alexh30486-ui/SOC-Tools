# Spectacle SOC — browser interface

The compiled app is `index.html`. Its source is `src/app.tsx` and `src/head.html`. The source is a small React/TypeScript application assembled with `python3 build.py index.html`. The startup script in the repository root rebuilds it when TypeScript is available, then serves it with the Python API.

The interface contains case intake, log hunting, triage, playbook versioning, runs, dashboards, themes, a global command center, and JSON workspace backup/restore. It saves the local case in `soc1` and the library in `soc-lib`. See the root README for limits and security notes.

This app uses React and Three.js CDN assets in regular browser use. The offline browser tests inject a vendored React bundle to run without external network access.

## Investigation timeline

Use **Hunt → open as case → Timeline** to inspect stored detection events, annotate, replay chronologically, promote source records to case evidence, and export an incident packet. This is a local working investigation, not a live SIEM feed.
