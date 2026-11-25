"""Current Spectacle SOC v12 UI smoke test, intentionally offline.

Exercises the published compiled UI rather than an obsolete pre-redesign DOM.
Uses the vendored React runtime; no browser localhost or external CDN access needed.
See release/CI_FIX.md for why the original e2e smoke was superseded.
"""
from pathlib import Path
import json
import re
import shutil
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
html = (ROOT / "web/index.html").read_text(encoding="utf-8")
base = html[:html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/')]
inline_scripts = re.findall(r"<script(?: [^>]*)?>(.*?)</script>", html, re.S)
react = (ROOT / "tests/e2e/vendor/react-bundle.js").read_text(encoding="utf-8")
shots = ROOT / "tests/e2e/shots"
shots.mkdir(exist_ok=True)
results = []
errors = []

def check(name, predicate):
    ok = bool(predicate)
    results.append({"check": name, "passed": ok})
    print(("PASS" if ok else "FAIL") + ": " + name, flush=True)
    if not ok:
        raise AssertionError(name)

with sync_playwright() as p:
    executable = shutil.which("chromium")
    browser = p.chromium.launch(executable_path=executable or None,
                                args=["--no-sandbox"] if executable else [])
    context = browser.new_context(viewport={"width": 1440, "height": 900},
                                  reduced_motion="reduce", accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(10000)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.set_content(base, wait_until="domcontentloaded")
    page.add_script_tag(content=react)
    for script in inline_scripts:
        if script.strip():
            page.add_script_tag(content=script)
    page.get_by_role("heading", name="SOC Command Center").wait_for()

    def section(label):
        page.get_by_role("button", name=label, exact=True).first.click()

    check("01 - boot root and application navigation",
          page.locator("#root").count() == 1 and page.locator("nav").count() == 1)
    check("02 - default dashboard renders",
          page.locator("main h1").inner_text() == "SOC Command Center")
    check("03 - five dashboard metrics show",
          page.locator("main .soc-metric").count() == 5)
    check("04 - sample data clearly identified",
          "Sample data" in page.locator("main").inner_text() and
          "Synthetic test mode" in page.locator("main").inner_text())
    page.screenshot(path=str(shots / "ci-v12-dashboard-desktop.png"), full_page=False)
    section("Threat hunt")
    check("05 - threat hunt accessible", page.locator("main h1").inner_text() == "Hunt")
    section("Event timeline")
    check("06 - event timeline accessible", page.locator("main h1").inner_text() == "Evidence timeline")
    section("Cases")
    check("07 - cases accessible", page.locator("main h1").inner_text() == "Case")
    section("Reports")
    check("08 - reports accessible", page.locator("main h1").inner_text() == "dashboard")
    section("Triage matrix")
    check("09 - triage accessible", page.locator("main h1").inner_text() == "triage matrix")
    section("Playbooks")
    check("10 - incident response playbooks accessible",
          page.locator("main h1").inner_text() == "Playbooks" and
          "Password Spray" in page.locator("main").inner_text())
    section("Response runs")
    check("11 - playbook runs accessible", page.locator("main h1").inner_text() == "Runs")
    section("Threat intel")
    check("12 - indicator investigation accessible", page.locator("main h1").inner_text() == "Indicator investigation lab")
    section("Models & adapters")
    check("13 - Gemma model settings accessible", page.locator("main h1").inner_text() == "Models & LoRA adapters")
    check("14 - unconnected model clearly marked",
          "Gemma serving not connected" in page.locator("main").inner_text() and
          "LoRA not loaded" in page.locator("main").inner_text())
    section("Network terminal")
    check("15 - network terminal accessible", page.locator("main h1").inner_text() == "Network terminal")
    check("16 - Linux commands loaded without execution",
          "25 essential commands registered" in page.locator("main").inner_text() and
          "no shell commands executed" in page.locator("main").inner_text())
    cmd = page.get_by_label("Network diagnostic command")
    cmd.fill("udp 127.0.0.1 5300")
    page.get_by_role("button", name="Run command").click()
    check("17 - UDP silent response correctly inconclusive",
          "[INCONCLUSIVE]" in page.locator("main").inner_text() and
          "SIMULATED" in page.locator("main").inner_text())
    cmd.fill("rm -rf /")
    page.get_by_role("button", name="Run command").click()
    check("18 - arbitrary shell execution blocked",
          "Unlisted shell commands are blocked" in page.locator("main").inner_text())
    page.screenshot(path=str(shots / "ci-v12-terminal-desktop.png"), full_page=False)
    page.set_viewport_size({"width": 390, "height": 844})
    check("19 - 390px viewport has no horizontal overflow",
          page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 1)
    check("20 - no browser script exceptions", not errors)
    page.screenshot(path=str(shots / "ci-v12-terminal-mobile.png"), full_page=False)
    browser.close()

report = {"passed": len(results), "total": 20, "checks": results, "errors": errors}
(shots / "ci-v12-smoke-results.json").write_text(json.dumps(report, indent=2) + "\n")
print("RESULT:", report["passed"], "/", report["total"])
sys.exit(0 if report["passed"] == report["total"] else 1)
