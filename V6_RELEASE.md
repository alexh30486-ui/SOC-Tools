# Spectacle SOC v6 — Functional investigation pages

This release builds on the v5 React + TypeScript/Tailwind application and upgrades the lighter utility pages to real analyst workflows.

## Improvements

### Threat Intel: Indicator investigation lab

- Scan up to 100 recent locally captured timeline events, current case IOCs, and a user-submitted scratchpad excerpt.
- Extract IPs, URLs, domains, hashes, email addresses and CVEs with the existing local pattern extractor; review each result and its source event references. Extraction is neither validation nor threat reputation.
- Search, filter by IOC type, inspect provenance, jump to specific timeline event, and add an IOC to the current case evidence only through an explicit click.
- Keep scratchpad evidence marked **unverified**; scratchpad-only IOCs do not satisfy the source-verification quality gate.
- Export local indicators and provenance as JSON. Exported reports may contain sensitive material.
- New scenario reference library includes ATT&CK links, evidence checklist and opt-in creation of case *hypotheses*—not actual detections.
- Analyst method tab follows Capture -> Extract -> Correlate -> Triage -> Report.

### Help & Guides

- Five-step checklist reflecting actual workspace state, with links to the corresponding pages.
- FAQ clarifies demo vs live data, deterministic scoring, backend storage, evidence limitations, and response boundaries.
- Handling guidance for secrets, regulated data, credentials and incident export security.

### Reports

- New case quality gate, showing each real case checklist result and links back to source facts.
- Existing report, risk dashboard, cloud account controls and export tools remain in place below the gate.

## App changes

- `web/src/soc-dashboard.tsx`: `SOCThreatIntel`, `SOCGuidePage`, `SOCReportAudit`, `SOCCollectIndicators`.
- `web/src/soc-dashboard.css`: responsive gradient layouts and accessible control states.
- `web/src/app.tsx`: Threat Intel / Help / Reports routes and provenance-aware checks.
- `web/preview-offline.html`: single-file preview with bundled React, no live backend.

## Data boundaries and limitations

- No live SIEM, VirusTotal, IP reputation, WHOIS, external enrichment, autonomous AI, or host containment. Detection probabilities are **not** produced.
- The HTML offline preview has mock API responses; Supabase login, Redis queuing and server-side triage require the real app and configured credentials.
- The indicator extractor is heuristic and can miss indicators or falsely classify benign strings. Review before escalating.
- 'Case evidence' means a workspace record. It is not immutable forensic evidence or a certified chain of custody.
- Scratchpad strings remain in frontend memory until cleared or the view is exited; manually promoted IOCs enter case state. Files/exports may contain sensitive indicator strings.

## Run

```bash
cd spectacle-soc
./run.sh
```

Visit `http://localhost:8080`. Or open `web/preview-offline.html` for an offline frontend preview. Ensure TypeScript is installed to rebuild edits to `.tsx` sources (`npm install` in `web` if necessary).

## Verification

- TSX compilation passed.
- Frontend browser interaction checks via `set_content` (navigation to localhost and file URLs was restricted in the test environment): indicator extraction, filtering, selected source, add-to-case, scenario switching, guidance, FAQ, and report gate.
- Tested at 1440px and 390px widths: no JS page errors or horizontal overflow reported in those checks.
- Original backend tests: 49 passed and 2 rate-limited (HTTP 429) when run together; each of those two passed when separately executed. No live Supabase/Redis service was tested.
