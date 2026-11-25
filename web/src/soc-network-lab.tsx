/* Spectacle SOC — Network diagnostics console.
 * The browser NEVER opens arbitrary sockets or executes a shell. Real probes
 * originate in the authenticated, allowlisted API; demo outputs are synthetic.
 */
const SOC_NET_DEMO:any[]=[
 {kind:'ping',target:'127.0.0.1',address:'127.0.0.1',port:null,status:'reply',detail:'Synthetic fixture: ICMP echo response for a local test host. This is NOT an actual packet capture.',duration_ms:1.2,mode:'synthetic_demo',code:'DEMO-ICMP'},
 {kind:'dns',target:'localhost',address:'127.0.0.1',port:null,status:'resolved',detail:'Synthetic fixture: localhost resolved to 127.0.0.1. DNS resolution alone does not establish reachability.',duration_ms:1.9,mode:'synthetic_demo',code:'DEMO-DNS'},
 {kind:'tcp',target:'127.0.0.1',address:'127.0.0.1',port:443,status:'closed',detail:'Synthetic fixture: TCP connection refused. This is not evidence that the host is compromised.',duration_ms:4.1,mode:'synthetic_demo',code:'DEMO-TCP'},
 {kind:'udp',target:'127.0.0.1',address:'127.0.0.1',port:5300,status:'inconclusive',detail:'Synthetic fixture: UDP probe had no answer. No UDP handshake exists; no response does NOT mean closed.',duration_ms:1500,mode:'synthetic_demo',code:'DEMO-UDP'}
];
const SOC_NET_COMMANDS=[
 ['ping 127.0.0.1','ICMP echo'],['dns localhost','DNS resolution'],['tcp 127.0.0.1 443','TCP connection'],['udp 127.0.0.1 5300','UDP datagram']
];
function socNetAssess(result:any,claim:string){
 if(!result)return {state:'missing',title:'No observation yet',reason:'Select a recorded command result before evaluating a statement.'};
 const isDemo=result.mode==='synthetic_demo';
 const base=(isDemo?'This is simulated evidence only. ':'')+(result.detail||'');
 const affirmative:any={reachable:['ping','reply'],tcp_open:['tcp','open'],udp_closed:['udp','closed'],dns_resolves:['dns','resolved']};
 if(claim==='security_compromise')return {state:'unknown',title:'Not established',reason:'Connectivity alone never proves a host is compromised. Correlate with a verified process, identity, or network event. '+base};
 if(claim==='udp_closed')return {state:'unknown',title:'UDP state inconclusive',reason:'Absence of a UDP response never verifies a closed port. '+base};
 const expected=affirmative[claim];
 if(!expected)return {state:'unknown',title:'Manual verification required',reason:'There is no deterministic check for this claim. Link original telemetry and an analyst-reviewed explanation.'};
 if(result.kind!==expected[0])return {state:'unknown',title:'Wrong evidence type',reason:'A '+result.kind.toUpperCase()+' result cannot validate a '+expected[0].toUpperCase()+' claim.'};
 if(result.status===expected[1])return {state:'supported',title:isDemo?'Supported by demo only':'Supported by observed probe',reason:base};
 if((result.kind==='tcp'&&result.status==='closed')||(result.kind==='ping'&&result.status==='no_reply'))return {state:result.kind==='tcp'?'contradicted':'unknown',title:result.kind==='tcp'?'Contradicted by TCP refusal':'ICMP inconclusive',reason:base};
 return {state:'unknown',title:'Insufficient evidence',reason:base};
}
function SOCNetworkLab({auth,go}:any){
 const [mode,setMode]=useState<'demo'|'live'>('demo');
 const [command,setCommand]=useState('udp 127.0.0.1 5300');
 const [history,setHistory]=useState<any[]>([]);
 const [selected,setSelected]=useState(0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [cap,setCap]=useState<any>(null);
 const [claim,setClaim]=useState('udp_closed');
 const [aiConclusion,setAiConclusion]=useState('');
 const [linuxSearch,setLinuxSearch]=useState('');
 const [linuxGroup,setLinuxGroup]=useState('All');
 const [linuxScenario,setLinuxScenario]=useState('network');
 const [showCatalog,setShowCatalog]=useState(true);
 const [linuxNotice,setLinuxNotice]=useState('');
 const linuxInput=useRef<any>(null);
 const suggested=SOC_LINUX_SCENARIOS.find(x=>x.id===linuxScenario)||SOC_LINUX_SCENARIOS[0];
 const visibleLinux=SOC_LINUX_ESSENTIALS.filter(x=>(linuxGroup==='All'||x.group===linuxGroup)&&(x.name+' '+x.description+' '+x.why).toLowerCase().includes(linuxSearch.toLowerCase()));
 const linuxGroups=['All',...Array.from(new Set(SOC_LINUX_ESSENTIALS.map(x=>x.group)))];
 const stageLinux=(item:SOCLinuxCommand)=>{setCommand(item.example);setLinuxNotice(item.policy==='restricted'?'Reference only — '+item.why:'Ready to simulate the read-only example. No Linux command will run on your device or the server.');setError('');if(linuxInput.current){linuxInput.current.scrollIntoView({behavior:'smooth',block:'center'});linuxInput.current.focus()}};
 const token=auth?.a?.token||'';
 useEffect(()=>{let active=true;
  if(!token){setCap(null);return()=>{active=false}}
  (async()=>{try{const fresh=await auth.fresh();const r=await fetch(API_BASE+'/v1/network/status',{headers:{Authorization:'Bearer '+fresh}});const j=await r.json();if(active)setCap(r.ok?j:null)}catch(_){if(active)setCap(null)}})();
  return()=>{active=false};
 },[token]);
 const run=async(cmd=command)=>{
  if(busy)return;
  setError('');setBusy(true);
  try{
   let data:any;
   if(mode==='demo'){
    const i=SOC_NET_COMMANDS.findIndex(x=>x[0]===cmd.trim());
    if(i>=0){data={...SOC_NET_DEMO[i],observed_at:Date.now()};}
    else {
     const item=socLinuxDemo(cmd);
     if(!item)throw Error('Demo supports only the four example commands or a Linux Essentials read-only template. Unlisted shell commands are blocked.');
     if(item.policy==='restricted')throw Error(item.name+' is reference-only. It cannot run in this terminal. '+item.why);
     data={kind:'linux',target:item.name,address:null,port:null,status:'sample',detail:'SYNTHETIC LINUX FIXTURE — NOT EXECUTED ON ANY HOST\n'+item.output,duration_ms:0,mode:'synthetic_demo',code:'LINUX-DEMO-'+item.name.toUpperCase(),observed_at:Date.now()};
    }
   }else{
    if(!token)throw Error('Sign in before running server-side network diagnostics.');
    if(!cap?.enabled)throw Error('Live probes are disabled by the server administrator. Use Demo or configure SPEC_NET_DIAGNOSTICS_ENABLED=1 and explicit allowlists.');
    const t=await auth.fresh();
    const r=await fetch(API_BASE+'/v1/network/execute',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({command:cmd})});
    const j=await r.json();if(!r.ok)throw Error((j.error||'Network probe failed')+' [HTTP '+r.status+']');
    data=j.result;
   }
   const entry={...data,command:cmd.trim(),id:'probe-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)};
   setHistory(old=>[entry,...old].slice(0,40));setSelected(0);
  }catch(e:any){setError(e?.message||'Probe failed')}
  finally{setBusy(false)}
 };
 const exportCatalog=()=>{
  const payload={schema:'spectacle-soc-linux-essentials-v1',source:'User-supplied Linux Essentials image; command examples reviewed for defensive use',loaded_at:new Date().toISOString(),executed_on_boot:false,model_assisted:false,commands:SOC_LINUX_ESSENTIALS,scenarios:SOC_LINUX_SCENARIOS};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='spectacle-linux-essentials.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
 };
 const output=history[selected]||null;
 const verdict=socNetAssess(output,claim);
 const download=()=>{
  const payload={kind:'spectacle-soc-network-diagnostic-v1',exported_at:new Date().toISOString(),origin:'server unless mode is synthetic_demo',events:history,claim,verification:verdict,raw_model_conclusion:aiConclusion,warning:'Model conclusion text has NOT been automatically verified. Do not use demo probes as incident evidence.'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='spectacle-network-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
 };
 return <div className="soc-net" data-testid="network-diagnostics"><div className="soc-net-hero">
  <div className="soc-net-eyebrow">OPERATIONS / NETWORK DIAGNOSTICS</div><h1>Network terminal</h1>
  <p>Test connection hypotheses, inspect structured results, and check whether an AI claim is supported by actual evidence. No arbitrary shell, packet sniffing, or network scanning.</p>
  <div className="soc-net-mode" role="group" aria-label="Network diagnostic mode">
   <button className={mode==='demo'?'active':''} aria-pressed={mode==='demo'} onClick={()=>{setMode('demo');setError('')}}>Synthetic demo</button>
   <button className={mode==='live'?'active':''} aria-pressed={mode==='live'} onClick={()=>{setMode('live');setError('')}}>Live server probes</button>
   <span className={mode==='demo'?'soc-net-label demo':'soc-net-label live'}>{mode==='demo'?'SIMULATED DATA':cap?.enabled?'SERVER ENABLED':'SERVER DISABLED'}</span>
  </div>
 </div>
 <div className="soc-net-stats"><div><span>ICMP</span><strong>Echo request</strong><small>Ping is not UDP</small></div><div><span>TCP</span><strong>Handshake</strong><small>Proves connectability only</small></div><div><span>UDP</span><strong>Datagram</strong><small>Silence is inconclusive</small></div><div><span>AUTH</span><strong>Server scoped</strong><small>Restricted targets & ports</small></div></div>
 <div className="soc-net-columns"><section className="soc-net-card"><div className="soc-net-top"><div><h2>Analyst console</h2><p>{mode==='demo'?'Local synthetic fixtures; no packets transmitted':'Commands executed by your authenticated server only'}</p></div><span className="soc-net-led"/></div>
 <div className="soc-net-window" role="log" aria-label="Diagnostic terminal output" aria-live="polite">
  <div className="soc-net-console-meta">Spectacle SOC Diagnostic v2 · {mode==='demo'?'simulation':'allowlisted server'} · {history.length} records</div>
  <div className="soc-net-boot" data-testid="linux-boot-log">
   <span>$ spectacle boot --load-linux-essentials</span>
   <span className="soc-net-boot-ready">✓ {SOC_LINUX_ESSENTIALS.length} essential commands registered · no shell commands executed</span>
   <span className="soc-net-boot-list">{SOC_LINUX_ESSENTIALS.map(x=>x.name).join('  ·  ')}</span>
   <span>✓ Safe diagnostic templates ready · privileged and modifying commands locked</span>
  </div>
  {history.length===0?<div className="soc-net-welcome"><span>$ help</span><p>Linux Essentials loaded at terminal start. Select a reference command, or run a supported network diagnostic.</p><span>$ udp 127.0.0.1 5300</span></div>:history.map((r:any,i:number)=><button key={r.id} onClick={()=>setSelected(i)} aria-pressed={selected===i} className={'soc-net-record '+(selected===i?'selected':'')}><span className="soc-net-cmd">$ {r.command}</span><span className="soc-net-response"><b>[{r.status.toUpperCase()}]</b> {r.detail}</span><span className="soc-net-time">{r.kind.toUpperCase()} · {r.duration_ms}ms · {r.mode==='synthetic_demo'?'SIMULATED':'SERVER-OBSERVED'}</span></button>)}
 </div>
 <form className="soc-net-command" onSubmit={(e:any)=>{e.preventDefault();run()}}><span aria-hidden="true">$</span><input ref={linuxInput} aria-label="Network diagnostic command" value={command} onChange={(e:any)=>setCommand(e.target.value)} placeholder="udp 127.0.0.1 5300" spellCheck={false} autoComplete="off"/><button disabled={busy} type="submit">{busy?'Running…':'Run command'}</button></form>
 {error&&<p role="alert" className="soc-net-error">{error}</p>}
 <div className="soc-net-presets">{SOC_NET_COMMANDS.map(x=><button key={x[0]} onClick={()=>{setCommand(x[0]);run(x[0])}} disabled={busy}><b>{x[1]}</b><code>{x[0]}</code></button>)}</div>
 <p className="soc-net-help">Demo also supports the exact read-only Linux Essentials templates listed below. Other Linux commands are guidance only; they are never executed. Supported live syntax: <code>ping HOST</code>, <code>dns HOST</code>, <code>tcp HOST PORT</code>, <code>udp HOST PORT</code>, <code>status</code>, <code>help</code>. Shell operators are rejected. Timeout or silence does not establish a security incident.</p>
 </section>
 <section className="soc-net-card"><div className="soc-net-top"><div><h2>AI conclusion verifier</h2><p>Compare a model claim with a selected probe</p></div><span className="soc-net-badge">EVIDENCE GATE</span></div>
 <label className="soc-net-field">Claim to check<select value={claim} onChange={(e:any)=>setClaim(e.target.value)} aria-label="AI claim to verify"><option value="reachable">The host is reachable over ICMP</option><option value="tcp_open">The selected TCP port is open</option><option value="dns_resolves">The hostname resolves</option><option value="udp_closed">This UDP port is closed</option><option value="security_compromise">The target is compromised</option></select></label>
 <label className="soc-net-field">Optional exact AI conclusion<textarea rows={3} value={aiConclusion} onChange={(e:any)=>setAiConclusion(e.target.value)} placeholder="Paste the model's wording to preserve it alongside the probe…" aria-label="Original AI conclusion text"/></label>
 <div className={'soc-net-verdict soc-net-'+verdict.state} data-testid="network-verification"><span>{verdict.state==='supported'?'EVIDENCE SUPPORTS':verdict.state==='contradicted'?'EVIDENCE CONTRADICTS':'NOT VERIFIED'}</span><h3>{verdict.title}</h3><p>{verdict.reason}</p></div>
 {output?<div className="soc-net-facts"><h3>Selected observation</h3><dl><div><dt>Command</dt><dd>{output.command}</dd></div><div><dt>Origin</dt><dd>{output.mode==='synthetic_demo'?'Synthetic fixture':'SOC backend host'}</dd></div><div><dt>Address</dt><dd>{output.address||'N/A'}</dd></div><div><dt>Observed</dt><dd>{new Date(output.observed_at).toLocaleString()}</dd></div><div><dt>Protocol</dt><dd>{output.kind.toUpperCase()}</dd></div></dl></div>:<p className="soc-net-empty">Run a command first. Your case assessment should never rely on a guessed terminal response.</p>}
 {aiConclusion&&<p className="soc-net-help">Pasted model text is preserved but <strong>not automatically semantically verified</strong>. The verdict applies only to the selected structured claim.</p>}
 <div className="soc-net-footer"><button disabled={!history.length} onClick={download}>Export evidence receipt</button><button onClick={()=>go('playbooks')}>Review response playbooks →</button></div>
 </section></div>
 <section className="soc-net-linux" data-testid="linux-essentials-library">
  <div className="soc-net-linux-header">
   <div><div className="soc-net-eyebrow">AUTO-LOADED AT TERMINAL START · 25 / 25</div><h2>Linux Essentials library</h2><p>Search the 25 commands from your reference sheet, then stage a read-only demo or inspect an approval-gated utility. Nothing executes at startup.</p></div>
   <button className="soc-net-linux-export" onClick={exportCatalog}>Export 25 commands</button><button className="soc-net-linux-collapse" onClick={()=>setShowCatalog(x=>!x)} aria-expanded={showCatalog}>{showCatalog?'Collapse library':'Browse 25 commands'}</button>
  </div>
  {showCatalog&&<>
   <div className="soc-net-advice" data-testid="linux-triage-advice">
    <div><span className="soc-net-advice-tag">RULE-BASED TRIAGE · NO MODEL CONNECTED</span><h3>What are you investigating?</h3><p>Choose a symptom for a conservative investigation path. These suggestions are not LoRA predictions or proof of exploitation.</p></div>
    <div className="soc-net-scenario-controls">
     <select aria-label="Investigation scenario" value={linuxScenario} onChange={(e:any)=>setLinuxScenario(e.target.value)}>{SOC_LINUX_SCENARIOS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
     <p>{suggested.hint}</p>
     <div className="soc-net-advice-picks">{suggested.commands.map(name=>{const item=socLinuxGet(name);return item?<button key={name} onClick={()=>stageLinux(item)} title={item.why}>{name}<small>{item.policy==='restricted'?'Approval needed':'Demo'}</small></button>:null})}</div>
    </div>
   </div>
   <div className="soc-net-linux-toolbar"><label className="soc-net-linux-search"><span>Search commands</span><input aria-label="Search Linux commands" placeholder="e.g. sockets, logs, disk, login…" value={linuxSearch} onChange={(e:any)=>setLinuxSearch(e.target.value)}/></label><div className="soc-net-linux-groups" aria-label="Filter Linux command category">{linuxGroups.map(g=><button key={g} className={linuxGroup===g?'selected':''} onClick={()=>setLinuxGroup(g)} aria-pressed={linuxGroup===g}>{g}</button>)}</div></div>
   {linuxNotice&&<div className="soc-net-linux-notice" role="status">{linuxNotice}</div>}
   <div className="soc-net-linux-grid">{visibleLinux.map(item=><article className="soc-net-linux-item" key={item.name} data-testid={'linux-command-'+item.name}>
    <div className="soc-net-linux-item-head"><code>{item.name}</code><span className={item.policy==='sample'?'soc-net-linux-tag sample':'soc-net-linux-tag guarded'}>{item.policy==='sample'?'SAFE DEMO':'REFERENCE ONLY'}</span></div>
    <p>{item.description}</p><div className="soc-net-linux-example">$ {item.example}</div><small>{item.why}</small><button onClick={()=>stageLinux(item)} aria-label={'Stage '+item.name+' command'}>Insert command <span aria-hidden="true">↗</span></button>{item.policy==='sample'&&item.name!=='ping'&&<button className="soc-net-linux-try" onClick={()=>{if(mode!=='demo'){setError('Switch to Synthetic demo before previewing local sample commands.');return}run(item.example)}} aria-label={'Preview '+item.name+' synthetic result'}>Preview synthetic result <span aria-hidden="true">▶</span></button>}
   </article>)}</div>
   {visibleLinux.length===0&&<p className="soc-net-linux-noresults">No matching command. Clear the search or select another category.</p>}
   <p className="soc-net-linux-footnote"><strong>Execution policy:</strong> Linux examples are synthetic, and network probes use a separately secured backend. Privilege changes, disk writes, file transfers, firewall edits, remote shells, packet sniffers, and exploitation are never launched by this page. Investigation of vulnerabilities requires authorized scope and original supporting evidence.</p>
  </>}
 </section>
 <div className="soc-net-warning"><strong>Evidence boundary:</strong> Probes originate from the backend's network location, not the user's laptop. A reachable host is not necessarily healthy, silent UDP is not necessarily closed, and sample output is never real packet evidence. Human approval is required for response actions.</div>
 </div>;
}
