#!/usr/bin/env python3
"""Refresh the last bundled app script and styling in the existing standalone preview.

The previous release already bundles React and an offline API shim. Reuse those, but rebuild
app code, rather than shipping a stale v6 preview. Does not access a network.
"""
from pathlib import Path
import re
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
preview=WEB/'preview-offline.html'
text=preview.read_text(encoding='utf8')
with tempfile.TemporaryDirectory() as td:
    js=Path(td)/'app.js'
    subprocess.run(['node',str(WEB/'src/compile.js'),str(js)],check=True)
    script=js.read_text(encoding='utf8').replace('</script','<\\/script')
styles=(WEB/'src/tailwind.output.css').read_text(encoding='utf8')+'\n'+(WEB/'src/soc-dashboard.css').read_text(encoding='utf8')
style_tags=list(re.finditer(r'<style(?:[^>]*)>[\s\S]*?</style>',text))
if len(style_tags)!=2:raise SystemExit(f'Unexpected stylesheet layout: {len(style_tags)} tags')
m=style_tags[1]
text=text[:m.start()]+'<style>'+styles+'</style>'+text[m.end():]
script_tags=list(re.finditer(r'<script(?:[^>]*)>[\s\S]*?</script>',text))
if len(script_tags)!=3:raise SystemExit(f'Unexpected script layout: {len(script_tags)} tags')
m=script_tags[2]
text=text[:m.start()]+'<script>\n'+script+'\n</script>'+text[m.end():]
preview.write_text(text,encoding='utf8')
print('rebuilt offline preview',len(text),'characters')
