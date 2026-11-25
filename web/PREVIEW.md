# Offline preview

`preview-offline.html` is a single-file interface preview. Double-click it or serve it with a static web server. It embeds React so it can run without the React CDN; it does **not** provide backend login, workspace sync, or the Three.js mascot. Hunt on pasted files, Timeline with local event replay and CSV/JSON exports, local cases, playbooks, command search, theme, and workspace backup/restore remain client-side features. SHA-256 incident packet export requires a browser secure context (use localhost if this standalone file cannot access Web Crypto).

For the full application, use `./run.sh` from the repository root and open http://localhost:8080. The normal app can still use the CDN for its 3D mascot.
