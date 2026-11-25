"""Standalone render/interaction check for the v9 model guardrail screen."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/'web'/'preview-offline.html').read_text(encoding='utf-8')
OUT=Path('/mnt/data')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    # Split HTML/scripts to avoid a chromium set_content waiting bug with the bundled 730KB page.
    matches=list(re.finditer(r'<script(?:[^>]*)>([\s\S]*?)</script>',HTML))
    markup=HTML
    scripts=[m.group(1) for m in matches]
    for m in reversed(matches): markup=markup[:m.start()]+markup[m.end():]
    page.set_content(markup,wait_until='domcontentloaded',timeout=10000)
    for script in scripts: page.add_script_tag(content=script)
    page.get_by_role('button',name='Models & adapters').first.click(timeout=8000)
    lab=page.get_by_test_id('model-settings')
    assert lab.is_visible(), 'Model page not visible'
    assert '30/85' in lab.inner_text(), 'New verified files were not included'
    page.get_by_role('tab',name='Agent safety gate').click(timeout=8000)
    gate=page.get_by_test_id('agent-safety-gate')
    assert gate.is_visible(), 'Safety gate missing'
    data=gate.inner_text()
    for text in ('28','80','8 min','9','NO-GO','4','2','BLOCK','SHA-256'):
        assert text in data,(text,data[:2000])
    assert page.get_by_test_id('adapter-verdict').inner_text()=='NO-GO'
    page.screenshot(path=str(OUT/'spectacle-soc-v9-agent-desktop.png'),full_page=True)
    page.get_by_role('tab',name='Integrity & sources').click(timeout=8000)
    page.get_by_role('button',name='Verified').click(timeout=8000)
    assert page.get_by_text('SHA-256 ✓').count()==30
    page.get_by_role('button',name='Missing').click(timeout=8000)
    assert page.get_by_text('Not supplied').count()==55
    page.get_by_role('tab',name='Agent safety gate').click(timeout=8000)
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth>window.innerWidth'),'mobile horizontal overflow'
    assert page.get_by_test_id('agent-safety-gate').is_visible()
    page.screenshot(path=str(OUT/'spectacle-soc-v9-agent-mobile.png'),full_page=True)
    assert not errors,errors
    print('PASS: desktop render, 30/85 inventory, NO-GO gate, agent limits, 390px mobile, no runtime JS errors',flush=True)
    browser.close()
