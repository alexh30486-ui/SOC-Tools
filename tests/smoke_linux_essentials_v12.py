#!/usr/bin/env python3
"""Interactive browser regression for boot-loaded Linux Essentials.
Uses only synthetic fixtures. No shell command is executed by the UI test.
"""
import json, re
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_frontend_v11 import load
ROOT = Path(__file__).resolve().parents[1]
REPORT=ROOT/'release/LINUX_ESSENTIALS_UI_V12.json'
ITEMS='systemctl journalctl dmesg ss ip ping tcpdump df du lsblk mount fdisk free vmstat lsof uptime useradd usermod passwd chage crontab rsync ssh scp ufw'.split()
checks=[]
def check(name,condition):
 try:
  ok=bool(condition())
  checks.append({'name':name,'status':'PASS' if ok else 'FAIL'})
  print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 except Exception as e:
  checks.append({'name':name,'status':'FAIL','error':str(e)[:500]})
  print('FAIL '+name+': '+str(e),flush=True)

def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  load(page)
  page.get_by_role('button',name='Network terminal').first.click()
  net=page.get_by_test_id('network-diagnostics');lib=page.get_by_test_id('linux-essentials-library')
  check('Linux command library exists',lambda: lib.count()==1)
  check('Boot log contains 25 loaded',lambda:'25 essential commands registered' in page.get_by_test_id('linux-boot-log').inner_text())
  check('All 25 names in boot transcript',lambda:all(n in page.get_by_test_id('linux-boot-log').inner_text() for n in ITEMS))
  check('All 25 command cards',lambda: all(page.get_by_test_id('linux-command-'+n).count()==1 for n in ITEMS))
  check('No auto-execution on boot',lambda:'0 records' in net.inner_text())
  check('Explicit synthetic mode',lambda:'SIMULATED DATA' in net.inner_text())
  check('AI triage transparently rule based',lambda:'NO MODEL CONNECTED' in page.get_by_test_id('linux-triage-advice').inner_text())
  check('By default show a network scenario',lambda:'Network unreachable' in page.get_by_test_id('linux-triage-advice').inner_text())
  page.get_by_label('Investigation scenario').select_option('identity')
  check('Identity scenario provides log + sockets',lambda: all(x in page.get_by_test_id('linux-triage-advice').inner_text() for x in ['journalctl','ss','lsof']))
  page.get_by_label('Investigation scenario').select_option('vulnerability')
  check('Vulnerability scenario avoids exploiting claims',lambda:'Do not infer exploitation from reachability' in page.get_by_test_id('linux-triage-advice').inner_text())
  page.get_by_label('Search Linux commands').fill('disk')
  check('Search narrows commands',lambda:page.get_by_test_id('linux-command-lsblk').count()==1 and page.get_by_test_id('linux-command-ping').count()==0)
  page.get_by_label('Search Linux commands').fill('')
  page.get_by_role('button',name='Storage',exact=True).click()
  check('Storage category filters',lambda:page.get_by_test_id('linux-command-df').count()==1 and page.get_by_test_id('linux-command-ss').count()==0)
  page.get_by_role('button',name='All',exact=True).click()
  page.get_by_label('Stage df command').click()
  check('Stage read-only command',lambda:page.get_by_label('Network diagnostic command').input_value()=='df -h')
  page.get_by_role('button',name='Run command').click()
  check('Synthetic df sample',lambda:'[SAMPLE]' in net.inner_text() and 'SYNTHETIC LINUX FIXTURE' in net.inner_text())
  check('No real host claim for demo',lambda:'SIMULATED' in net.inner_text())
  page.get_by_label('Stage useradd command').click()
  check('Useradd marked reference only',lambda:'Reference only' in page.locator('.soc-net-linux-notice').inner_text())
  page.get_by_role('button',name='Run command').click()
  check('Account creation blocked',lambda:'reference-only' in page.get_by_role('alert').inner_text())
  page.get_by_label('Stage tcpdump command').click()
  page.get_by_role('button',name='Run command').click()
  check('Packet sniffing blocked',lambda:'reference-only' in page.get_by_role('alert').inner_text())
  page.get_by_label('Network diagnostic command').fill('df -h; rm -rf /')
  page.get_by_role('button',name='Run command').click()
  check('Shell chaining rejected',lambda:'Unlisted shell commands are blocked' in page.get_by_role('alert').inner_text())
  page.get_by_role('button',name='Collapse library').click()
  check('Catalog collapses',lambda:page.get_by_test_id('linux-command-df').count()==0)
  page.get_by_role('button',name='Browse 25 commands').click()
  check('Catalog expands',lambda:page.get_by_test_id('linux-command-df').count()==1)
  page.get_by_role('button',name='UDP datagram').click()
  check('UDP silence remains inconclusive',lambda:'UDP state inconclusive' in page.get_by_test_id('network-verification').inner_text())
  check('Desktop has no horizontal overflow',lambda:page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
  check('No desktop JavaScript errors',lambda:len(errors)==0)
  page.get_by_test_id('linux-essentials-library').scroll_into_view_if_needed()
  page.screenshot(path=str(ROOT/'release/linux-essentials-desktop-v12.png'),animations='disabled',full_page=True,timeout=30000)
  mobctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  mob=mobctx.new_page();merrors=[];mob.on('pageerror',lambda e:merrors.append(str(e)))
  load(mob)
  mob.get_by_role('button',name='Open navigation').click()
  mob.get_by_role('button',name='Network terminal').first.click()
  check('Mobile command catalog is accessible',lambda:mob.get_by_test_id('linux-command-ufw').count()==1)
  check('Mobile has no horizontal overflow',lambda:mob.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
  check('No mobile JavaScript errors',lambda:len(merrors)==0)
  mob.get_by_test_id('linux-essentials-library').scroll_into_view_if_needed()
  mob.screenshot(path=str(ROOT/'release/linux-essentials-mobile-v12.png'),animations='disabled',full_page=True,timeout=30000)
  mobctx.close();context.close();browser.close()
 data={'suite':'linux_essentials_v12','passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']=='FAIL' for x in checks),'checks':checks,'evidence':'Chromium offline demo only; no live Linux command execution or LoRA inference.'}
 REPORT.write_text(json.dumps(data,indent=2)+'\n')
 print('SUMMARY',data['passed'],data['failed'],flush=True)
 return 0 if not data['failed'] else 1
if __name__=='__main__':raise SystemExit(main())
