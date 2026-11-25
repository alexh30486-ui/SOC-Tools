# Playbook: triage

## 1. Purpose
Give every new alert a severity, an owner and a next step within five minutes.

## 2. At a glance
- Triggers: Any new alert in the queue.
- Data needed: Alert title, source rule, asset, user, time.
- Time budget: 5 minutes

## 3. Before you start
- Check the queue for duplicates of the same alert.
- Open the asset record to see who owns it.

## 4. Triage
- Critical: active attacker behaviour on a server or an admin account.
- High: likely malicious but limited to one host or user.
- Medium: suspicious, needs more context.
- Low: likely benign or informational.

## 5. Investigation steps
1. **Dedupe** — merge with an open case if it is the same activity.
2. **Classify** — pick a severity from section 4.
3. **Pick the playbook** — match the alert to an investigation playbook.
4. **Assign an owner** — one name, and a time for the first update.

## 6. Containment
- Only contain at triage when the alert is critical.

## 7. Eradication and recovery
- None at triage. Hand off to the investigation playbook.

## 8. Escalation
- Page the incident commander for any critical alert.

## 9. Evidence to collect
- Alert ID and raw event.
- Asset owner.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Playbook version used

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
