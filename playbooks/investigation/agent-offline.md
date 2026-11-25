# Playbook: agent-offline

## 1. Purpose
Decide whether a security agent going silent is a routine outage or someone tampering with it.

## 2. At a glance
- Triggers: Agent disconnected, or no keepalive for 15 minutes. MITRE T1562.001.
- Data needed: Hostname, last keepalive, last logged-in user, network reachability.
- Time budget: 10 minutes

## 3. Before you start
- Check for an approved maintenance window.
- Check whether other agents on the same network segment are also offline.

## 4. Triage
- Many agents offline at once points to the network or the manager, not tampering.
- One agent on a server or an admin workstation is higher priority.

## 5. Investigation steps
1. **Confirm the gap** — last keepalive time and how long the agent has been silent.
2. **Reach the host** — ping it or check the asset inventory to see whether it is powered on.
3. **Maintenance or outage** — match against maintenance windows and known outages.
4. **Tamper check** — look for service stop events and uninstall attempts just before the gap.
5. **Write the report card** — verdict, steps taken, version used.

## 6. Containment
- If tampering is likely, isolate the host using the EDR or the switch port.

## 7. Eradication and recovery
- Restart or reinstall the agent and confirm it reports in.
- Add a monitor so the same gap alerts sooner next time.

## 8. Escalation
- Escalate to the endpoint team if the agent cannot be restored.
- Escalate to the incident commander if service stop events came from a user session.

## 9. Evidence to collect
- Agent manager log around the disconnect.
- Windows service events 7036 and 7045 near the gap.
- Asset owner and location.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Playbook version used

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
