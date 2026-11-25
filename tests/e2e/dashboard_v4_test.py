"""Browser regression for backend workbench with deterministic fetch fixtures.
Browser sandbox blocks localhost; real HTTP is tested separately with http.client.
"""
from pathlib import Path
import json
import re
import shutil
import sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'api'))
from spec_api.soc_pipeline import sample_report
html=(ROOT/'web/index.html').read_text()
react=(ROOT/'tests/e2e/vendor/react-bundle.js').read_text()
app=re.findall(r'<script(?: [^>]*)?>(.*?)</script>',html,re.S)[-1]
base=html[:html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/')]
fixture=sample_report()
mock="""window.fetch=(u,o={})=>Promise.resolve({ok:true,status:200,json:async()=>{const path=String(u);if(path.includes('/v1/soc/demo'))return {mode:'synthetic_fixture',report:MOCK_SOC};if(path.includes('/v1/soc/status'))return {storage:'local',queue:'inline',live_siem:false};return {error:'no fixture'}}});"""
failures=[];checks=0

def check(name,ok):
 global checks
 assert ok,name
 checks+=1
 print('PASS',name)

def page_for(browser,width,height):
 pg=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
 pg.set_default_timeout(5500)
 pg.on('pageerror',lambda x:failures.append(str(x)))
 pg.set_content(base,wait_until='domcontentloaded')
 pg.add_script_tag(content='const MOCK_SOC='+json.dumps(fixture)+';'+mock)
 pg.add_script_tag(content=react)
 pg.add_script_tag(content=app)
 pg.wait_for_selector('.soc-pipeline-finding')
 return pg

with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 desktop=page_for(b,1536,960)
 check('backend panel visible',desktop.get_by_text('Log analysis pipeline').count()==1)
 check('sample fixture displayed',desktop.locator('.soc-pipeline-finding').count()==5)
 check('fixture has 21 events',desktop.locator('.soc-metric').first.inner_text().find('21')!=-1)
 check('backend mode explicitly local',desktop.get_by_text('Local SQLite').count()==1)
 check('inline queue mode displayed',desktop.get_by_text('Inline processing').count()==1)
 check('high confidence score shown',desktop.locator('.soc-pipeline-finding').first.get_by_text('96/100').count()==1)
 desktop.get_by_role('button',name='Run Kyle test fixture').click()
 check('upload requires authentication',desktop.get_by_text('Sign in to your workspace before saving').count()==1)
 check('sample feed filters',desktop.get_by_role('button',name='High',exact=True).count()==1)
 desktop.get_by_role('button',name='High',exact=True).click()
 check('filter yields four high findings',desktop.locator('.soc-event').count()==4)
 check('desktop width no overflow',desktop.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
 desktop.screenshot(path=str(ROOT.parent/'spectacle-soc-v4-desktop.png'),full_page=True)
 desktop.close()
 mobile=page_for(b,390,844)
 check('mobile backend panel visible',mobile.get_by_text('Log analysis pipeline').count()==1)
 check('mobile file upload visible',mobile.get_by_text('Upload a log file').count()==1)
 check('mobile menu opens', (mobile.get_by_role('button',name='Open navigation').click() or True) and mobile.locator('.soc-sidebar-open').count()==1)
 check('mobile width no overflow',mobile.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
 mobile.get_by_role('button',name='Close menu').click()
 mobile.screenshot(path=str(ROOT.parent/'spectacle-soc-v4-mobile.png'),full_page=True)
 mobile.close()
 check('no JS runtime exceptions',not failures)
 b.close()
print('TOTAL',checks)
