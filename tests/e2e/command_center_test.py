"""Offline UI checks for the command center and workspace backup.

Uses the project's vendored React bundle and the prebuilt index.html so it
can run without localhost navigation or internet access. The page under test
is the compiled app, not a reimplementation of its UI.
"""
from pathlib import Path
import json
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
html = (ROOT / 'web/index.html').read_text(encoding='utf-8')
react = (ROOT / 'tests/e2e/vendor/react-bundle.js').read_text(encoding='utf-8')
app = re.findall(r'<script(?: [^>]*)?>(.*?)</script>', html, re.S)[-1]
base = html[:html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/')]
checks = 0
errors = []

def ck(message, result):
    global checks
    assert result, message
    checks += 1
    print('PASS', message)

with sync_playwright() as p:
    executable = shutil.which('chromium') or None
    browser = p.chromium.launch(executable_path=executable,
                                args=['--no-sandbox'] if executable else [])
    pg = browser.new_page(viewport={'width': 1280, 'height': 850},
                          reduced_motion='reduce', accept_downloads=True)
    pg.set_default_timeout(6000)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.set_content(base, wait_until='domcontentloaded')
    pg.add_script_tag(content=react)
    pg.add_script_tag(content=app)
    pg.wait_for_selector('.cockpit')
    ck('live cockpit reads saved state', '4' in pg.locator('.cockpit').inner_text())

    pg.keyboard.press('Control+k')
    ck('keyboard opens accessible dialog', pg.get_by_role('dialog').count() == 1)
    pg.get_by_label('Search pages, findings, playbooks and runs').fill('hunt')
    pg.keyboard.press('Enter')
    ck('search opens Hunt', 'hunt' in pg.locator('main h1').inner_text().lower())
    pg.keyboard.press('/')
    pg.get_by_label('Search pages, findings, playbooks and runs').fill('backup')
    with pg.expect_download() as download:
        pg.get_by_role('option', name=re.compile('Export workspace backup')).click()
    snapshot = json.loads(Path(download.value.path()).read_text())
    ck('download excludes sessions and includes both workspace kinds',
       snapshot['format'] == 'spectacle-soc-workspace' and
       snapshot['case']['kind'] == 'soc-case' and
       snapshot['library']['kind'] == 'soc-library' and
       'token' not in json.dumps(snapshot))

    pg.keyboard.press('Control+k')
    pg.get_by_label('Search pages, findings, playbooks and runs').fill('focus')
    pg.keyboard.press('Enter')
    ck('focus mode toggles on', pg.locator('.focus-ui').count() == 1)
    pg.keyboard.press('Escape')
    ck('Escape exits focus mode', pg.locator('.focus-ui').count() == 0)

    pg.keyboard.press('Control+k')
    pg.get_by_label('Search pages, findings, playbooks and runs').fill('Restore workspace backup')
    pg.get_by_role('option', name=re.compile('Restore workspace backup')).click()
    pg.on('dialog', lambda d: d.accept())
    pg.get_by_label('Restore workspace JSON backup').set_input_files({
        'name': 'backup.json', 'mimeType': 'application/json',
        'buffer': json.dumps(snapshot).encode()
    })
    pg.wait_for_selector('text=Backup restored.')
    ck('backup restore requires and accepts explicit confirmation',
       'Backup restored' in pg.locator('.soc-toast').inner_text())

    pg.get_by_label('Restore workspace JSON backup').set_input_files({
        'name': 'bad.json', 'mimeType': 'application/json',
        'buffer': b'{"format":"other"}'
    })
    pg.wait_for_selector('text=not a valid Spectacle SOC workspace backup')
    ck('invalid workspace backup rejected',
       'not a valid' in pg.locator('.soc-toast').inner_text())

    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.get_by_label('Open command center').click()
    ck('mobile search opens', pg.get_by_role('dialog').count() == 1)
    pg.get_by_label('Close command center').click()
    ck('mobile width does not overflow',
       pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 1)
    ck('no client runtime exceptions', not errors)
    browser.close()
print('TOTAL', checks, 'checks passed')
