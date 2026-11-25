"""Compile src/app.tsx and assemble index.html (head.html + CDN scripts + compiled app)."""
import subprocess, re, pathlib, sys, tempfile
root = pathlib.Path(__file__).resolve().parent
out_name = sys.argv[1] if len(sys.argv) > 1 else "index.html"
with tempfile.TemporaryDirectory() as t:
    js_path = pathlib.Path(t) / "app.js"
    subprocess.run(["node", str(root / "src/compile.js"), str(js_path)], check=True)
    js = js_path.read_text(encoding="utf-8")
js = re.sub(r"</(script)", r"<\\/\1", js, flags=re.I)
head = (root / "src/head.html").read_text(encoding="utf-8")
tailwind_css = (root / "src/tailwind.output.css").read_text(encoding="utf-8") if (root / "src/tailwind.output.css").exists() else ""
soc_css = (root / "src/soc-dashboard.css").read_text(encoding="utf-8")
head = head.replace("</style></head>", "</style><style>" + tailwind_css + "\n" + soc_css + "</style></head>")
tail = '''<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>window.addEventListener('error',function(e){var r=document.getElementById('root');if(r)r.innerHTML='<p style="padding:24px">Spectacle could not start: '+String(e.message).replace(/</g,'&lt;')+'. Reload the page to retry.</p>'});</script>
<script>
''' + js + '''
</script>
</body></html>
'''
(root / out_name).write_text(head + tail, encoding="utf-8")
print("built", out_name, len(head + tail))
