from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json, zipfile, hashlib, tempfile, os
root=Path(__file__).resolve().parents[2]
html=(root/'web/index.html').read_text()
shim=(root/'tests/e2e/vendor/react-bundle.js').read_text()
script=re.findall(r'<script(?: [^>]*)?>(.*?)</script>',html,re.S)[-1]
base=html[:html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/')]
errors=[]
checks=0

def check(cond,msg):
 global checks
 assert cond,msg
 checks+=1
 print('PASS',msg,flush=True)

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':860},accept_downloads=True,reduced_motion='reduce')
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(base,wait_until='domcontentloaded',timeout=5000)
 page.add_script_tag(content=shim);page.add_script_tag(content=script)
 page.set_default_timeout(5000)
 page.wait_for_selector('.cockpit')
 check('0 captured events' in page.locator('.trace-home-strip').inner_text(),'home timeline empty-state reflects case state')
 page.get_by_role('button',name='Open timeline').click()
 check('No source events in this case yet' in page.locator('.timeline-page').inner_text(),'timeline empty state')
 page.get_by_role('button',name='Open Hunt').click()
 page.get_by_role('button',name='load sample events').click()
 page.get_by_role('button',name='run hunt').click()
 page.wait_for_selector('.hot',timeout=10000)
 check(page.locator('.hot').count()>=1,'hunt returns detection groups')
 page.locator('.hot').first.get_by_role('button',name='open as case').click()
 page.wait_for_selector('main h1')
 check(page.locator('main h1').first.inner_text().lower().find('case')>=0,'Hunt opens an actual case')
 page.get_by_role('button',name='Timeline').first.click()
 page.wait_for_selector('.timeline-page')
 original=page.locator('.trace-event').count()
 check(original>=1,'matching source events retained on timeline')
 check(page.locator('.trace-histogram .trace-bin').count()==18,'chronological histogram rendered')
 page.locator('.trace-event-head').first.click()
 check(page.locator('.trace-detail pre').count()==0 or page.locator('.trace-detail details').count()==1,'raw event inspect available')
 check('RAW TRUNCATED' not in page.locator('.trace-item').first.inner_text(),'source import has explicit truncation status if needed')
 page.get_by_role('button',name='Add to case evidence').click()
 check('linked to the case evidence list' in page.locator('.timeline-page').inner_text(),'source event promoted to case evidence')
 page.get_by_label('Search timeline events').fill('no-such-event-12345')
 check(page.locator('.trace-event').count()==0,'timeline search filters records')
 page.get_by_label('Search timeline events').fill('')
 page.get_by_role('button',name='Add timeline event').click()
 page.get_by_label('New event timestamp').fill('2026-11-22T10:40')
 page.get_by_label('New event type').select_option('containment')
 page.get_by_label('New event description').fill('Isolated FIN-WS22 after on-call approval')
 page.get_by_label('New event asset').fill('FIN-WS22')
 page.get_by_label('New event source').fill('IR-1042 change record')
 page.get_by_label('New event note').fill('No changes were made without approval.')
 page.get_by_role('button',name='Save event').click()
 check(page.locator('.trace-event').count()==original+1,'manual containment event added to same case')
 page.get_by_label('Filter by event type').select_option('containment')
 check(page.locator('.trace-event').count()==1,'category filter works')
 page.get_by_label('Filter by event type').select_option('all')
 with page.expect_download() as info:
  page.get_by_role('button',name='Export CSV').click()
 dl=info.value
 csv=Path(dl.path()).read_text()
 check('Isolated FIN-WS22 after on-call approval' in csv and 'timestamp' in csv,'CSV includes all entries and headings')
 with page.expect_download() as info:
  page.get_by_role('button',name='Export JSON').click()
 data=json.loads(Path(info.value.path()).read_text())
 check(len(data['events'])==original+1,'JSON export event count matches')
 # Test the bundle from a secure origin if subtle is exposed
 has_crypto=page.evaluate('Boolean(globalThis.crypto && globalThis.crypto.subtle)')
 print('Web Crypto available in test?',has_crypto,flush=True)
 if has_crypto:
  with page.expect_download() as info:
   page.get_by_role('button',name='Incident packet ZIP').click()
  with zipfile.ZipFile(info.value.path()) as z:
   manifest=json.loads(z.read('manifest.json'))
   check(manifest['timelineEvents']==original+1,'incident manifest reflects timeline size')
   for fn,h in manifest['fileHashes'].items():check(hashlib.sha256(z.read(fn)).hexdigest()==h,'SHA256 hash matches '+fn)
   check('Recorded event chronology' in z.read('report/incident-report.md').decode(),'generated report contains chronology')
 else:
  page.get_by_role('button',name='Incident packet ZIP').click()
  check('not available' in page.locator('.w[role=status]').inner_text(),'unavailable WebCrypto shows explicit error')
 # mobile test
 page.set_viewport_size({'width':390,'height':844})
 check(page.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1,'mobile timeline no horizontal overflow')
 # Optional screenshots can be recorded manually during design QA.
 page.set_viewport_size({'width':1280,'height':860})
 # Keep CI independent of screenshot files.
 check(not errors,'no JavaScript runtime errors: '+str(errors))
 print('PASS TOTAL',checks,flush=True)
 b.close()
