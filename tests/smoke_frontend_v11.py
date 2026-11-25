#!/usr/bin/env python3
"""Twenty end-to-end browser UI acceptance checks using packaged offline preview.
This is a real Chromium render, but all telemetry in offline mode is synthetic.
Never uses the network to contact external hosts.
"""
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PREVIEW=ROOT/'web/preview-offline.html'
REPORT=ROOT/'release/FRONTEND_SMOKE_20.json'

def load(page):
    content=PREVIEW.read_text(encoding='utf8')
    matches=list(re.finditer(r'<script(?:[^>]*)>([\s\S]*?)</script>',content))
    scripts=[m.group(1) for m in matches]
    for m in reversed(matches): content=content[:m.start()]+content[m.end():]
    page.set_content(content,wait_until='domcontentloaded',timeout=20000)
    for s in scripts: page.add_script_tag(content=s)
    page.get_by_role('button',name='Network terminal').first.wait_for(timeout=10000)

def main():
    outcomes=[]
    def check(label, test):
        try:
            assert bool(test()), label
            outcomes.append({'name':label,'status':'PASS'})
            print(f'PASS {len(outcomes):02d} {label}',flush=True)
        except Exception as exc:
            outcomes.append({'name':label,'status':'FAIL','reason':str(exc)[:260]})
            print(f'FAIL {len(outcomes):02d} {label}: {exc}',flush=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-features=Translate'])
        context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        load(page)
        check('App root rendered',lambda: page.locator('#root').count()==1 and len(page.locator('body').inner_text())>150)
        check('Dashboard heading visible',lambda: 'Command Center' in page.locator('body').inner_text())
        check('Accessible navigation present',lambda: page.get_by_role('button',name='Network terminal').count()>=1)
        page.get_by_role('button',name='Network terminal').first.click()
        check('Navigation opens network terminal',lambda: page.get_by_test_id('network-diagnostics').count()==1)
        check('Default mode clearly synthetic',lambda: 'SIMULATED DATA' in page.get_by_test_id('network-diagnostics').inner_text())
        check('ICMP, TCP, UDP distinctions visible',lambda: all(x in page.get_by_test_id('network-diagnostics').inner_text() for x in ['Echo request','Handshake','Datagram']))
        check('Four command presets visible',lambda: all(page.get_by_role('button',name=re.compile(s)).count() for s in ['ICMP echo','DNS resolution','TCP connection','UDP datagram']))
        page.get_by_role('button',name=re.compile('UDP datagram')).click()
        check('UDP demo reports inconclusive',lambda: '[INCONCLUSIVE]' in page.get_by_test_id('network-diagnostics').inner_text())
        check('UDP conclusion remains unverified',lambda: 'UDP state inconclusive' in page.get_by_test_id('network-verification').inner_text())
        page.get_by_role('button',name=re.compile('ICMP echo')).click()
        check('ICMP demo records synthetic reply',lambda: '[REPLY]' in page.get_by_test_id('network-diagnostics').inner_text() and 'SIMULATED' in page.get_by_test_id('network-diagnostics').inner_text())
        page.get_by_label('AI claim to verify').select_option('reachable')
        check('Claim checker supports matching simulated reply',lambda: 'Supported by demo only' in page.get_by_test_id('network-verification').inner_text())
        page.get_by_label('AI claim to verify').select_option('security_compromise')
        check('Claim checker refuses compromise inference',lambda: 'Not established' in page.get_by_test_id('network-verification').inner_text())
        page.get_by_label('Network diagnostic command').fill('whoami')
        page.get_by_role('button',name='Run command').click()
        check('Arbitrary shell commands blocked in demo',lambda: 'Demo supports only the four example commands' in page.get_by_role('alert').inner_text())
        page.get_by_role('button',name='Live server probes').click()
        check('Live capability disabled without backend',lambda: 'SERVER DISABLED' in page.get_by_test_id('network-diagnostics').inner_text())
        page.get_by_role('button',name='Run command').click()
        check('Unauthenticated live probes refused',lambda: 'Sign in before running server-side network diagnostics' in page.get_by_role('alert').inner_text())
        page.get_by_role('button',name='Synthetic demo').click()
        with page.expect_download(timeout=10000) as d:
            page.get_by_role('button',name='Export evidence receipt').click()
        download=d.value
        check('Evidence JSON exports through browser',lambda: download.suggested_filename=='spectacle-network-diagnostics.json')
        page.screenshot(path=str(ROOT/'release/network-terminal-desktop.png'),animations='disabled',timeout=15000)
        page.get_by_role('button',name='Playbooks').first.click()
        check('Playbook section reachable',lambda: 'Playbook' in page.locator('main').inner_text() and page.locator('main').is_visible())
        page.get_by_role('button',name='Models & adapters').first.click()
        check('Gemma/LoRA Settings section reachable',lambda: 'Models & LoRA adapters' in page.locator('main').inner_text())
        page.get_by_role('tab',name='Agent safety gate').click()
        check('Settings shows NO-GO adaptation evidence',lambda: page.get_by_test_id('adapter-verdict').inner_text().strip()=='NO-GO')
        page.screenshot(path=str(ROOT/'release/model-safety-gate-desktop.png'),animations='disabled',timeout=15000)
        mobile=context.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        mob=mobile.new_page(); merrors=[]; mob.on('pageerror',lambda e:merrors.append(str(e)))
        load(mob)
        mob.get_by_role('button',name='Open navigation').click()
        mob.get_by_role('button',name='Network terminal').first.click()
        # Wait one small frame for layout to settle; assert no horizontal scroll.
        mob.wait_for_timeout(150)
        check('Mobile drawer navigates with no overflow or runtime errors',lambda: mob.get_by_test_id('network-diagnostics').count()==1 and mob.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1') and not errors and not merrors)
        mob.screenshot(path=str(ROOT/'release/network-terminal-mobile.png'),animations='disabled',timeout=15000)
        mobile.close();context.close();browser.close()
    REPORT.parent.mkdir(exist_ok=True,parents=True)
    result={'suite':'frontend_browser_v11','expected':20,'passed':sum(r['status']=='PASS' for r in outcomes),'failed':sum(r['status']=='FAIL' for r in outcomes),'mode':'Chromium with bundled offline preview, synthetic logs (not live network)', 'checks':outcomes}
    REPORT.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'passed':result['passed'],'failed':result['failed']},indent=2))
    return 0 if result['passed']==20 else 1
if __name__=='__main__':sys.exit(main())
