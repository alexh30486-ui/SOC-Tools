from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
html=(ROOT/'web'/'preview-offline.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=80000)
 page.get_by_role('button',name='Threat intel').first.click(timeout=10000)
 assert page.get_by_test_id('intel-page').is_visible()
 page.get_by_test_id('intel-input').fill('src=203.0.113.45 hxxps://example[.]org/ticket CVE-2024-1111')
 page.get_by_test_id('intel-analyze').click()
 assert int(page.get_by_test_id('intel-count').inner_text())>=2
 page.get_by_test_id('intel-indicator').first.click()
 page.get_by_test_id('intel-add-evidence').click()
 assert page.get_by_test_id('intel-add-evidence').is_disabled()
 print('indicator promotion passed',flush=True)
 # screenshot optional
 page.get_by_role('tab',name='Threat scenarios').click()
 assert page.get_by_text('Detection scenario library').is_visible()
 page.get_by_role('button',name='Ransomware precursors').click()
 assert page.get_by_text('Shadow copies deleted',exact=True).is_visible()
 page.get_by_role('tab',name='Analyst method').click()
 assert page.get_by_text('Capture source').is_visible()
 print('scenario/method tabs passed',flush=True)
 page.get_by_role('button',name='Reports').first.click()
 assert page.get_by_test_id('report-audit').is_visible()
 print('report quality gate',page.get_by_test_id('report-audit').inner_text()[:80],flush=True)
 page.get_by_role('button',name='Help & guides').first.click()
 page.get_by_test_id('guide-page').wait_for(timeout=10000)
 page.get_by_role('button',name='Is this live monitoring?').click()
 assert page.get_by_text('No. The workspace analyzes logs',exact=False).is_visible()
 print('guide/faq passed',flush=True)
 print('overflow',page.evaluate('document.documentElement.scrollWidth > window.innerWidth'),'JS errors',errs,flush=True)
 assert not errs
 assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
 b.close()
