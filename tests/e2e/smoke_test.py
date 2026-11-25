import json, os, subprocess, sys, tempfile, time, urllib.request, shutil
from playwright.sync_api import sync_playwright
import pathlib, socket
HERE=pathlib.Path(__file__).resolve().parent; ROOT=str(HERE.parent.parent)
s_=socket.socket(); s_.bind(("127.0.0.1",0)); PORT=s_.getsockname()[1]; s_.close(); BASE=f"http://127.0.0.1:{PORT}"
shim=open(str(HERE/"vendor"/"react-bundle.js")).read(); tmp=tempfile.mkdtemp()
env=dict(os.environ,SPEC_SECRET="e2e-secret-with-more-than-thirty-two-chars",PORT=str(PORT),SPEC_DATABASE_URL=f"sqlite:///{tmp}/p.db",SPEC_STATIC_DIR=f"{ROOT}/web")
srv=subprocess.Popen([sys.executable,"-m","spec_api.server"],cwd=f"{ROOT}/api",env=env,stderr=subprocess.DEVNULL,stdout=subprocess.DEVNULL)
for _ in range(50):
    try: urllib.request.urlopen(BASE+"/v1/health",timeout=1);break
    except Exception: time.sleep(.1)
def route(r):
    u=r.request.url
    if "supabase.co" in u: return r.abort()
    if "react-dom.production" in u or "three.min" in u: return r.fulfill(status=200,content_type="application/javascript",body="")
    if "react.production" in u: return r.fulfill(status=200,content_type="application/javascript",body=shim)
    if "fonts.g" in u: return r.fulfill(status=200,content_type="text/css",body="")
    return r.continue_()
SHOTS=HERE/"shots"; SHOTS.mkdir(exist_ok=True)
res=[]; errs=[]; rows=[]
def ck(n,c,x=""):
    res.append(bool(c)); rows.append((n,bool(c),str(x)[:90])); print(("PASS " if c else "FAIL ")+n,str(x)[:90])
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which("chromium") or None, args=["--no-sandbox"] if shutil.which("chromium") else [])
    ctx=b.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce"); ctx.route("**/*",route)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append("console:"+m.text) if m.type=="error" and "supabase" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(BASE+"/"); pg.wait_for_selector("nav",state="attached"); pg.wait_for_timeout(400)
    N=lambda l: pg.click(f"nav.tl >> text={l}")
    import urllib.request as U, urllib.error, base64, zipfile, io
    def call(m,path,body=None,tok=None):
        rq=U.Request(BASE+path,method=m,data=json.dumps(body).encode() if body is not None else None,headers={"Content-Type":"application/json",**({"Authorization":"Bearer "+tok} if tok else {})})
        try:
            with U.urlopen(rq,timeout=5) as r: return r.status,json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e: return e.code,{}
    # ---- A. API (8)
    s,j=call("GET","/v1/health"); ck("A1 api health",s==200)
    s,j=call("GET","/v1/metrics"); ck("A2 metrics endpoint",s==200)
    s,j=call("POST","/v1/auth/signup",{"email":"smoke@example.com","password":"smoke-pass-12345","name":"Smoke"}); tok=j.get("token"); ck("A3 signup returns token",s in(200,201) and bool(tok),s)
    s,j=call("POST","/v1/auth/login",{"email":"smoke@example.com","password":"wrong-password-1"}); ck("A4 bad login rejected",s in(400,401,403),s)
    s,j=call("GET","/v1/me"); ck("A5 unauthenticated blocked",s==401,s)
    s,j=call("POST","/v1/projects",{"name":"Smoke case","kind":"soc-case"},tok); pid=j.get("id"); ck("A6 create project",bool(pid),s)
    s,j=call("PUT","/v1/projects/"+str(pid),{"doc":{"kind":"soc-case","x":1},"version":j.get("version",1)},tok); v=j.get("version"); ck("A7 save with version",s==200,s)
    s,j=call("PUT","/v1/projects/"+str(pid),{"doc":{"kind":"soc-case","x":2},"version":1},tok); ck("A8 stale version -> 409 conflict",s==409,s)
    s,j=call("GET","/v1/projects",tok=None) if False else call("GET","/v1/projects",None,tok); ck("A9 default (PRD) list never returns SOC rows",s==200 and all(p["id"]!=pid for p in j["projects"]),s)
    s,j=call("PUT","/v1/projects/"+str(pid),{"doc":{"x":3},"version":v},tok); ck("A10 SOC row rejects a document with the wrong kind",s==422,s)
    # ---- B. Boot + pages (12)
    pg.goto(BASE+"/"); pg.wait_for_selector("nav",state="attached"); pg.wait_for_timeout(400)
    ck("B1 title",pg.title().lower().startswith("spectacle soc"),pg.title())
    ck("B2 landmarks (main, nav, header)",pg.locator("main").count()==1 and pg.locator("nav").count()>=1 and pg.locator("header").count()>=1)
    for l in ["Home","Case","Triage","Hunt","Playbooks","Runs","Threats","Dash","Toolkit","Theme","FAQ"]:
        N(l); pg.wait_for_timeout(200); ck("B page renders: "+l,pg.locator("main h1, main h2").count()>=1 and len(pg.inner_text("main"))>80)
    # ---- C. Core workflow (12)
    N("Hunt"); pg.click("button:has-text('load sample events')"); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOTS/"demo1-hunt.png"),full_page=False)
    ck("C1 hunt finds 6 hit groups","6 hit group" in pg.inner_text("main"),pg.inner_text("main")[:120].replace("\n"," "))
    ck("C2 hits ranked critical first",pg.locator("main .hot").first.inner_text().find("Shadow")>=0)
    pg.locator("main .hot",has_text="Member added").locator("button:has-text('open as case')").click(); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SHOTS/"demo2-case.png"))
    ck("C3 hit became a case",pg.evaluate("JSON.parse(localStorage.getItem('soc1')).findings.length")==1)
    ck("C4 case maps to ATT&CK tactic",pg.evaluate("JSON.parse(localStorage.getItem('soc1')).findings[0].th")!="")
    N("Hunt"); pg.click("button:has-text('load sample events')"); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(300)
    pg.locator("main .hot",has_text="Encoded PowerShell").locator("button:has-text('start run')").click(); pg.wait_for_timeout(400)
    pg.screenshot(path=str(SHOTS/"demo3-run.png"))
    ck("C5 run started on pinned playbook version",pg.evaluate("(()=>{const r=JSON.parse(localStorage.getItem('soc-lib')).runs[0];return r&&r.v>=1&&r.steps.length>=3})()"))
    N("Case"); pg.wait_for_timeout(200)
    N("Dash"); pg.wait_for_timeout(300)
    rep=pg.evaluate("md({...JSON.parse(localStorage.getItem('soc1')),runs:JSON.parse(localStorage.getItem('soc-lib')).runs})")
    ck("C6 incident report built and copy button on Dash",pg.locator("button:has-text('copy incident report')").count()>=1 and rep.startswith("# Incident report") and "Member added" in rep,rep[:60])
    N("Triage"); pg.wait_for_timeout(200)
    pg.fill("textarea >> nth=0","beacon to hxxp://evil[.]example[.]com from 198.51.100.9 hash d41d8cd98f00b204e9800998ecf8427e")
    pg.click("button:has-text('extract indicators')"); pg.wait_for_timeout(300)
    ck("C7 triage extracts indicators","indicator" in pg.inner_text("main").lower())
    N("Dash"); pg.wait_for_timeout(300); ck("C8 dashboard shows data",pg.locator("main .kpi").count()>=2)
    N("Threats"); ck("C9 threats list",pg.locator("main .card").count()>=8)
    N("Playbooks"); pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click("button:has-text('export all')")
    z=zipfile.ZipFile(d.value.path()); ck("C10 export zip valid",z.testzip() is None and len(z.namelist())>=8,len(z.namelist()))
    ck("C11 all 4 seed playbooks pass the in-app lint",pg.evaluate("seedPbs().every(p=>lintPb(bumpVersion(p.body,2)+String.fromCharCode(10),p).every(c=>c.ok))"))
    pg.reload(); pg.wait_for_selector("nav",state="attached"); pg.wait_for_timeout(300)
    ck("C12 state survives reload",pg.evaluate("JSON.parse(localStorage.getItem('soc1')).findings.length")==1 and pg.evaluate("JSON.parse(localStorage.getItem('soc-lib')).runs.length")>=1)
    # ---- D. Hardening / stability (8)
    xss='{"timestamp":"2026-11-22T01:00:00Z","agent":{"name":"<img src=x onerror=window.__x=1>"},"rule":{"id":"1","level":12,"description":"<script>window.__x=1</script> boom"}}'
    N("Hunt"); pg.fill("textarea[aria-label='events']",xss); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(300)
    ck("D1 hostile event text is not executed",pg.evaluate("window.__x")is None and "<script>" in pg.inner_text("main"))
    big="\n".join(json.dumps({"timestamp":"2026-11-22T00:00:%02dZ"%(i%60),"agent":{"name":"h%d"%(i%50)},"data":{"win":{"system":{"eventID":"4688"},"eventdata":{"commandLine":"notepad %d"%i,"image":"C:\\\\x\\\\notepad.exe"}}}}) for i in range(20000))
    t0=time.time(); r=pg.evaluate("async(t)=>{const a=performance.now();const pe=await parseEvents(t);const h=await runHunt(pe.evs,[]);return [pe.evs.length,h.hits.length,performance.now()-a]}",big)
    ck("D2 20,000 events hunted in under 5s",r[0]==20000 and r[2]<5000,"%d ms"%r[2])
    ck("D3 over-limit input capped",pg.evaluate("async(t)=>(await parseEvents(t+String.fromCharCode(10)+t)).evs.length<=20000",big))
    ck("D4 garbage input gives a message not a crash",pg.evaluate("parseEvents('<<<>>>').then(x=>x.err.length>0)"))
    ck("D5 rule with unknown modifier is reported, not skipped",pg.evaluate("runHunt([mkEv({a:1})],[sigmaPrep(yamlLite('title: x\\ndetection:\\n  s:\\n    a|zz: 1\\n  condition: s'))]).then(x=>x.errors.length)")==1)
    pg.evaluate("localStorage.setItem('soc1','{{{not json');localStorage.setItem('soc-lib','[1,2')"); pg.reload(); pg.wait_for_selector("nav",state="attached"); pg.wait_for_timeout(300)
    ck("D6 corrupt localStorage -> app still boots",pg.locator("nav").count()>=1 and pg.locator("main").count()==1)
    ck("D7 playbooks re-seeded after corruption",pg.evaluate("JSON.parse(localStorage.getItem('soc-lib')).pbs.length")>=4)
    N("Playbooks"); pg.click("button:has-text('propose change')") if pg.locator("button:has-text('propose change')").count() else None
    ck("D8 no page errors during whole run",not errs,errs[:3])
    # ---- E. Mobile (3)
    c2=b.new_context(viewport={"width":390,"height":800},reduced_motion="reduce",has_touch=True,is_mobile=True); c2.route("**/*",route)
    m=c2.new_page(); m.on("pageerror",lambda e:errs.append("m:"+str(e))); m.goto(BASE+"/"); m.wait_for_selector("nav",state="attached"); m.wait_for_timeout(400)
    bad=[]
    for l in ["Home","Case","Triage","Hunt","Playbooks","Runs","Dash"]:
        m.click(f"nav.bot >> text={l}"); m.wait_for_timeout(200)
        if m.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")>1: bad.append(l)
    ck("E1 390px: no horizontal overflow on 7 pages",not bad,bad)
    m.click("nav.bot >> text=Hunt"); m.click("button:has-text('load sample events')"); m.click("button:has-text('run hunt')"); m.wait_for_timeout(300)
    m.screenshot(path=str(SHOTS/"demo4-mobile.png"))
    ck("E2 mobile hunt works",m.locator("main .hot").count()>=5)
    ck("E3 no mobile page errors",not [e for e in errs if e.startswith("m:")])
    print("TOTAL",sum(res),"of",len(res))
    json.dump(rows,open(str(HERE/"smoke-results.json"),"w"))
    b.close()
srv.terminate()
MIN=44
failed=[r[0] for r in rows if not r[1]]
print("FAILED:",failed) if failed else None
sys.exit(0 if (not failed and len(rows)>=MIN) else 1)
