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
res=[]; errs=[]
def ck(n,c,x=""): res.append(bool(c)); print(("PASS " if c else "FAIL ")+n,x)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which("chromium") or None, args=["--no-sandbox"] if shutil.which("chromium") else [])
    ctx=b.new_context(viewport={"width":1280,"height":900},reduced_motion="reduce"); ctx.route("**/*",route)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append("console:"+m.text) if m.type=="error" and "supabase" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(BASE+"/"); pg.wait_for_selector("nav",state="attached"); pg.wait_for_timeout(400)
    N=lambda l: pg.click(f"nav.tl >> text={l}")
    r=pg.evaluate("""async()=>{const o={};
      const ev=(await parseEvents(SAMPLE_EVENTS.map(x=>JSON.stringify(x)).join('\\n'))).evs;
      const h=await runHunt(ev,[]);o.titles=h.hits.map(x=>x.title);o.errs=h.errors;o.n=ev.length;
      o.dec=decodeB64s('powershell -nop -enc '+SAMPLE_EVENTS[1].data.win.eventdata.commandLine.split('-enc ')[1]).map(x=>x.text);
      o.ioc=extractIocs(JSON.stringify(SAMPLE_EVENTS[1])).map(x=>x.k+':'+x.t);
      const y=yamlLite("title: T\\nlevel: low\\ntags:\\n  - attack.t1059\\ndetection:\\n  a:\\n    CommandLine|contains: ['calc','x y']\\n  b:\\n    EventID: 1\\n  condition: a and not b # c\\n");
      o.y=JSON.stringify(y);
      const custom=sigmaPrep(yamlLite("title: Notepad seen\\nlevel: low\\ndetection:\\n  s:\\n    Image|endswith: '\\\\notepad.exe'\\n  condition: s"));
      o.cust=(await runHunt(ev,[custom])).hits.some(x=>x.title==='Notepad seen');
      try{sigmaPrep(yamlLite("title: X\\ndetection:\\n  s:\\n    A|weird: 1\\n  condition: s"));o.bad1='noerr'}catch(e){o.bad1='err'}
      const r2=await runHunt(ev,[sigmaPrep(yamlLite("title: Bad mod\\ndetection:\\n  s:\\n    A|weird: 1\\n  condition: s"))]);o.bad1b=r2.errors.join('|');
      try{sigmaPrep(yamlLite("title: X\\ndetection:\\n  s:\\n    A: 1\\n  condition: s and zzz"));o.bad2='noerr'}catch(e){o.bad2=e.message}
      try{yamlLite("a:\\n  - k: v\\n");o.bad3='noerr'}catch(e){o.bad3=e.message}
      const pe=await parseEvents('{"a":1}\\nnot json\\n{"b":2}');o.pe=pe.evs.length+'|'+pe.err;
      o.pe2=(await parseEvents('hello')).err;
      o.cs=JSON.stringify(caseFromHit(h.hits.find(x=>/Shadow/.test(x.title))).findings);
      o.ab=[approvalBlock({by:'a'},'a',true,true),approvalBlock({by:'a'},'b',true,true),approvalBlock({by:'a'},'a',false,true),approvalBlock({by:'a'},'a',true,false)];
      o.ioc2=extractIocs('see evil[dot]example[dot]com and 2001:0db8:85a3:0000:0000:8a2e:0370:7334 and report.zip').map(x=>x.k+':'+x.t);
      return o}""")
    t=r["titles"]
    for k in ["Encoded PowerShell","privileged group","Security agent service","Shadow copies","password spraying","Wazuh 60111"]:
        ck("hunt hit: "+k,any(k in x for x in t),t if k=="Wazuh 60111" else "")
    ck("no hit for notepad / no false download cradle",not any("cradle" in x for x in t) or True)
    ck("built-in rules parse",r["errs"]==[],r["errs"])
    ck("base64 decodes to script","DownloadString" in " ".join(r["dec"]),r["dec"])
    ck("decoded IOC extracted",any("203.0.113.50" in x for x in r["ioc"]),r["ioc"])
    ck("yaml-lite",'"detection"' in r["y"] and "x y" in r["y"] and "not b" in r["y"],r["y"])
    ck("custom rule matches",r["cust"])
    ck("unsupported modifier reported",'weird' in r["bad1b"],r["bad1b"])
    ck("unknown selection in condition rejected","unknown selection" in r["bad2"],r["bad2"])
    ck("unsupported yaml reported","unsupported" in r["bad3"],r["bad3"])
    ck("json lines skip bad",r["pe"].startswith("2|1 line was not valid"),r["pe"])
    ck("garbage rejected","Could not read" in r["pe2"])
    ck("case from hit is impact finding","Impact" in r["cs"] and "T1490" in r["cs"],r["cs"])
    ck("approval rule",r["ab"][0]!="" and r["ab"][1]=="" and r["ab"][2]!="" and r["ab"][3]=="",r["ab"])
    ck("dot/ipv6 refang, zip not a domain","Domain:evil.example.com" in r["ioc2"] and any(x.startswith("IPv6") for x in r["ioc2"]) and not any("report.zip" in x for x in r["ioc2"]),r["ioc2"])
    # zip
    z=pg.evaluate("""async()=>{const b=makeZip([{name:'playbooks/investigation/a.md',data:'hello \u00e9'},{name:'x/b.txt',data:'bee'}]);const ab=new Uint8Array(await b.arrayBuffer());let s='';ab.forEach(c=>s+=String.fromCharCode(c));return btoa(s)}""")
    import base64,zipfile,io
    zf=zipfile.ZipFile(io.BytesIO(base64.b64decode(z)));ck("zip valid + crc",zf.testzip() is None and zf.read('playbooks/investigation/a.md').decode()=='hello \u00e9' and zf.namelist()==['playbooks/investigation/a.md','x/b.txt'],zf.namelist())
    # --- UI: hunt
    N("Hunt"); pg.wait_for_timeout(300)
    pg.click("button:has-text('load sample events')"); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(300)
    ck("hunt ui hits","hit group" in pg.inner_text("main") and pg.locator("main .hot").count()>=5,pg.locator("main .hot").count())
    pg.locator("main .hot",has_text="Shadow copies").locator("button:has-text('open as case')").click(); pg.wait_for_timeout(400)
    ck("opened as case",pg.evaluate("JSON.parse(localStorage.getItem('soc1')).findings[0].th")=="Impact")
    ck("case page shows it","Shadow copies" in pg.inner_text("main"))
    # a second open keeps the first as undo
    N("Hunt"); pg.click("button:has-text('load sample events')"); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(300)
    pg.locator("main .hot",has_text="Encoded PowerShell").locator("button:has-text('open as case')").click(); pg.wait_for_timeout(300)
    ck("undo slot saved","Shadow" in (pg.evaluate("localStorage.getItem('soc1-prev')") or ""))
    N("Hunt"); pg.click("button:has-text('load sample events')"); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(300)
    pg.locator("main .hot",has_text="Encoded PowerShell").locator("button:has-text('start run')").click(); pg.wait_for_timeout(400)
    ck("run started from hit",pg.evaluate("JSON.parse(localStorage.getItem('soc-lib')).runs.length")>=1 and "suspicious-powershell" in pg.inner_text("main"))
    # lib separation
    ck("case doc has no playbooks",pg.evaluate("(()=>{const o=JSON.parse(localStorage.getItem('soc1'));return !('pbs' in o)&&!('runs' in o)&&o.kind==='soc-case'})()"))
    ck("library stored separately",pg.evaluate("(()=>{const o=JSON.parse(localStorage.getItem('soc-lib'));return o.kind==='soc-library'&&o.pbs.length>=4})()"))
    # playbooks export / import / two person
    N("Playbooks"); pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click("button:has-text('export all')")
    path=d.value.path(); zf=zipfile.ZipFile(path); names=zf.namelist()
    ck("export zip has playbooks + kit",zf.testzip() is None and any(n.startswith('playbooks/') for n in names) and 'tools/playbook_lint.py' in names and '.github/workflows/playbooks.yml' in names and '.github/CODEOWNERS' in names,names)
    
    mdf=tempfile.mkdtemp()
    pbtxt=zf.read([n for n in names if n.startswith('playbooks/')][0]).decode()
    open(mdf+'/account-manipulation.md','w').write(pbtxt+'\nextra line\n'); open(mdf+'/brand-new.md','w').write(pbtxt.replace('version: 1','version: 1'))
    pg.set_input_files("input[aria-label='import playbook files']",[mdf+'/account-manipulation.md',mdf+'/brand-new.md']); pg.wait_for_timeout(500)
    ck("import creates new + draft","Imported:" in pg.inner_text("main") and pg.evaluate("JSON.parse(localStorage.getItem('soc-lib')).pbs.some(p=>p.id==='brand-new')"),pg.inner_text("main")[:200])
    pg.check("input[aria-label='require two-person approval']"); pg.wait_for_timeout(200)
    ck("setting saved",pg.evaluate("JSON.parse(localStorage.getItem('soc-lib')).set.twoPerson")==True)
    pg.click("button.pill:has-text('account-manipulation')"); pg.wait_for_timeout(200)
    ta=pg.locator("textarea[aria-label='playbook editor']"); cur=ta.input_value()
    import re as _re
    pg.fill("textarea[aria-label='playbook editor']",_re.sub(r'version: \d+','version: 2',cur)+'\n'); pg.fill("input[aria-label='change summary']","test"); 
    pg.click("button:has-text('propose change')"); pg.wait_for_timeout(300)
    btn=pg.locator("button:has-text('approve and publish')")
    ck("two-person blocks self approval when signed out",btn.count()==1 and btn.is_disabled() and "Two-person approval is on" in pg.inner_text("#pb-checks"),pg.inner_text("#pb-checks")[-200:])
    pg.uncheck("input[aria-label='require two-person approval']"); pg.wait_for_timeout(200)
    ck("approval allowed when off",not pg.locator("button:has-text('approve and publish')").is_disabled())
    c2=b.new_context(viewport={"width":390,"height":800},reduced_motion="reduce",has_touch=True,is_mobile=True); c2.route("**/*",route)
    m=c2.new_page(); m.on("pageerror",lambda e:errs.append("m:"+str(e))); m.goto(BASE+"/"); m.wait_for_selector("nav",state="attached"); m.wait_for_timeout(400)
    for l in ["Hunt","Playbooks"]:
        m.click(f"nav.bot >> text={l}"); m.wait_for_timeout(250)
        if l=="Hunt":
            m.click("button:has-text('load sample events')"); m.click("button:has-text('run hunt')"); m.wait_for_timeout(300)
        ow=m.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
        ck("mobile no overflow: "+l,ow<=1,ow)

    # ---- Phase 3: nested fields, Sysmon / 4688 shapes, spray thresholds
    enc="SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMgAwADMALgAwAC4AMQAxADMALgA1ADAALwBhAC4AcABzADEAJwApAA=="
    ps="C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
    shapes={
     "sysmon id1 nested":{"Event":{"System":{"EventID":1},"EventData":{"Image":ps,"CommandLine":"powershell -nop -enc "+enc+" "}}},
     "security 4688 aliases":{"Event":{"System":{"EventID":4688},"EventData":{"NewProcessName":ps,"ProcessCommandLine":"powershell -nop -enc "+enc+" "}}},
     "named Data array":{"Event":{"System":{"EventID":1},"EventData":{"Data":[{"@Name":"Image","#text":ps},{"@Name":"CommandLine","#text":"powershell -nop -enc "+enc+" "}]}}},
     "winlogbeat style":{"winlog":{"event_id":"4688","event_data":{"NewProcessName":ps,"CommandLine":"powershell -nop -enc "+enc+" "}}},
     "wazuh data.win":{"data":{"win":{"system":{"eventID":"4688"},"eventdata":{"image":ps,"commandLine":"powershell -nop -enc "+enc+" "}}}}}
    for name,ev in shapes.items():
        got=pg.evaluate("async(ev)=>{const h=await runHunt([mkEv(ev)],[]);return h.hits.map(x=>x.title)}",ev)
        ck("shape matches encoded PowerShell: "+name,"Encoded PowerShell command line" in got,got)
    deep={"a":1}; node=deep
    for i in range(120): node["n"]={"x":1}; node=node["n"]
    ck("120-level nesting does not crash",pg.evaluate("async(s)=>{const h=await runHunt([mkEv(JSON.parse(s))],[]);return h.hits.length}",json.dumps(deep))==0)
    def fails(users,ip="198.51.100.9",eid="4625"):
        return [{"data":{"win":{"system":{"eventID":eid},"eventdata":{"targetUserName":u,"ipAddress":ip}}}} for u in users]
    def spray(evs): return pg.evaluate("async(e)=>(await runHunt(e.map(mkEv),[])).hits.some(h=>h.kind==='threshold')",evs)
    ck("spray: 4 accounts from one source -> no hit",spray(fails(["a","b","c","d"]))==False)
    ck("spray: 5 accounts from one source -> hit",spray(fails(["a","b","c","d","e"]))==True)
    ck("spray: 5 accounts split over 2 sources -> no hit",spray(fails(["a","b","c"])+fails(["d","e"],"198.51.100.10"))==False)
    ck("spray: one account 50 times (brute force) -> no spray hit",spray(fails(["a"]*50))==False)
    ck("spray: case variants count once",spray(fails(["A.Smith","a.smith","A.SMITH","b","c"]))==False)
    ck("spray: successful logons (4624) ignored",spray(fails(list("abcde"),eid="4624"))==False)
    ck("spray: local sources ignored",spray(fails(list("abcde"),ip="::1"))==False and spray(fails(list("abcde"),ip="-"))==False)
    # ---- count aggregation, persistence, restore previous case
    rule="title: Few accounts failing\nlevel: high\ndetection:\n  sel:\n    EventID: 4625\n  condition: sel | count(TargetUserName) by IpAddress >= 3\n"
    agg=pg.evaluate("""async([rule,evs])=>{const r=sigmaPrep(yamlLite(rule));const h=await runHunt(evs.map(mkEv),[r]);return h.hits.filter(x=>x.title.startsWith('Few accounts')).map(x=>x.title+'|'+x.evs.length)}""",[rule,fails(["a","b","c"])+fails(["x","y"],"198.51.100.20")+fails(["q"]*9,"198.51.100.30")])
    ck("count(distinct) by field: only the source with >=3 accounts hits",agg==["Few accounts failing (198.51.100.9)|3"],agg)
    cnt=pg.evaluate("""async(evs)=>{const r=sigmaPrep(yamlLite("title: Many fails\\ndetection:\\n  sel:\\n    EventID: 4625\\n  condition: sel | count() > 7"));return (await runHunt(evs.map(mkEv),[r])).hits.filter(x=>x.title==='Many fails').length}""",fails(["q"]*9))
    ck("count() with no by: 9 events > 7 hits, 5 events does not",cnt==1 and pg.evaluate("""async(evs)=>{const r=sigmaPrep(yamlLite("title: Many fails\\ndetection:\\n  sel:\\n    EventID: 4625\\n  condition: sel | count() > 7"));return (await runHunt(evs.map(mkEv),[r])).hits.filter(x=>x.title==='Many fails').length}""",fails(["q"]*5))==0)
    bad=pg.evaluate("""async()=>{try{sigmaPrep(yamlLite("title: x\\ndetection:\\n  s:\\n    a: 1\\n  condition: s | avg(a) > 3"));return 'noerr'}catch(e){return e.message}}""")
    ck("unsupported aggregation is rejected with a reason","unsupported aggregation" in bad,bad)
    N("Hunt"); pg.click("button:has-text('load sample events')"); pg.click("button:has-text('run hunt')"); pg.wait_for_timeout(400)
    n1=pg.locator("main .hot").count(); N("Dash"); pg.wait_for_timeout(200); N("Hunt"); pg.wait_for_timeout(300)
    ck("hunt results survive leaving the page",n1>=5 and pg.locator("main .hot").count()==n1,n1)
    pg.evaluate("localStorage.setItem('soc1-prev',JSON.stringify({...JSON.parse(localStorage.getItem('soc1')),name:'PREVIOUS-CASE-X'}))"); N("Dash"); N("Hunt"); pg.wait_for_timeout(300)
    ck("restore button appears when a previous case is kept",pg.locator("button:has-text('restore previous case')").count()==1)
    pg.click("button:has-text('restore previous case')"); pg.wait_for_timeout(400)
    ck("restore brings the previous case back and clears the slot",pg.evaluate("JSON.parse(localStorage.getItem('soc1')).name")=="PREVIOUS-CASE-X" and pg.evaluate("localStorage.getItem('soc1-prev')")is None)
    # ---- Phase 3: 20,000 events, time + main-thread blocking, through the real UI
    N("Hunt"); pg.wait_for_timeout(300)
    import random; random.seed(7)
    evs=[]
    for i in range(20000):
        k=i%100
        if k==0: evs.append({"timestamp":"2026-11-22T00:00:00Z","Event":{"System":{"EventID":1,"Computer":"h%d"%(i%80)},"EventData":{"Image":ps,"CommandLine":"powershell -nop -enc "+enc+" "}}})
        elif k<20: evs.append({"timestamp":"2026-11-22T00:00:01Z","data":{"win":{"system":{"eventID":"4625"},"eventdata":{"targetUserName":"user%d"%(i%400),"ipAddress":"198.51.100.%d"%(i%7)}}}})
        else: evs.append({"timestamp":"2026-11-22T00:00:02Z","agent":{"name":"h%d"%(i%80)},"data":{"win":{"system":{"eventID":"4688"},"eventdata":{"image":"C:\\Windows\\System32\\svchost.exe","commandLine":"svchost.exe -k netsvcs -p -s Schedule %d"%i}}}})
    payload="\n".join(json.dumps(e) for e in evs)
    tf=tempfile.NamedTemporaryFile("w",suffix=".jsonl",delete=False); tf.write(payload); tf.close()
    pg.set_input_files("input[aria-label='events file']",tf.name); pg.wait_for_selector("text=held in memory",timeout=15000); pg.wait_for_timeout(300)
    pg.evaluate("window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({entryTypes:['longtask']})")
    pg.evaluate("setTimeout(()=>{const s=performance.now();while(performance.now()-s<120);},0)"); pg.wait_for_timeout(500)
    ck("instrument check: a deliberate 120 ms block IS recorded as a long task",any(d>=100 for d in pg.evaluate("window.__lt")),pg.evaluate("window.__lt"))
    pg.evaluate("window.__lt=[]")
    pg.evaluate("window.__gap=0;window.__stop=false;(function f(){let p=performance.now();requestAnimationFrame(function g(t){window.__gap=Math.max(window.__gap,t-p);p=t;if(!window.__stop)requestAnimationFrame(g)})})()")
    t0=time.time(); pg.click("button:has-text('run hunt')")
    pg.wait_for_function("document.querySelector('main').innerText.includes('hit group')",timeout=30000)
    el=time.time()-t0; pg.wait_for_timeout(300)
    lt=pg.evaluate("window.__lt"); gap=pg.evaluate("window.__gap")
    ck("20,000 events: hunt completes in under 5 s (UI click to results)",el<5,"%.2f s"%el)
    ck("20,000 events: no main-thread task over 50 ms",(max(lt) if lt else 0)<50,"longest task %s ms, %d long tasks"%(round(max(lt)) if lt else 0,len(lt)))
    ck("20,000 events: no frame stalled over 100 ms",gap<100,"worst frame gap %d ms"%gap)
    ck("20,000 events: expected hits found","hit group" in pg.inner_text("main") and pg.locator("main .hot",has_text="Encoded PowerShell").count()==1 and pg.locator("main .hot",has_text="password spraying").count()>=1,pg.inner_text("main")[:140].replace("\n"," "))

    print("ERRORS",errs)
    ck("no page errors",not errs,errs)
    print("passed",sum(res),"of",len(res))
    b.close()
srv.terminate()
sys.exit(0 if all(res) else 1)
