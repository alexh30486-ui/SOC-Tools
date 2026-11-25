"""Browser smoke checks for the compiled Tailwind SOC Command Center.

Uses the existing in-repo React runtime, so this suite works without CDN access.
Run: python3 tests/e2e/dashboard_v3_test.py
"""
from pathlib import Path
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
html = (ROOT / 'web/index.html').read_text()
react = (ROOT / 'tests/e2e/vendor/react-bundle.js').read_text()
app = re.findall(r'<script(?: [^>]*)?>(.*?)</script>', html, re.S)[-1]
base = html[:html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/')]
count = 0
errors = []

def check(label, ok):
    global count
    assert ok, label
    count += 1
    print('PASS', label)

def page(browser, width, height):
    pg = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce')
    pg.set_default_timeout(5000)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.set_content(base, wait_until='domcontentloaded')
    pg.add_script_tag(content=react)
    pg.add_script_tag(content=app)
    pg.wait_for_selector('.soc-metric')
    return pg

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    desktop = page(browser,1536,960)
    check('dashboard mounted',desktop.get_by_role('heading',name='SOC Command Center').count()==1)
    check('sample banner explicitly labels demo',desktop.get_by_text('figures and incidents are examples').count()==1)
    check('five metric cards rendered',desktop.locator('.soc-metric').count()==5)
    check('severity chart total matches demo headline',desktop.locator('.soc-donut-hole strong').inner_text()=='3482')
    check('grouped navigation present',desktop.get_by_role('button',name='Threat hunt',exact=True).count()==1)
    desktop.get_by_role('button',name='High',exact=True).click()
    check('severity filter narrows threat events',desktop.locator('.soc-event').count()==2)
    desktop.get_by_role('button',name='View my workspace').click()
    check('local-only mode shows actual empty data',re.search(r'\b0\b',desktop.locator('.soc-metric').first.inner_text()) is not None)
    desktop.get_by_role('button',name='Threat hunt',exact=True).click()
    check('Hunt workflow opens',desktop.locator('main h1').inner_text().lower().startswith('hunt'))
    desktop.get_by_role('button',name='Dashboard',exact=True).click()
    desktop.get_by_role('button',name='Search cases, findings, playbooks and runs').click()
    check('global command search works',desktop.get_by_role('dialog').count()==1)
    desktop.keyboard.press('Escape')
    check('Escape dismisses search',desktop.get_by_role('dialog').count()==0)
    check('desktop has no horizontal overflow',desktop.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))
    desktop.close()

    mobile = page(browser,390,844)
    check('mobile quick navigation available',mobile.get_by_role('navigation',name='Quick navigation').count()==1)
    mobile.get_by_role('button',name='Open navigation').click()
    check('mobile drawer opens',mobile.locator('.soc-sidebar-open').count()==1)
    mobile.get_by_role('button',name='Close menu').click()
    check('mobile drawer closes',mobile.locator('.soc-sidebar-open').count()==0)
    check('390px mobile has no horizontal overflow',mobile.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))
    mobile.close()
    check('no uncaught JavaScript errors',not errors)
    browser.close()
print('TOTAL',count,'checks passed')
