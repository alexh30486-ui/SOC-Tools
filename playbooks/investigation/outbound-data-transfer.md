# Playbook: outbound-data-transfer

## 1. Purpose
Determine whether an unusually large outbound transfer represents approved business activity or possible data exfiltration.

## 2. At a glance
- Triggers: Spike in outbound bytes, unusual destination, or transfer following bulk file access; MITRE T1041 / T1567.
- Data needed: Netflow/proxy/EDR, transfer byte counts, destination, process, owner, file sensitivity, approval ticket.
- Time budget: 25 minutes

## 3. Before you start
- Record observation window and normal baseline for the host.
- Do not copy sensitive file contents into unapproved systems.

## 4. Triage
- High if destination is unknown, source contains sensitive data, or transfer overlaps suspicious process activity.
- Size alone is insufficient to infer exfiltration; backup, patch, and synchronization traffic are common.

## 5. Investigation steps
1. **Validate the transfer** — confirm byte counts, protocol, destination, user and source device.
2. **Identify process and destination** — correlate DNS, proxy, netflow and EDR records.
3. **Assess data exposure** — determine whether sensitive data was read before transfer without exporting its content.
4. **Check authorization** — compare against scheduled backup, sync, data migration or approved vendor transfer.
5. **Preserve relevant events** — record timestamps, query and source event IDs with hashes where feasible.
6. **Write scoped decision** — separate observed upload from confirmed data loss.

## 6. Containment
- If ongoing unauthorized transfer is supported by evidence, request network or endpoint owner approval to block the specific flow. (needs approval)
- Do not isolate a critical production server without incident command review. (needs approval)

## 7. Eradication and recovery
- Inspect policy gaps and confirm critical data access logging.
- Scope similar transfers from related hosts and accounts.

## 8. Escalation
- Escalate immediately if regulated or proprietary data exposure is substantiated.
- Inform legal/privacy function according to the incident policy; do not claim a reportable breach prematurely.

## 9. Evidence to collect
- Netflow/proxy records and byte totals.
- Process tree and file-access metadata.
- Change ticket or approved transfer request.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Evidence links and independent confirmation
- Playbook version and analyst approval

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
