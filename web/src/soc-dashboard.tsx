/* Spectacle SOC Command Center — Tailwind utilities + local, reusable React UI.
 * This view intentionally distinguishes sample fixtures from saved evidence.
 * It never claims to have live SIEM access or autonomous response execution.
 */
const SOC_MENU = [
  {heading:'COMMAND',items:[['home','Dashboard','layout'],['hunt','Threat hunt','target'],['timeline','Event timeline','activity'],['case','Cases','folder'],['dash','Reports','chart']]},
  {heading:'INVESTIGATE',items:[['triage','Triage matrix','layers'],['playbooks','Playbooks','book'],['runs','Response runs','play'],['network','Network terminal','activity'],['threats','Threat intel','shield']]},
  {heading:'WORKSPACE',items:[['toolkit','Toolkit','wrench'],['models','Models & adapters','database'],['theme','Appearance','settings'],['faq','Help & guides','help']]}
];
const SOC_PATHS:any={
  shield:<><path d="M12 2.5 20.5 6v6.1c0 5.7-3.7 9.5-8.5 11.4-4.8-1.9-8.5-5.7-8.5-11.4V6L12 2.5Z"/></>,
  layout:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/></>,
  activity:<><path d="M2 12h4l3-7 5 14 3-7h5"/></>,
  folder:<><path d="M3 7V5a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></>,
  chart:<><path d="M4 19V5M4 19h16M8 15l4-5 3 2 5-7"/><path d="M17 5h3v3"/></>,
  layers:<><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  book:<><path d="M4 4.7C7 3 10 3 12 5v15c-2-2-5-2-8-.3V4.7ZM12 5c2-2 5-2 8-.3v15c-3-1.7-6-1.7-8 .3"/></>,
  play:<><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></>,
  wrench:<><path d="M14 6a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 3-3-3 3-4Z"/></>,
  settings:<><path d="M10 2h4l.7 2.5 2 .8L19 4l3 3-1.3 2.3.8 2L24 12v4l-2.5.7-.8 2L22 21l-3 3-2.3-1.3-2 .8L14 26h-4l-.7-2.5-2-.8L5 24l-3-3 1.3-2.3-.8-2L0 16v-4l2.5-.7.8-2L2 7l3-3 2.3 1.3 2-.8L10 2Z" transform="translate(3 0) scale(.75)"/><circle cx="12" cy="11" r="3"/></>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9.4 9a2.9 2.9 0 1 1 4.5 2.5c-1.4 1-1.9 1.5-1.9 3M12 18h.01"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  chevron:<><path d="m6 9 6 6 6-6"/></>,
  arrow:<><path d="M4 12h16m-7-7 7 7-7 7"/></>,
  up:<><path d="m6 15 6-6 6 6"/></>,
  upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/></>,
  menu:<><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close:<><path d="m5 5 14 14M19 5 5 19"/></>,
  check:<><path d="m4 12 5 5L20 6"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  database:<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
  zap:<><path d="m14 2-9 11h7l-2 9 9-12h-7l2-8Z"/></>,
  lock:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  spark:<><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  filter:<><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></>,
  external:<><path d="M13 4h7v7M20 4 10 14M19 13v6H5V5h6"/></>,
  moon:<><path d="M20 16A8 8 0 0 1 8 4 8 8 0 1 0 20 16Z"/></>
};
function SOCIcon({name,size=18,className=''}:any){return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SOC_PATHS[name]||SOC_PATHS.shield}</svg>}
function SOCNavLink({active,icon,label,onClick,compact=false}:any){return <button type="button" aria-current={active?'page':undefined} className={'soc-nav-link group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all '+(active?'soc-nav-active':'')} onClick={onClick}><SOCIcon name={icon} size={19}/><span className={compact?'sr-only':''}>{label}</span>{active&&!compact&&<span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300"/>}</button>}
function SOCShell({pg,go,openSearch,focus,toggleFocus,children}:any){const [mobile,setMobile]=useState(false),[collapse,setCollapse]=useState(false),[notify,setNotify]=useState(false);
const openPage=(id:string)=>{go(id);setMobile(false);setNotify(false)};
return <div className={'soc-app '+(focus?'soc-focus ':'')+(collapse?'soc-collapse':'')}>
  {mobile&&<button className="soc-dim" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
  <aside className={'soc-sidebar '+(mobile?'soc-sidebar-open':'')} aria-label="Primary navigation">
   <div className="soc-brand flex items-center gap-3 px-5 py-5"><span className="soc-brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-xl"><SOCIcon name="shield" size={24}/></span><div className="soc-brand-text min-w-0"><strong className="block text-sm font-bold tracking-wide text-white">SPECTACLE <span className="text-cyan-300">SOC</span></strong><span className="block text-xs text-slate-400">Analyst automation · v12</span></div><button className="soc-drawer-close" aria-label="Close menu" onClick={()=>setMobile(false)}><SOCIcon name="close" size={19}/></button></div>
   <div className="soc-side-scroll flex-1 overflow-y-auto px-3 py-3">
    {SOC_MENU.map((group:any)=><section key={group.heading} className="soc-nav-group mb-6"><p className="soc-side-heading px-3 pb-2 text-xs font-bold tracking-widest text-slate-500">{group.heading}</p><div className="flex flex-col gap-1">{group.items.map((item:string[])=><SOCNavLink key={item[0]} label={item[1]} icon={item[2]} active={pg===item[0]} onClick={()=>openPage(item[0])} compact={collapse&&!mobile}/>)}</div></section>)}
   </div><div className="soc-side-footer mx-3 mb-4 rounded-xl p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><span className="soc-status-dot"/> Local workspace</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Log analysis runs in your browser. No live SIEM connection.</p><button onClick={()=>openPage('hunt')} className="soc-side-cta mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"><SOCIcon name="upload" size={14}/> Import logs</button></div>
   <button className="soc-side-collapse hidden lg:flex" onClick={()=>setCollapse(x=>!x)} aria-label={collapse?'Expand sidebar':'Collapse sidebar'}><SOCIcon name="chevron" size={17} className={collapse?'rotate-180':''}/></button>
  </aside>
  <div className="soc-center min-w-0">
   <header className="soc-header sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-7">
     <div className="flex min-w-0 items-center gap-3"><button className="soc-icon-btn soc-hamburger lg:hidden" aria-label="Open navigation" onClick={()=>setMobile(true)}><SOCIcon name="menu" size={22}/></button><div className="flex flex-col"><span className="soc-header-eyebrow text-xs font-medium">SECURITY WORKSPACE</span><strong className="truncate text-sm font-semibold text-white">{pg==='home'?'Command Center':SOC_MENU.flatMap((g:any)=>g.items).find((i:any)=>i[0]===pg)?.[1]||'SOC workspace'}</strong></div></div>
     <div className="flex items-center gap-2 md:gap-3"><button className="soc-search-button flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400" onClick={openSearch} aria-label="Search cases, findings, playbooks and runs"><SOCIcon name="search" size={17}/><span className="hidden sm:block">Search your workspace...</span><kbd className="hidden md:block">⌘ K</kbd></button><div className="relative"><button className="soc-icon-btn" aria-label="Notifications" aria-expanded={notify} onClick={()=>setNotify(!notify)}><SOCIcon name="bell" size={19}/></button>{notify&&<div className="soc-notify absolute right-0 top-full mt-2 w-64 rounded-xl p-4 text-sm"><strong className="text-white">Notifications</strong><p className="mt-2 text-slate-400">No connected alert stream. Import logs in Threat Hunt to start investigating.</p><button className="mt-3 text-cyan-300" onClick={()=>openPage('hunt')}>Open Threat Hunt →</button></div>}</div><button className="soc-icon-btn hidden sm:grid" onClick={toggleFocus} aria-label={focus?'Exit focus mode':'Enter focus mode'} title="Focus mode"><SOCIcon name="layout" size={19}/></button><span className="soc-avatar grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white">SOC</span></div>
   </header>
   <main key={pg} className={'soc-main '+(pg==='home'?'soc-main-dashboard':'soc-main-legacy')}><div className="soc-main-entry">{children}</div></main>
   <nav className="soc-bottom-nav lg:hidden" aria-label="Quick navigation">{[['home','Dashboard','layout'],['hunt','Hunt','target'],['timeline','Timeline','activity'],['case','Cases','folder'],['playbooks','Playbooks','book']].map((v:string[])=><button key={v[0]} onClick={()=>openPage(v[0])} className={pg===v[0]?'current':''} aria-current={pg===v[0]?'page':undefined}><SOCIcon name={v[2]} size={19}/><span>{v[1]}</span></button>)}</nav>
  </div>
 </div>}
function SOCPill({children,tone='muted'}:any){return <span className={'soc-pill soc-pill-'+tone}>{children}</span>}
function SOCPanel({title,icon,action,children,className='',id}:any){return <section id={id} className={'soc-panel rounded-2xl p-4 md:p-5 '+className}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="soc-section-icon"><SOCIcon name={icon} size={18}/></span><h2 className="text-sm font-bold tracking-tight text-white">{title}</h2></div>{action}</div>{children}</section>}
function SOCSpark({points,color='cyan',height=43}:any){const nums=points||[13,19,17,24,22,32,25,34,31,39,35,43],w=190,h=height,top=5;const max=Math.max(...nums,1),min=Math.min(...nums,0),coords=nums.map((n:number,i:number)=>`${(i/(nums.length-1))*w},${top+(h-top-8)*(1-(n-min)/(max-min||1))}`).join(' ');const id='soc-spark-'+color;return <svg aria-hidden="true" viewBox={'0 0 '+w+' '+h} preserveAspectRatio="none" style={{width:'100%',height}}><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={color==='pink'?'#fa4e9c':color==='violet'?'#9864ff':'#25e2f3'}/><stop offset="100%" stopColor={color==='pink'?'#d34cff':color==='violet'?'#cf61ff':'#5c8aff'}/></linearGradient></defs><polyline points={coords} stroke={'url(#'+id+')'} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points={coords+' '+w+','+h+' 0,'+h} fill={'url(#'+id+')'} opacity=".10" stroke="none"/></svg>}
function SOCMetric({label,value,note,icon,color,series,onClick}:any){return <button onClick={onClick} className={'soc-metric soc-metric-'+color+' relative min-w-0 overflow-hidden rounded-2xl p-4 text-left transition-transform hover:-translate-y-1'}><div className="flex items-start justify-between gap-2"><span className="soc-metric-icon"><SOCIcon name={icon} size={20}/></span><SOCIcon name="arrow" size={14} className="soc-metric-arrow opacity-40"/></div><p className="mt-3 text-xs font-medium text-slate-300">{label}</p><div className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">{value}</div><div className="mt-1 text-xs text-slate-400">{note}</div><div className="mt-1 h-8"><SOCSpark points={series} color={color}/></div></button>}
function SOCBars({values}:any){return <div className="soc-bar-chart flex h-24 items-end gap-1.5" aria-label="Alert distribution chart">{values.map((n:number,i:number)=><span key={i} style={{height:Math.max(7,n)+'%'}} className="flex-1 rounded-t-sm"/>)}</div>}
const SOC_DEMO_EVENTS=[
 {id:'SAMPLE-001',at:'14:26:17',severity:'Critical',title:'Suspicious PowerShell execution and credential access',source:'EDR',asset:'FIN-WS-017'},
 {id:'SAMPLE-002',at:'14:24:03',severity:'High',title:'Outbound connection flagged for C2 investigation',source:'Firewall',asset:'CORP-FW-01'},
 {id:'SAMPLE-003',at:'14:21:36',severity:'High',title:'Unusual encrypted outbound transfer detected',source:'Network',asset:'ENG-WS-008'},
 {id:'SAMPLE-004',at:'14:18:09',severity:'Medium',title:'Multiple failed sign-in attempts on account',source:'Identity',asset:'Microsoft Entra'},
 {id:'SAMPLE-005',at:'14:15:27',severity:'Low',title:'Unexpected process spawned by Office app',source:'Endpoint',asset:'MKT-WS-044'}
];
const SOC_DEMO_CASES=[
 {id:'DEMO-0142',title:'Possible data exfiltration',severity:'Critical',status:'Investigating',owner:'Analyst A',time:'2m ago'},
 {id:'DEMO-0141',title:'PowerShell credential access',severity:'High',status:'Triage',owner:'Analyst B',time:'6m ago'},
 {id:'DEMO-0140',title:'Suspicious outbound traffic',severity:'High',status:'Investigating',owner:'Analyst A',time:'11m ago'},
 {id:'DEMO-0139',title:'Multiple unsuccessful sign-ins',severity:'Medium',status:'Pending',owner:'Unassigned',time:'18m ago'},
 {id:'DEMO-0138',title:'Unusual endpoint execution',severity:'Low',status:'Review',owner:'Analyst C',time:'24m ago'}
];
function SOCSeverity({severity}:any){const type=String(severity).toLowerCase();return <span className={'soc-severity soc-severity-'+(type==='critical'?'critical':type==='high'?'high':type==='medium'?'medium':type==='low'?'low':'review')}>{severity}</span>}
function SOCDonut({counts}:any){const keys=['Critical','High','Medium','Low'];const cols=['#fa438c','#fb9137','#fbd347','#35d6f7'];const total=Math.max(0,keys.reduce((a,k)=>a+(counts[k]||0),0));let current=0;const gradient=keys.map((k,i)=>{const from=current;current+=total?counts[k]/total*100:25;return cols[i]+' '+from+'% '+current+'%'}).join(', ');return <div className="soc-donut-layout flex flex-col items-center gap-5 sm:flex-row"><div className="soc-donut relative grid shrink-0 place-items-center rounded-full" style={{background:'conic-gradient('+gradient+')'}}><div className="soc-donut-hole grid place-items-center rounded-full"><div className="text-center"><strong className="block text-2xl text-white">{total}</strong><span className="text-xs text-slate-400">events</span></div></div></div><div className="flex w-full flex-col gap-2">{keys.map((k,i)=><div key={k} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-slate-300"><i className="h-2 w-2 rounded-full" style={{background:cols[i]}}/>{k}</span><span className="font-semibold text-slate-200">{counts[k]||0}</span></div>)}</div></div>}
function SOCBackendWorkbench({auth,go,onSummary,onDemo}:any){
 const [health,setHealth]=useState<any>(null),[demoReport,setDemoReport]=useState<any>(null),[report,setReport]=useState<any>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[filename,setFilename]=useState('');
 const [summary,setSummary]=useState<any>(null),[runs,setRuns]=useState<any[]>([]),[triageHistory,setTriageHistory]=useState<any[]>([]),[selectedKey,setSelectedKey]=useState('');
 const [reviewStatus,setReviewStatus]=useState('needs_review'),[reviewNote,setReviewNote]=useState(''),[reviewBusy,setReviewBusy]=useState(false),[evidenceOpen,setEvidenceOpen]=useState(false);
 const [reviewMessage,setReviewMessage]=useState('');
 const token=auth?.a?.token||'';
 const call=async(path:string,method='GET',body?:any)=>{
  const headers:any={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+(await auth.fresh());
  const r=await fetch(API_BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  let j:any={};try{j=await r.json()}catch(e){};
  if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;
 };
 const refresh=async()=>{
  if(!token)return;
  try{
   const [s,r,t]=await Promise.all([call('/v1/soc/summary'),call('/v1/soc/runs'),call('/v1/soc/triage')]);
   setSummary(s);onSummary(s);setRuns(r.runs||[]);setTriageHistory(t.history||[]);setError('');
  }catch(e:any){setError(e.message||'Unable to refresh workspace')}
 };
 useEffect(()=>{let alive=true;
  fetch(API_BASE+'/v1/soc/status').then(r=>r.ok?r.json():null).then(j=>{if(alive&&j)setHealth(j)}).catch(()=>{});
  fetch(API_BASE+'/v1/soc/demo').then(r=>r.ok?r.json():null).then(j=>{if(alive&&j?.report){onDemo(j.report);setDemoReport(j.report)}}).catch(()=>{});
  return()=>{alive=false}
 },[]);
 useEffect(()=>{if(token){refresh().catch(()=>{})}else{setSummary(null);setRuns([]);setTriageHistory([]);setReport(null)}},[token]);
 const submit=async(sample:boolean,file?:File)=>{
  if(!token){setError('Sign in under Reports to save an analysis. Synthetic example findings remain available below.');return}
  setError('');setBusy(true);setReviewMessage('');
  try{
   if(file&&file.size>550000)throw new Error('File exceeds the 550 KB browser upload limit');
   const payload=sample?undefined:{filename:file?.name||'events.log',content:await file!.text()};
   const result=await call(sample?'/v1/soc/sample':'/v1/soc/ingest','POST',payload);
   setReport(result.report||null);setFilename(sample?'Kyle synthetic test':file?.name||'');
   setSelectedKey('');await refresh();
   if(result.status==='queued')setError('Queued in Redis. Refresh once a worker has processed it.');
   else if(result.deduplicated)setReviewMessage('Previously analyzed file reused; no duplicate job was created.');
  }catch(e:any){setError(e.message||'Analysis failed')}finally{setBusy(false)}
 };
 // Authenticated users see only saved workspace findings: demo must never silently override real data.
 const saved=!!token;
 const rows:any[]=saved?(summary?.alerts||[]):(demoReport?.alerts||[]);
 const selected=rows.find((f:any)=>f.run_id+':'+f.id===selectedKey)||rows[0];
 const currentRun=selected?.run_id?runs.find((r:any)=>r.id===selected.run_id):null;
 const evidenceSource=saved?(currentRun?.report?.events||[]):(demoReport?.events||[]);
 const evidence=selected?evidenceSource.filter((e:any)=>selected.source_event_ids?.includes(e.id)):[];
 const actions=(summary?.triage||[]).filter((x:any)=>x.run_id===selected?.run_id&&x.finding_id===selected?.id);
 const activeReview=actions[0];
 const auditTrail=triageHistory.filter((x:any)=>x.run_id===selected?.run_id&&x.finding_id===selected?.id).slice(0,8);
 const sourceName=currentRun?.filename||(saved?filename:demoReport?.dataset)||'Unspecified file';
 const sourceHash=currentRun?.content_sha256||(!saved?demoReport?.source_sha256:'');
 useEffect(()=>{setReviewStatus(activeReview?.status||'needs_review');setReviewNote('');setReviewMessage('');setEvidenceOpen(false)},[selected?.id,selected?.run_id,activeReview?.id]);
 const saveReview=async()=>{
  if(!saved||!selected?.run_id){setReviewMessage('Run the test fixture or upload logs while signed in to create a reviewable finding.');return}
  setReviewBusy(true);setReviewMessage('');
  try{
   await call('/v1/soc/triage','POST',{run_id:selected.run_id,finding_id:selected.id,status:reviewStatus,note:reviewNote});
   await refresh();setReviewMessage('Review saved to your workspace history.');setReviewNote('');
  }catch(e:any){setReviewMessage(e.message||'Could not save review')}finally{setReviewBusy(false)}
 };
 const download=()=>{const data=saved?{summary,run:currentRun||null,triage:summary?.triage||[]}:demoReport;if(!data)return;
  const blob=new Blob([JSON.stringify({...data,export_mode:saved?'saved_workspace':'synthetic_fixture',exported_at:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=saved?'spectacle-soc-workspace-review.json':'spectacle-soc-synthetic-example.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)
 };
 return <SOCPanel title="Log analysis & analyst triage" icon="database" id="soc-backend" className="soc-backend-panel mt-4" action={<div className="flex flex-wrap items-center gap-2"><SOCPill tone="local">{health?health.storage==='supabase'?'Supabase':health.storage==='offline-preview'?'Offline preview':'Local SQLite':'Backend unavailable'}</SOCPill><SOCPill tone="demo">{health?(health.queue==='redis'?'Redis Stream':'Inline processing'):'Preview only'}</SOCPill></div>}>
  <div className="soc-backend-head flex flex-wrap items-start justify-between gap-4">
   <div className="max-w-2xl"><div className="soc-pipeline-label text-xs font-bold tracking-widest text-cyan-300">EXPLAINABLE DETECTIONS · HUMAN-IN-THE-LOOP</div><h3 className="mt-2 text-lg font-bold text-white">Turn file findings into reviewed investigations</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Import timestamped JSON, JSONL, CSV, LOG, or TXT. Inspect matched source events, record a disposition, and export your work. Scores are deterministic rules—not breach probabilities.</p></div>
   <div className="flex flex-wrap gap-2"><button className="soc-primary rounded-xl px-4 py-2.5 text-xs font-bold" onClick={()=>submit(true)} disabled={busy}>{busy?'Analyzing…':'Run Kyle fixture'}</button><label className="soc-action-outline cursor-pointer rounded-xl px-4 py-2.5 text-xs font-semibold">Upload log file<input className="sr-only" type="file" accept=".json,.jsonl,.ndjson,.csv,.log,.txt" disabled={busy} onChange={(e:any)=>{const file=e.target.files?.[0];if(file)submit(false,file);e.target.value=''}}/></label><button className="soc-action-outline rounded-xl px-3 py-2.5 text-xs" onClick={()=>refresh()} disabled={!token||busy}>Refresh</button></div>
  </div>
  <div className="soc-pipeline-data-state mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2"><span className="text-xs text-slate-200"><b>{saved?'Workspace results':'Read-only synthetic example'}</b> · {saved?'Only your signed-in workspace is displayed.':'Nothing is saved and no network containment occurs.'}</span>{!saved&&<button className="soc-text-link text-xs font-semibold" onClick={()=>go('dash')}>Sign in to review →</button>}</div>
  {error&&<div className="soc-backend-message mt-3 rounded-lg px-3 py-2 text-xs text-amber-200" role="status">{error}</div>}
  <div className="soc-pipeline-stats mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
   {[["Processed events",saved?summary?.events??'—':demoReport?.event_count??'—'],["High-priority matches",saved?summary?.high_confidence??'—':demoReport?.high_confidence_count??'—'],["Parser warnings",saved?summary?.parser_errors??'—':demoReport?.parse_errors?.count??'—'],["Saved analysis runs",saved?summary?.runs??'—':'Not connected']].map((k:any)=><div className="soc-pipeline-stat rounded-xl p-3" key={k[0]}><span className="block text-xs text-slate-400">{k[0]}</span><strong className="mt-1 block text-2xl text-white">{k[1]}</strong></div>)}
  </div>
  <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-white">Findings requiring assessment <span className="text-slate-400">({rows.length})</span></h4><button className="soc-text-link text-xs" onClick={download} disabled={!rows.length}>Export JSON →</button></div>
  <div className="soc-review-layout mt-3">
   <div className="soc-review-queue" aria-label="Detected findings">
    {rows.map((f:any)=><button key={(f.run_id||'demo')+':'+f.id} aria-pressed={selected?.id===f.id&&selected?.run_id===f.run_id} onClick={()=>setSelectedKey(f.run_id+':'+f.id)} className={'soc-review-finding w-full rounded-xl p-3 text-left '+(selected?.id===f.id&&selected?.run_id===f.run_id?'soc-review-selected':'')}>
      <div className="flex items-center justify-between gap-2"><SOCSeverity severity={f.severity}/><span className="text-xs font-bold text-cyan-300">{f.confidence_score}/100</span></div><strong className="mt-2 block text-xs leading-relaxed text-slate-100">{f.title}</strong><span className="mt-1 block text-xs text-slate-400">{f.category||'Security'} · {f.technique||'No ATT&CK technique'}</span><div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{f.source_event_ids?.length||0} linked events</span><span className="soc-review-disposition">{(summary?.triage||[]).find((a:any)=>a.run_id===f.run_id&&a.finding_id===f.id)?.status?.replace('_',' ')||'Needs review'}</span></div>
    </button>)}
    {!rows.length&&<div className="soc-review-empty rounded-xl p-5 text-sm text-slate-400">No findings in this workspace. Upload logs or run Kyle’s synthetic fixture to create an investigation.</div>}
   </div>
   <div className="soc-review-detail min-w-0 rounded-xl p-4" aria-label="Selected finding details">
    {selected?<>
      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><span className="soc-pipeline-label text-xs text-cyan-300">INVESTIGATION DETAIL</span><h4 className="mt-2 text-base font-bold text-white">{selected.title}</h4><span className="mt-1 block text-xs text-slate-500">{selected.id} · {selected.rule} · {selected.host||'unknown host'}</span></div><SOCSeverity severity={selected.severity}/></div>
      <div className="soc-review-rationale mt-4 rounded-xl p-3"><strong className="text-xs text-slate-200">Why this was flagged</strong><p className="mt-1 text-xs leading-relaxed text-slate-300">{selected.explanation}</p><p className="mt-2 text-xs text-amber-300">Priority: {selected.confidence_score}/100 · Not a calibrated probability or confirmation of compromise.</p></div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><div className="soc-review-kv rounded-lg p-2"><span className="text-xs text-slate-500">First observed (UTC)</span><strong className="mt-1 block break-words text-xs text-slate-200">{selected.first_seen||'Unknown'}</strong></div><div className="soc-review-kv rounded-lg p-2"><span className="text-xs text-slate-500">Evidence source</span><strong className="mt-1 block break-words text-xs text-slate-200">{sourceName}</strong></div></div>
      {selected.technique&&/^T\d{4}(\.\d{3})?$/.test(selected.technique)&&<a className="soc-review-attack mt-3 inline-flex items-center gap-2 text-xs" target="_blank" rel="noopener noreferrer" href={'https://attack.mitre.org/techniques/'+selected.technique.replace('.','/')+'/'}>Review MITRE ATT&CK {selected.technique} <SOCIcon name="external" size={13}/></a>}
      <button className="soc-review-evidence-toggle mt-4 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-white" onClick={()=>setEvidenceOpen(x=>!x)} aria-expanded={evidenceOpen}>Matched source events ({evidence.length}) <SOCIcon name="chevron" size={14} className={evidenceOpen?'rotate-180':''}/></button>
      {evidenceOpen&&<div className="soc-review-evidence mt-2" role="region" aria-label="Matched log evidence">{evidence.map((e:any)=><div key={e.id} className="soc-review-event rounded-lg p-3"><div className="flex flex-wrap justify-between gap-2 text-xs"><b className="text-cyan-300">{e.id}</b><span className="text-slate-400">{e.timestamp}</span></div><p className="mt-1 break-words text-xs text-slate-200">{e.message||e.command_line||e.process||e.event_id||'No message'}</p><p className="mt-1 break-words text-xs text-slate-500">Host: {e.host} · Account: {e.user||'n/a'} · Source: {e.src_ip||'n/a'}</p></div>)}{!evidence.length&&<p className="p-3 text-xs text-slate-400">No source records available for this result. Refresh saved runs or inspect the original file.</p>}<p className="mt-2 break-all text-xs text-slate-500">Source SHA-256: {sourceHash||'Not available in current view'}</p></div>}
      <div className="soc-review-form mt-5"><label className="block text-xs font-bold text-slate-200" htmlFor="soc-review-status">Analyst disposition</label><select id="soc-review-status" className="soc-review-input mt-2 w-full rounded-xl p-2.5 text-sm" value={reviewStatus} onChange={(e:any)=>setReviewStatus(e.target.value)} disabled={!saved}>{[['needs_review','Needs review'],['investigating','Investigating'],['confirmed','Confirmed finding'],['false_positive','False positive'],['escalated','Escalated']].map((x:string[])=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
       <label className="mt-3 block text-xs font-bold text-slate-200" htmlFor="soc-review-note">Analyst note (optional)</label><textarea id="soc-review-note" className="soc-review-input mt-2 w-full rounded-xl p-3 text-sm" rows={3} maxLength={1000} placeholder="What did you verify? Why was it confirmed or dismissed?" value={reviewNote} onChange={(e:any)=>setReviewNote(e.target.value)} disabled={!saved}/>
       <button className="soc-primary mt-3 w-full rounded-xl px-4 py-3 text-xs font-bold" disabled={!saved||!selected.run_id||reviewBusy} onClick={saveReview}>{reviewBusy?'Saving review…':'Save triage decision'}</button>
       {!saved&&<p className="mt-2 text-xs text-slate-400">Synthetic example: sign in and run the fixture to save a real review record.</p>}{reviewMessage&&<p role="status" className="mt-2 text-xs text-cyan-300">{reviewMessage}</p>}
      </div>
      {auditTrail.length>0&&<div className="soc-review-history mt-4 border-t pt-3"><strong className="text-xs text-slate-200">Decision history ({auditTrail.length} shown)</strong><div className="mt-2 flex flex-col gap-2">{auditTrail.map((entry:any)=><div key={entry.id} className="soc-review-kv rounded-lg p-2"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><b className="capitalize text-cyan-300">{entry.status.replace('_',' ')}</b><span className="text-slate-500">{entry.created_at}</span></div>{entry.note&&<p className="mt-1 break-words text-xs text-slate-300">{entry.note}</p>}</div>)}</div><span className="mt-2 block text-xs text-slate-500">Append-only analyst decisions. Original detections remain unchanged.</span></div>}
    </>:<p className="text-sm text-slate-400">Choose a finding from the queue to inspect its explanation, linked logs, and reviewer status.</p>}
   </div>
  </div>
  <p className="mt-4 text-xs text-slate-500">No automated host isolation or external remediation. The demo data is synthetic; stored findings remain analyst-verifiable and are not certified evidence chain-of-custody.</p>
 </SOCPanel>;
}
function SOCCommandDashboard({s,go,openSearch,auth}:any){
 const hasData=!!((s.timeline||[]).length||s.findings.length||s.evidence.length||s.actions.length);
 const [backendDemo,setBackendDemo]=useState<any>(null),[backendSummary,setBackendSummary]=useState<any>(null);
 const [sample,setSample]=useState(!hasData),[range,setRange]=useState('24h'),[severity,setSeverity]=useState('All'),[checked,setChecked]=useState<any>({}),[showAll,setShowAll]=useState(false);
 const timeline=(s.timeline||[]).filter((e:any)=>e.kind==='detection'&&(range==='all'||!Number.isNaN(Date.parse(e.at))&&Date.now()-Date.parse(e.at)<=(range==='24h'?86400000:604800000)));
 const detected=(sample?backendDemo?.alerts:backendSummary?.alerts)||[];
 const backendEvents=detected.map((f:any)=>({id:f.id,at:f.first_seen?new Date(f.first_seen).toLocaleTimeString('en-US',{hour12:false}):'—',title:f.title,severity:f.severity,source:f.rule,asset:f.host}));
 const events=detected.length?backendEvents:(sample?SOC_DEMO_EVENTS:timeline.map((x:any,i:number)=>({id:x.id,at:x.at?new Date(x.at).toLocaleTimeString('en-US',{hour12:false}):'—',title:x.summary||'Detection event',severity:/critical|ransomware/i.test(x.summary)?'Critical':/high|exfil|powershell|credential/i.test(x.summary)?'High':/medium|failed/i.test(x.summary)?'Medium':'Review',source:x.source||'Imported',asset:x.asset||'Unknown'})));
 const sourceItems=detected.length?detected.map((f:any)=>({id:f.id,title:f.title,severity:f.severity,status:(backendSummary?.triage||[]).find((t:any)=>t.run_id===f.run_id&&t.finding_id===f.id)?.status?.replace('_',' ')||'Needs review',owner:'Analyst',time:f.first_seen})):sample?SOC_DEMO_CASES:s.findings.map((f:any,i:number)=>({id:'FIND-'+String(i+1).padStart(3,'0'),title:f.t||'Unnamed finding',severity:f.s>=5?'Critical':f.s>=4?'High':f.s>=3?'Medium':f.s>=1?'Low':'Review',status:f.c==='contained'?'Contained':f.c==='partial'?'Mitigating':'Investigating',owner:'Current analyst',time:'Local case'}));
 const filtered=events.filter((e:any)=>severity==='All'||e.severity===severity);
 const ready=Math.round(checks(s).filter((x:any)=>x.ok).length/Math.max(1,checks(s).length)*100);
 const score=detected.length?detected[0].confidence_score:sample?92:Math.min(100,Math.round(s.findings.reduce((v:number,f:any)=>v+(f.s||0)*(f.c==='contained'?.3:f.c==='partial'?.6:1)*4,0)));
 const counts:any=sample&&!detected.length?{Critical:251,High:996,Medium:1486,Low:749}:{Critical:0,High:0,Medium:0,Low:0};if(detected.length||!sample)events.forEach((e:any)=>{if(counts[e.severity]!==undefined)counts[e.severity]++});
 const bins=Array.from({length:12},()=>0);timeline.forEach((e:any)=>{const ms=Date.parse(e.at);if(Number.isFinite(ms)){const span=range==='24h'?86400000:range==='7d'?604800000:Math.max(604800000,Date.now()-Math.min(...timeline.map((t:any)=>Date.parse(t.at)).filter(Number.isFinite)));const pos=Math.min(11,Math.max(0,Math.floor((1-(Date.now()-ms)/span)*12)));bins[pos]++}});
 const series=sample&&backendDemo?[1,2,3,2,5,4,3,6,5,8,3,1]:sample?[14,20,17,23,28,23,38,45,35,49,52,46,63,70,62,78,71,82]:bins;
 const activeRuns=s.runs.filter((r:any)=>!r.done).length;
 const cards=[
  {label:'Captured detections',value:sample?(backendDemo?String(backendDemo.event_count):'3,482'):String(backendSummary?.events??timeline.length),note:sample?(backendDemo?'Synthetic file events':'Illustrative alert volume'):'Persisted / Hunt detections',icon:'bell',color:'cyan',series:[12,16,13,22,26,20,29,34,28,43,41,50],go:'timeline'},
  {label:'Findings to investigate',value:sample?(backendDemo?String(backendDemo.alerts.length):'217'):String(backendSummary?.high_confidence??s.findings.filter((f:any)=>f.c!=='contained').length),note:sample?(backendDemo?'Rule matches requiring review':'Illustrative findings'):'Heuristic scores ≥ 80',icon:'layers',color:'violet',series:[25,22,32,30,41,35,46,37,54,60,48,59],go:'case'},
  {label:'Top rule score',value:score+'/100',note:sample?'Illustrative risk index':'Derived from case findings',icon:'shield',color:'pink',series:[20,30,24,40,33,45,41,65,60,70,67,83],go:'dash'},
  {label:'Case readiness',value:(sample?92:ready)+'%',note:sample?'Illustrative readiness':'Evidence quality checks',icon:'check',color:'cyan',series:[40,43,46,55,58,62,60,68,76,74,83,89],go:'dash'},
  {label:'Response runs',value:sample?'12':String(activeRuns),note:sample?'Illustrative open runs':'Active playbook executions',icon:'clock',color:'violet',series:[37,29,40,36,43,48,38,53,44,47,55,50],go:'runs'}
 ];
 const suggestions=[
  {key:'investigate',title:'Review the highest-priority case',page:'case',desc:'Validate severity and attach supporting evidence.'},
  {key:'timeline',title:'Reconstruct the incident timeline',page:'timeline',desc:'Compare event timestamps and source records.'},
  {key:'playbooks',title:'Choose a response playbook',page:'playbooks',desc:'Follow versioned investigation and containment steps.'}
 ];
 return <div className="soc-dashboard">
  <div className="soc-top-wave" aria-hidden="true"/>
  <div className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="soc-kicker text-xs font-bold tracking-widest">OPERATIONS OVERVIEW</span><SOCPill tone={sample?'demo':'local'}>{sample?'● Sample data':'● Local workspace'}</SOCPill></div><h1 className="soc-heading text-3xl font-bold tracking-tight text-white md:text-4xl">SOC Command Center</h1><p className="mt-2 text-sm text-slate-400">Investigate events, prioritize findings, and move from signal to evidence.</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="soc-range">Time range</label><select id="soc-range" value={range} onChange={(e:any)=>setRange(e.target.value)} className="soc-picker rounded-xl px-3 py-2.5 text-xs"><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="all">All captured</option></select><button className="soc-action-outline flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold" onClick={()=>setSample(!sample)}>{sample?'View my workspace':'Preview sample data'}</button></div></div>
  {sample&&<div className="soc-demo-banner mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs"><div className="flex items-center gap-2"><SOCIcon name="info" size={17}/><span><b>Synthetic test mode:</b> Kyle fixture and illustrative widgets. No live SIEM or real-time alerts.</span></div><button onClick={()=>{setSample(false);go('hunt')}} className="font-semibold text-cyan-200 underline underline-offset-4">Import real logs</button></div>}
  {!sample&&!hasData&&!backendSummary?.runs&&<div className="soc-demo-banner mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs"><span>No local investigation data yet. Start with a sample log in Threat Hunt, then open a case.</span><button className="font-bold text-cyan-200" onClick={()=>go('hunt')}>Start Threat Hunt →</button></div>}
  <div className="soc-metrics-grid grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">{cards.map((x:any)=><SOCMetric key={x.label} {...x} onClick={()=>go(x.go)}/>)}</div>
  <SOCBackendWorkbench auth={auth} go={go} onDemo={setBackendDemo} onSummary={setBackendSummary}/>
  <div className="soc-dashboard-grid mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
   <SOCPanel title="Threat activity" icon="activity" className="xl:col-span-3" action={<div className="flex items-center gap-2"><SOCPill tone={sample?'demo':'local'}>{sample?'Sample':'Captured'}</SOCPill><button className="soc-text-link text-xs" onClick={()=>go('timeline')}>All events →</button></div>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">Detection timeline · {filtered.length} shown</span><div className="flex flex-wrap gap-1">{['All','Critical','High','Medium','Low'].map((v:string)=><button key={v} onClick={()=>setSeverity(v)} aria-pressed={severity===v} className={'soc-filter '+(severity===v?'soc-filter-active':'')}>{v}</button>)}</div></div>
    <div className="soc-event-list">{filtered.slice(0,showAll?30:5).map((e:any)=><button key={e.id} onClick={()=>go(sample?'hunt':'timeline')} className="soc-event group flex w-full items-start gap-3 py-3 text-left"><span className="soc-event-dot mt-2 shrink-0"/><span className="soc-time min-w-0 shrink-0 pt-1 text-xs text-slate-500">{String(e.at).slice(-8)}</span><span className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">{e.title}</span><span className="text-xs text-slate-500">{e.source} · {e.asset}</span></span><SOCSeverity severity={e.severity}/></button>)}{!filtered.length&&<div className="soc-empty py-12 text-center text-sm text-slate-400">No events match this filter. <button className="text-cyan-300" onClick={()=>setSeverity('All')}>Clear filter</button></div>}</div>
    {filtered.length>5&&<button className="soc-text-link mt-4 text-xs" onClick={()=>setShowAll(x=>!x)}>{showAll?'Show fewer':'Expand events ('+filtered.length+')'} →</button>}
   </SOCPanel>
   <SOCPanel title="Analyst assistant" icon="spark" className="xl:col-span-2" action={<SOCPill tone="local">Rule-based</SOCPill>}>
    <div className="soc-insight rounded-xl p-4"><div className="flex items-start gap-3"><span className="soc-insight-symbol"><SOCIcon name="zap" size={22}/></span><div className="min-w-0"><strong className="text-sm text-white">{detected.length?detected[0].title:sample?'Potential host compromise':s.findings.length?'Findings require analyst review':'Ready to analyze your first alert'}</strong><p className="mt-1 text-xs leading-relaxed text-slate-300">{detected.length?detected[0].explanation:sample?'Example pattern: unusual PowerShell activity alongside possible credential access and outbound communication.':s.findings.length?'Review the source behind each finding, then document the containment decision.':'Import security logs, run detections, and open the event trail to build your investigation.'}</p></div></div></div>
    <div className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Suggested next steps</div><div className="mt-2 flex flex-col gap-1">{suggestions.map((a:any)=><div key={a.key} className="soc-suggestion flex items-start gap-3 rounded-lg p-2.5"><input type="checkbox" id={'soc-step-'+a.key} checked={!!checked[a.key]} onChange={(e:any)=>setChecked((p:any)=>({...p,[a.key]:e.target.checked}))} className="soc-check mt-1"/><label htmlFor={'soc-step-'+a.key} className="min-w-0 flex-1 cursor-pointer"><span className="block text-xs font-semibold text-slate-200">{a.title}</span><span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{a.desc}</span></label><button aria-label={'Open '+a.title} className="soc-text-link mt-1" onClick={()=>go(a.page)}><SOCIcon name="external" size={15}/></button></div>)}</div>
    <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>go('case')} className="soc-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold"><SOCIcon name="zap" size={16}/> Investigate case</button><button className="soc-action-outline rounded-xl px-4 py-3 text-xs font-semibold" onClick={()=>go('playbooks')}>Playbooks</button></div><p className="mt-3 text-xs text-slate-500">Suggestions are rules-based. No autonomous host isolation or remote changes occur.</p>
   </SOCPanel>
  </div>
  <div className="soc-bottom-grid mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
   <SOCPanel title="Investigation queue" icon="folder" className="xl:col-span-5" action={<button className="soc-text-link text-xs" onClick={()=>go('case')}>Open cases →</button>}>
    <div className="soc-table-wrap overflow-x-auto"><table className="soc-table w-full text-left"><thead><tr><th>Case / finding</th><th>Severity</th><th>Status</th><th className="hidden md:table-cell">Owner</th></tr></thead><tbody>{sourceItems.slice(0,5).map((c:any)=><tr onClick={()=>go('case')} key={c.id} className="cursor-pointer"><td><span className="block text-xs text-cyan-300">{c.id}</span><strong className="block max-w-xs truncate text-xs font-semibold text-slate-200">{c.title}</strong></td><td><SOCSeverity severity={c.severity}/></td><td><SOCPill tone={c.status==='Contained'?'success':'local'}>{c.status}</SOCPill></td><td className="hidden text-xs text-slate-400 md:table-cell">{c.owner}</td></tr>)}{!sourceItems.length&&<tr><td colSpan={4} className="py-10 text-center text-xs text-slate-400">No findings yet. Open a case or import detections in Threat Hunt.</td></tr>}</tbody></table></div>
   </SOCPanel>
   <SOCPanel title="Event volume" icon="chart" className="xl:col-span-4" action={<SOCPill tone="local">{range==='24h'?'24 h':range==='7d'?'7 d':'All'}</SOCPill>}><div className="soc-volume-value text-3xl font-bold text-white">{sample?(backendDemo?.event_count??'3,482'):(backendSummary?.events??timeline.length)} <span className="ml-2 text-xs font-normal text-slate-400">detections</span></div><div className="soc-area-chart mt-4"><SOCSpark points={series} height={140} color="violet"/></div><div className="mt-3 flex justify-between text-xs text-slate-500"><span>Start</span><span>Midpoint</span><span>Latest</span></div><p className="mt-3 text-xs text-slate-500">{sample?'Synthetic dataset; not measured telemetry':'Captured records; not a live SIEM rate'}</p></SOCPanel>
   <SOCPanel title="Event severity" icon="filter" className="xl:col-span-3"><SOCDonut counts={counts}/></SOCPanel>
  </div>
  <div className="soc-footer-grid mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
   <SOCPanel title="ATT&CK mapping" icon="layers"><div className="flex items-end justify-between gap-3"><div><strong className="text-3xl text-white">{sample?'84':new Set(s.findings.map((f:any)=>f.th).filter((x:string)=>!!x)).size}</strong><p className="mt-1 text-xs text-slate-400">{sample?'Example coverage (%)':'Mapped tactics'}</p></div><div className="w-1/2"><SOCBars values={[22,30,44,52,68,61,77,86,91,96]}/></div></div><button onClick={()=>go('triage')} className="soc-text-link mt-4 text-xs">Open mapping →</button></SOCPanel>
   <SOCPanel title="Source evidence" icon="database"><strong className="text-3xl text-white">{sample?'19':s.evidence.length}</strong><p className="mt-1 text-xs text-slate-400">{sample?'Example data sources':'Evidence items in case'}</p><div className="soc-progress mt-5"><span style={{width:(sample?86:Math.min(100,s.evidence.length*14))+'%'}}/></div><button onClick={()=>go('case')} className="soc-text-link mt-4 text-xs">Inspect evidence →</button></SOCPanel>
   <SOCPanel title="Case readiness" icon="folder"><strong className="text-3xl text-white">{sample?92:ready}%</strong><p className="mt-1 text-xs text-slate-400">{sample?'Illustrative checklist':'Quality checks completed'}</p><div className="soc-progress mt-5"><span style={{width:(sample?92:ready)+'%'}}/></div><button onClick={()=>go('dash')} className="soc-text-link mt-4 text-xs">Review checklist →</button></SOCPanel>
   <SOCPanel title="Investigation trail" icon="lock"><strong className="text-3xl text-white">{sample?'98':(s.timeline||[]).length}</strong><p className="mt-1 text-xs text-slate-400">{sample?'Illustrative audit status':'Captured events / actions'}</p><div className="soc-trail mt-5 flex items-center justify-between gap-1">{['Import','Inspect','Document','Export'].map((t:string,i:number)=><div key={t} className="flex flex-col items-center gap-1"><span className={'soc-trail-dot '+(i===0||i===1&&timeline.length?'done':'')}><SOCIcon name="check" size={10}/></span><small className="text-xs text-slate-500">{t}</small></div>)}</div><button onClick={()=>go('timeline')} className="soc-text-link mt-4 text-xs">Open timeline →</button></SOCPanel>
  </div>
  <div className="soc-end-note mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs text-slate-500"><span>Built for analyst-led investigation. No simulated metrics are presented as live production data.</span><button onClick={openSearch} className="flex items-center gap-2 text-cyan-300"><SOCIcon name="search" size={14}/> Search workspace <kbd>⌘K</kbd></button></div>
 </div>
}

/* v6: substantive local Threat Intel and guided workflow pages.
 * No remote reputation checks or simulated live threat feeds.
 * Collected indicators are leads: analyst verification is always required.
 */
function SOCCollectIndicators(s:any, pasted:string):any[]{
 const found=new Map<string,any>();
 const ingest=(text:string,source:string,event:any,sourceType:string)=>{
  if(!text)return;
  let parsed:any[]=[];
  try{parsed=extractIocs(String(text).slice(0,7000)).slice(0,100)}catch(_){return}
  parsed.forEach((ioc:any)=>{
   const type=String(ioc.k||'Unknown'),value=String(ioc.t||'').slice(0,256);
   const key=type+'|'+value.toLowerCase();if(!value)return;
   if(!found.has(key))found.set(key,{key,type,value,note:String(ioc.note||''),sources:[],eventIds:[],seen:0});
   const entry=found.get(key);entry.seen++;
   if(entry.sources.length<8&&!entry.sources.some((x:any)=>x.label===source))entry.sources.push({label:sourceType==='scratchpad'?'Analyst scratchpad (unverified)':source,at:event?.at||'',kind:sourceType,eventId:event?.id||''});
   if(event?.id&&!entry.eventIds.includes(event.id)&&entry.eventIds.length<12)entry.eventIds.push(event.id);
  });
 };
 (s.timeline||[]).slice(-100).forEach((ev:any,i:number)=>ingest(ev.raw||ev.summary||'',ev.source||ev.id||('Captured event '+(i+1)),ev,'captured'));
 (s.evidence||[]).filter((x:any)=>x.k==='IOC').slice(-100).forEach((x:any)=>ingest(x.t,x.g||'Existing case evidence',null,'evidence'));
 if(pasted.trim())ingest(pasted,'Local scratchpad',null,'scratchpad');
 return [...found.values()].sort((a,b)=>b.eventIds.length-a.eventIds.length||b.sources.length-a.sources.length||a.value.localeCompare(b.value));
}
function SOCThreatIntel({s,up,go,openEvent}:any){
 const [paste,setPaste]=useState('');const [scanned,setScanned]=useState('');const [query,setQuery]=useState('');const [kind,setKind]=useState('All');const [selectedKey,setSelectedKey]=useState('');const [tab,setTab]=useState('indicators');const [scenario,setScenario]=useState('');const [message,setMessage]=useState('');
 const indicators=React.useMemo(()=>SOCCollectIndicators(s,scanned),[s.timeline,s.evidence,scanned]);
 const types=['All',...new Set(indicators.map((x:any)=>x.type))];
 const filtered=indicators.filter((x:any)=>(kind==='All'||x.type===kind)&&(!query||[x.type,x.value,...x.sources.map((p:any)=>p.label)].join(' ').toLowerCase().includes(query.toLowerCase())));
 const selected=indicators.find((x:any)=>x.key===selectedKey)||filtered[0]||null;
 const stored=(s.evidence||[]).filter((x:any)=>x.k==='IOC');
 const exists=(x:any)=>stored.some((e:any)=>e.t.toLowerCase()===x.value.toLowerCase());
 const selectedScene=SCEN.find((x:any)=>x.n===scenario)||SCEN[0];
 const promote=(x:any)=>{
  if(!x)return;
  if(exists(x)){setMessage('This indicator is already in case evidence.');return}
  const source=x.sources.find((p:any)=>p.kind==='captured')||x.sources[0];
  const label=source?.label||'Local analyst scratchpad';
  up({evidence:[...s.evidence,{k:'IOC',t:x.value,g:'Threat Intel review · '+label}]});
  setMessage('Indicator added as case evidence. Verify its context before using it in a final report.');
 };
 const addScene=()=>{
  const have=new Set(s.findings.map((f:any)=>f.t));
  const news=selectedScene.f.filter((f:any)=>!have.has(f[0])).map((f:any)=>({t:f[0],c:'open',s:f[2]||3,th:f[1],a:[...s.assets]}));
  if(news.length)up({findings:[...s.findings,...news]});
  setMessage(news.length?news.length+' scenario hypotheses added to the case. These are not confirmed detections.':'These hypotheses are already in this case.');
 };
 const exportIntel=()=>{
  const payload={format:'spectacle-local-intel-review',version:1,exportedAt:new Date().toISOString(),scope:'local captured events and case evidence; no external enrichment',indicators:indicators.map((x:any)=>({type:x.type,value:x.value,source_count:x.sources.length,source_event_ids:x.eventIds,sources:x.sources,case_evidence:exists(x)}))};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'spectacle-intel-review.json');
  setMessage('Local indicator report exported. Treat source data as sensitive.');
 };
 return <div className="soc-intel" data-testid="intel-page">
  <header className="soc-intel-hero"><div><div className="soc-intel-eyebrow">INVESTIGATE / LOCAL THREAT INTELLIGENCE</div><h1>Indicator investigation lab</h1><p>Turn captured logs into traceable leads. Inspect sources, triage indicators and attach evidence to the current case—without pretending you have a live reputation feed.</p></div><div className="soc-intel-hero-actions"><span className="soc-intel-badge">Local analysis only</span><button className="soc-intel-primary" onClick={()=>go('hunt')}><SOCIcon name="upload" size={16}/> Import security logs</button></div></header>
  <div className="soc-intel-stats"><div><span>Unique indicators</span><strong data-testid="intel-count">{indicators.length}</strong><small>From local workspace</small></div><div><span>Captured event records</span><strong>{(s.timeline||[]).length}</strong><small>Saved investigation trail</small></div><div><span>Indicators in case</span><strong>{stored.length}</strong><small>Analyst-selected evidence</small></div><div><span>Scenario references</span><strong>{SCEN.length}</strong><small>Educational detection patterns</small></div></div>
  <div className="soc-intel-tabs" role="tablist" aria-label="Threat investigation sections"><button role="tab" aria-selected={tab==='indicators'} onClick={()=>setTab('indicators')} className={tab==='indicators'?'active':''}>Indicator workbench</button><button role="tab" aria-selected={tab==='patterns'} onClick={()=>setTab('patterns')} className={tab==='patterns'?'active':''}>Threat scenarios</button><button role="tab" aria-selected={tab==='method'} onClick={()=>setTab('method')} className={tab==='method'?'active':''}>Analyst method</button></div>
  {message&&<div className="soc-intel-message" role="status"><SOCIcon name="info" size={16}/><span>{message}</span><button onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>}
  {tab==='indicators'&&<>
   <div className="soc-intel-panel soc-intel-capture"><div><h2>Analyze an alert locally</h2><p>Paste a short log excerpt. Its indicators appear in the workbench only after you select Analyze; pasted text is not saved to your case unless you explicitly add an indicator.</p></div><textarea data-testid="intel-input" maxLength={12000} rows={3} aria-label="Log or alert excerpt for indicator extraction" value={paste} onChange={(e:any)=>setPaste(e.target.value)} placeholder="Example: src=203.0.113.20 url=hxxps://example[.]org/login sha256=..."/><div className="soc-intel-capture-actions"><span>{paste.length.toLocaleString()} / 12,000 characters · Do not paste secrets.</span><button className="soc-intel-outline" onClick={()=>{setPaste('');setScanned('');setSelectedKey('');setMessage('Scratchpad cleared.')}}>Clear scratchpad</button><button className="soc-intel-primary" data-testid="intel-analyze" disabled={!paste.trim()} onClick={()=>{setScanned(paste);setSelectedKey('');setMessage('Local extraction finished. Every indicator requires analyst validation.')}}>Analyze text</button></div></div>
   <div className="soc-intel-workgrid"><section className="soc-intel-panel soc-intel-list"><div className="soc-intel-panel-head"><div><h2>Extracted indicators</h2><p>{filtered.length} visible · filter by type or source</p></div><button className="soc-intel-outline" disabled={!indicators.length} onClick={exportIntel}><SOCIcon name="upload" size={15}/> Export JSON</button></div><div className="soc-intel-filters"><input aria-label="Search extracted indicators" value={query} onChange={(e:any)=>setQuery(e.target.value)} placeholder="Search value or event source..."/><select aria-label="Filter indicator type" value={kind} onChange={(e:any)=>{setKind(e.target.value);setSelectedKey('')}}>{types.map((t:string)=><option key={t} value={t}>{t}</option>)}</select></div><div className="soc-intel-indicator-list">{filtered.map((x:any)=><button type="button" data-testid="intel-indicator" key={x.key} aria-pressed={selected?.key===x.key} className={'soc-intel-indicator '+(selected?.key===x.key?'selected':'')} onClick={()=>setSelectedKey(x.key)}><div><span className="soc-intel-type">{x.type}</span>{exists(x)&&<span className="soc-intel-case-tag">In case</span>}</div><strong>{dfg(x.value)}</strong><small>{x.eventIds.length} captured event{ x.eventIds.length===1?'':'s'} · {x.sources.length} source{ x.sources.length===1?'':'s'}</small></button>)}{!filtered.length&&<div className="soc-intel-blank"><SOCIcon name="search" size={24}/><h3>No indicators here yet</h3><p>{indicators.length?'Change your filters.':'Import a log in Threat Hunt or analyze an excerpt above.'}</p><button className="soc-intel-outline" onClick={()=>{setKind('All');setQuery('')}}>Clear filters</button></div>}</div></section>
   <section className="soc-intel-panel soc-intel-detail" aria-live="polite"><div className="soc-intel-panel-head"><div><h2>Source inspection</h2><p>Trace the indicator back to captured evidence</p></div><span className="soc-intel-badge">Not reputation-verified</span></div>{selected?<><div className="soc-intel-focus"><span>{selected.type} · {selected.note||'Pattern match'}</span><strong data-testid="intel-selected-value">{dfg(selected.value)}</strong><p>Presence in logs is not proof of malicious activity. Confirm asset ownership, expected traffic and source integrity.</p></div><div className="soc-intel-detail-actions"><button className="soc-intel-primary" data-testid="intel-add-evidence" disabled={exists(selected)} onClick={()=>promote(selected)}>{exists(selected)?'Already in case':'Add to case evidence'}</button><button className="soc-intel-outline" onClick={()=>copyText(selected.value,(m:string)=>setMessage(m==='Copied'?'Indicator copied.':m))}>Copy value</button><button className="soc-intel-outline" onClick={()=>go('case')}>Open case</button></div><h3>Recorded provenance</h3><div className="soc-intel-provenance">{selected.sources.map((src:any,i:number)=><div key={i}><div><strong>{src.label}</strong><small>{src.kind==='captured'?'Captured log':src.kind==='scratchpad'?'Unsaved scratchpad':'Case evidence'}{src.at?' · '+src.at:''}</small></div>{src.eventId&&<button className="soc-intel-text" onClick={()=>openEvent(src.eventId)}>Inspect event →</button>}</div>)}</div><div className="soc-intel-caveat">This page performs local extraction and correlation only. No IP reputation, WHOIS, passive DNS or external threat-intelligence lookup is being claimed.</div></>:<div className="soc-intel-blank"><SOCIcon name="database" size={25}/><h3>Select an indicator</h3><p>Its source records and case-evidence controls will appear here.</p></div>}</section></div>
  </>}
  {tab==='patterns'&&<div className="soc-intel-patterns"><section className="soc-intel-panel"><div className="soc-intel-panel-head"><div><h2>Detection scenario library</h2><p>Explore common investigation hypotheses—not observed incidents.</p></div><span className="soc-intel-badge">Reference patterns</span></div><div className="soc-intel-scenario-list">{SCEN.map((x:any)=><button className={selectedScene.n===x.n?'active':''} key={x.n} onClick={()=>setScenario(x.n)}><span>{x.tech}</span><strong>{x.n}</strong><small>{x.tac}</small></button>)}</div></section><section className="soc-intel-panel soc-intel-scene"><span className="soc-intel-eyebrow">{selectedScene.tac} · {selectedScene.tech}</span><h2>{selectedScene.n}</h2><p>{selectedScene.sig}</p><h3>What to verify</h3><ol>{selectedScene.f.map((f:any)=><li key={f[0]}><SOCIcon name="check" size={15}/><span>{f[0]}</span></li>)}</ol><div className="soc-intel-detail-actions"><button className="soc-intel-primary" onClick={addScene}>Add hypotheses to case</button><button className="soc-intel-outline" onClick={()=>go('hunt')}>Run Hunt</button>{selectedScene.pb&&<button className="soc-intel-outline" onClick={()=>go('playbooks')}>Open playbooks</button>}</div><p className="soc-intel-caveat">Adding a scenario creates *hypotheses* for an analyst to test; it does not create a verified alert or assert an attacker is present.</p><a className="soc-intel-text" href={'https://attack.mitre.org/techniques/'+selectedScene.tech.replace('.','/')+'/'} target="_blank" rel="noopener noreferrer">Read MITRE ATT&CK reference ↗</a></section></div>}
  {tab==='method'&&<div className="soc-intel-method">{[['01','Capture source','Import or paste a real event. Record source name and event time.','hunt'],['02','Extract, don’t assume','Review IOCs locally; internal IP addresses and common domains may be routine.','threats'],['03','Correlate evidence','Inspect relevant events, related hosts and accounts in the timeline.','timeline'],['04','Make a defensible decision','Attach confirmed observations to the case and document triage decisions.','case'],['05','Report with caveats','Export the incident narrative with unresolved questions and source limitations.','dash']].map((step:any)=><div key={step[0]} className="soc-intel-panel"><span>{step[0]}</span><h3>{step[1]}</h3><p>{step[2]}</p><button className="soc-intel-text" onClick={()=>go(step[3])}>Open workspace step →</button></div>)}</div>}
 </div>
}
function SOCGuidePage({s,go}:any){
 const [opened,setOpened]=useState('');
 const steps=[
  {label:'Collect events',done:(s.timeline||[]).some((x:any)=>x.kind==='detection'&&!!x.raw),page:'hunt',details:'Import JSONL, CSV or Wazuh logs, run a hunt and review matching source events.'},
  {label:'Create a case',done:!!s.name&&s.findings.length>0,page:'case',details:'Define the incident, affected assets and initial findings. Keep hypotheses separate from facts.'},
  {label:'Preserve evidence',done:s.evidence.some((x:any)=>x.g&&x.t&&!/scratchpad|unverified/i.test(x.g)),page:'threats',details:'Extract indicators, verify their context and record provenance in the case.'},
  {label:'Document the response',done:s.actions.some((x:any)=>x.t&&x.b),page:'triage',details:'Assign response actions, capture containment decisions and review any playbook approvals.'},
  {label:'Build the report',done:checks(s).every((x:any)=>x.ok),page:'dash',details:'Resolve case-quality checks, export the narrative and retain evidence separately.'}
 ];
 const done=steps.filter(x=>x.done).length;const next=steps.find(x=>!x.done)||steps[4];
 return <div className="soc-intel soc-guide" data-testid="guide-page"><header className="soc-intel-hero"><div><div className="soc-intel-eyebrow">WORKSPACE / ANALYST FIELD GUIDE</div><h1>From raw alert to defensible report</h1><p>A guided path through Spectacle SOC. Every milestone checks your actual local workspace state rather than pretending the investigation is complete.</p></div><button className="soc-intel-primary" onClick={()=>go(next.page)}>Continue: {next.label} →</button></header><section className="soc-intel-panel soc-guide-progress"><div><strong>{done} / 5 steps completed</strong><p>{done===5?'All workflow checkpoints have been met. Recheck source evidence and your conclusions before closure.':'Next suggested action: '+next.label}</p></div><div className="soc-guide-progress-track"><span style={{width:(done/5*100)+'%'}}/></div></section><div className="soc-guide-grid"><section className="soc-intel-panel"><h2>Investigation checklist</h2><div className="soc-guide-steps">{steps.map((step:any,i:number)=><div key={step.label} className="soc-guide-step"><div className={'soc-guide-step-no '+(step.done?'done':'')}>{step.done?'✓':i+1}</div><div><strong>{step.label}</strong><p>{step.details}</p><button onClick={()=>go(step.page)} className="soc-intel-text">{step.done?'Review':'Start'} this step →</button></div></div>)}</div></section><section className="soc-intel-panel"><h2>Frequently asked questions</h2><p className="soc-guide-intro">The answers below reflect what this build actually does.</p><div className="soc-guide-faq">{[
   ['Is this live monitoring?','No. The workspace analyzes logs you import. The demo uses synthetic events. Neither is a continuously connected SIEM feed.'],
   ['Does the app use AI to make decisions?','The local analyzer uses explicit detection rules and deterministic scoring. Findings are investigative leads, not verified compromise probabilities.'],
   ['Where is my information stored?','Case state and playbook data can be stored in your browser; authenticated API mode persists workspace records in the configured backend. Supabase and Redis are optional and must be configured separately.'],
   ['Are the evidence hashes forensic proof?','No. File hashes can help detect changes to an exported packet, but do not independently establish where the original log came from or whether it was altered before import.'],
   ['What should I do before escalating?','Confirm timestamps, host identities, relevant raw events and business context; document uncertainty and coordinate any containment with authorized responders.'],
   ['Can I run playbooks automatically?','Playbooks are guided, version-pinned analyst workflows. No remote host isolation or destructive action is executed from the dashboard.']
  ].map(([q,a]:string[])=><div key={q}><button aria-expanded={opened===q} onClick={()=>setOpened(opened===q?'':q)}><strong>{q}</strong><SOCIcon name="chevron" size={17}/></button>{opened===q&&<p>{a}</p>}</div>)}</div></section></div><section className="soc-intel-panel soc-guide-warning"><SOCIcon name="lock" size={22}/><div><strong>Handling sensitive investigation material</strong><p>Don’t paste passwords, access tokens or regulated personal data into the scratchpad. Review local storage, cloud configuration, export destinations and analyst permissions before using real organizational logs.</p></div></section></div>
}
function SOCReportAudit({s,go}:any){const c=checks(s);const done=c.filter((x:any)=>x.ok).length;return <section className="soc-intel soc-report-audit" data-testid="report-audit"><div className="soc-intel-panel"><div className="soc-intel-panel-head"><div><span className="soc-intel-eyebrow">REPORT QUALITY GATE</span><h2>Closure readiness · {done}/{c.length} checks satisfied</h2><p>Document the unresolved items before sending a case packet to another analyst.</p></div><button className="soc-intel-outline" onClick={()=>go('case')}>Edit case facts →</button></div><div className="soc-report-checks">{c.map((x:any)=><div key={x.n} className={x.ok?'ok':'pending'}><span>{x.ok?'✓':'!'}</span><strong>{x.n}</strong><small>{x.ok?'Documented':'Needs review'}</small></div>)}</div></div></section>}
