# Playbook: account-manipulation

## 1. Purpose
Decide whether a change to an account (new admin, group membership, role or credential change) was authorized.

## 2. At a glance
- Triggers: Windows security events 4728, 4732, 4756 (member added to a group) and 4738 (account changed); cloud admin audit role changes. MITRE T1098.
- Data needed: Actor, target account, group or role, host, source IP, timestamp.
- Time budget: 15 minutes

## 3. Before you start
- Confirm the alert is not a duplicate of an open case.
- Find the change ticket or approval record, if one exists.

## 4. Triage
- A privileged group (Domain Admins, Administrators, cloud admin) means start at high severity.
- A change made outside business hours raises severity one level.

## 5. Investigation steps
1. **Confirm the event** — who changed what, when, and from which host or IP.
2. **Who made the change** — is the actor an admin or service account? Check that actor's recent logins.
3. **Was it approved** — match the change to a ticket or approval record. (needs approval)
4. **Admin group check** — list the members of the affected group now and compare with the last known good list.
5. **Write the report card** — verdict, steps taken, version used.

## 6. Containment
- Remove the unauthorized member or role. Record who did it and when.
- Disable or reset the actor account if it looks hijacked.

## 7. Eradication and recovery
- Rotate credentials for the affected accounts.
- Review other changes by the same actor in the last 7 days.

## 8. Escalation
- Escalate to the identity team lead if a privileged group changed without a ticket.
- Page the incident commander if the actor account shows signs of takeover.

## 9. Evidence to collect
- Raw event with event ID and timestamps.
- Actor logon history, last 24 hours.
- Group membership before and after.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Playbook version used

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
