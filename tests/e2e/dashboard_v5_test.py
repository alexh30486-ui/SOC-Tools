"""v5 independent browser smoke: fully embedded preview, no backend credentials."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/'web/preview-offline.html').read_text(encoding='utf8')
checks=0
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-web-security'])
    for width,height in [(1440,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
        page.set_default_timeout(8000)
        errors=[]
        page.on('pageerror', lambda exc:errors.append(str(exc)))
        page.set_content(HTML, wait_until='domcontentloaded', timeout=60000)
        page.locator('.soc-review-finding').first.wait_for()
        assert page.locator('.soc-review-finding').count()==5;checks+=1
        assert page.get_by_text('Read-only synthetic example').is_visible();checks+=1
        assert page.locator('.soc-review-detail').get_by_text('Why this was flagged').is_visible();checks+=1
        assert page.locator('#soc-review-status').is_disabled();checks+=1
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth');checks+=1
        page.get_by_role('button',name='Matched source events (4)').click()
        assert page.locator('.soc-review-event').count()==4;checks+=1
        page.locator('.soc-review-finding').nth(1).click()
        assert page.locator('.soc-review-selected').count()==1;checks+=1
        assert page.get_by_role('button',name='Matched source events (2)').count()==1;checks+=1
        assert not errors,errors;checks+=1
        print('PASS',width,'px, 9 checks')
        page.close()
    browser.close()
print('Total checks:',checks)
