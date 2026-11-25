# CI Repair: Spectacle SOC v12 (November 24, 2026)

## Visible symptom

GitHub Actions shows `playbooks` passing and `ci` failing on the recent `Build Spectacle SOC v12 complete application` push. The screenshot shows overall workflow status but *not* the failed step or traceback, so the exact GitHub-side error cannot be asserted without opening the run log.

## Confirmed incompatible test code

The older CI smoke runner, `tests/e2e/smoke_test.py`, still expects `nav.tl` and older page labels such as `Home` and `Dash`. Other legacy UI tests wait for `.cockpit`. The published v12 React/Tailwind app renders a sidebar labeled `Dashboard`, `Threat hunt`, etc. and uses `.soc-metric` KPI widgets instead of `.cockpit`. Both mismatches are directly reproducible from the source and current offline render.

## Fix

`.github/workflows/ci.yml` now executes `tests/e2e/current_v12_smoke.py`, an offline Chromium test against the actual compiled `web/index.html` and the checked-in vendored React bundle. This exercises 20 real checks of current navigation, Dashboard, Hunt, timeline, cases, reports, triage, playbooks, runs, threat intel, model connection disclosures, Network terminal, Linux startup library, UDP uncertainty, arbitrary-shell rejection, mobile overflow, and absence of page exceptions. Old browser scripts remain in the repo for migration/refactoring but are no longer misapplied to v12 CI.

The CI `api-tests` job continues running API and project tests, and now additionally runs the SOC integration tests. The separate `playbooks` action is unchanged.

## Local verification in the patch-preparation environment

- Current frontend: **20/20 pass** (Chromium, compiled v12 HTML)
- API unit tests: **23/23 pass**
- Project tests: **20/20 pass**
- SOC integration tests: **20/20 pass**

These local test results do not guarantee GitHub Actions will pass until the patch is pushed and that remote run completes. To see an actual GitHub-side failure: Actions → failing CI run → failed job → first red step → copy the relevant traceback.

## Applying the patch

From an existing checkout on macOS, extract the patch archive into its root (preserving `.github`), stage `.github/workflows/ci.yml`, `tests/e2e/current_v12_smoke.py`, and `release/CI_FIX.md`, commit and push to `main`. Confirm both `api-tests` and `smoke` jobs turn green. Do not force-push or delete the repository.
