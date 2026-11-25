# Playbook: backend-5xx-stability

## 1. Purpose
Separate operational HTTP 5xx errors from potentially security-related degradation; stabilize the service before declaring an attack.

## 2. At a glance
- Triggers: Elevated HTTP 5xx rates, service crashes, or backend timeouts. Operational reliability signal; not automatically a security detection.
- Data needed: HTTP status histograms, deployment changes, traces, upstream errors, resource metrics, request volume.
- Time budget: 15 minutes

## 3. Before you start
- Confirm scope, customer impact and expected baseline.
- Check recent deployments and incident tickets first.

## 4. Triage
- Escalate availability impact by service criticality and user-facing error budget.
- Do not classify 5xx errors as an intrusion without corroborating malicious indicators.

## 5. Investigation steps
1. **Quantify impact** — calculate 5xx numerator/denominator and affected routes over the same time window.
2. **Compare dependency health** — inspect database, queues, network, saturation and retries.
3. **Inspect recent changes** — compare deployment and feature-flag changes with onset.
4. **Check abuse signals** — rate spikes, anomalous auth failures or suspicious request paths only when supported.
5. **Preserve traces** — link sampled errors, correlation IDs and change history; remove secrets and PII.
6. **Choose response** — write a remediation hypothesis, owner, next update and security classification.

## 6. Containment
- Rollback or disable risky features only with service owner approval. (needs approval)
- Apply temporary rate controls with site reliability review. (needs approval)

## 7. Eradication and recovery
- Restore error budget, confirm with synthetic and customer-facing probes.
- Add regression tests and a post-incident review.

## 8. Escalation
- Page on-call SRE for material user impact or prolonged SLO breach.
- Escalate to SOC only when there are independent signs of malicious activity.

## 9. Evidence to collect
- Error-rate and latency charts for matching windows.
- Correlated traces, deployment IDs and dependency metrics.
- Change approvals and post-incident timeline.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Evidence links and independent confirmation
- Playbook version and analyst approval

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
