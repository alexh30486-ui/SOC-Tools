# Playbook: suspicious-powershell

## 1. Purpose
Decide whether a PowerShell command is administration or an attack technique.

## 2. At a glance
- Triggers: Encoded commands (-enc), download cradles (IEX, DownloadString), AMSI-bypass strings, or an Office app starting PowerShell. MITRE T1059.001.
- Data needed: Full command line, parent process, user, host, script block log (event 4104).
- Time budget: 20 minutes

## 3. Before you start
- Decode any base64 command before judging it.
- Check whether the user and host normally run scripts.

## 4. Triage
- Office, a browser or a mail client as the parent process: start at high severity.
- A known admin tool run by an admin in business hours: start at low.

## 5. Investigation steps
1. **Capture the command line** — full text, parent process and user.
2. **Decode and read it** — decode any base64, then say in one line what it does.
3. **Check where it reached** — outbound connections, downloaded files and child processes.
4. **Check the user and host** — does this match their normal work? Ask the user if needed. (needs approval)
5. **Write the report card** — verdict, steps taken, version used.

## 6. Containment
- Isolate the host if the command downloaded or ran unknown code.
- Block the destination domain or IP at the proxy or firewall.

## 7. Eradication and recovery
- Remove dropped files and scheduled tasks created by the script.
- Reset credentials the host could have exposed.

## 8. Escalation
- Escalate to the incident commander when the command reached the internet and ran unknown code.
- Hand off to malware analysis with the decoded script attached.

## 9. Evidence to collect
- Script block log (event 4104) and process creation (event 4688 or Sysmon 1).
- The decoded script text.
- Network connections from the host during the run.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Playbook version used

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
