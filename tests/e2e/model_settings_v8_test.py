"""Browser check: Gemma research is inside the normal workspace Settings UI.

Offline preview is injected with set_content because CI/browser policies may block file:/localhost.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/'web'/'preview-offline.html').read_text(encoding='utf8')
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=b.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML,wait_until='domcontentloaded',timeout=30000)
    page.get_by_role('button',name='Models & adapters').click(timeout=10000)
    assert page.get_by_test_id('model-settings').is_visible()
    content=page.get_by_test_id('model-settings').inner_text()
    assert all(x in content for x in ('1,670','56,702','18/85','Gemma serving not connected'))
    page.get_by_role('tab',name='Performance').click()
    assert page.get_by_text('143.84s').is_visible()
    page.get_by_role('button',name='12B model').click()
    assert page.get_by_text('253.04s').is_visible()
    page.get_by_role('tab',name='Integrity & sources').click()
    page.get_by_role('button',name='Missing').click()
    assert page.get_by_text('Not supplied').count()==67
    page.get_by_role('button',name='Verified').click()
    assert page.get_by_text('SHA-256 ✓').count()==18
    entry=page.locator('input[data-testid="model-upload"]')
    entry.set_input_files(str(ROOT/'research/gemma4/references/served_prompt_checks.csv'))
    page.get_by_text('MATCH',exact=True).wait_for(timeout=7000)
    entry.set_input_files({'name':'served_prompt_checks.csv','mimeType':'text/csv','buffer':b'corrupt\n'})
    page.get_by_text('MISMATCH',exact=True).wait_for(timeout=7000)
    print('Desktop: real timing values, inventory, matching and tampered-file rejection PASS',flush=True)
    page.get_by_role('tab',name='Runtime settings').click()
    page.get_by_label('Preferred evaluation model').select_option('12B')
    page.get_by_role('button',name='Save local preferences').click()
    assert 'no inference runtime changed' in page.locator('.soc-ml-controls').inner_text() or 'session only' in page.locator('.soc-ml-controls').inner_text()
    page.get_by_role('tab',name='Overview').click()
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth>window.innerWidth')
    assert not errors,errors
    print('Mobile: 390px layout, local preference controls and no JS errors PASS',flush=True)
    b.close()
