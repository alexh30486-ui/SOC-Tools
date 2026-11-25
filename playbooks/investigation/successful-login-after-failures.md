# Playbook: successful-login-after-failures

## 1. Purpose
Investigate a successful authentication shortly after anomalous failed attempts without assuming the same actor or an account takeover.

## 2. At a glance
- Triggers: Successful sign-in correlated with earlier failed sign-ins for the account or source. MITRE T1078 / T1110.
- Data needed: Sign-in correlation ID, account, IP, device, session, MFA and policy status, timestamps.
- Time budget: 15 minutes

## 3. Before you start
- Preserve source identity and event correlation IDs.
- Check whether account belongs to a privileged identity or service.

## 4. Triage
- High when a privileged identity is involved, the device is unknown, or MFA is bypassed or denied.
- Lower priority if the user confirms legitimate activity and device context matches, but keep the audit trail.

## 5. Investigation steps
1. **Build auth sequence** — correlate failures and success using timestamps and stable identity fields.
2. **Check session context** — compare source IP, device, user agent, location signals and MFA policy outcomes.
3. **Check account changes** — look for role assignments, mailbox rules, new keys and token issuance after sign-in.
4. **Verify with owner** — request out-of-band user confirmation; do not rely only on the active session. (needs approval)
5. **Record evidence** — preserve the sign-in IDs, queries, and any independent confirmation.
6. **Document decision** — mark suspected compromise, benign or unresolved with explicit supporting facts.

## 6. Containment
- If takeover is reasonably indicated, request approval to revoke sessions and reset credentials. (needs approval)
- Escalate if new privileged roles or sensitive access occurred.

## 7. Eradication and recovery
- Confirm the legitimate owner can sign in with fresh credentials.
- Monitor related identities and repeat login attempts.

## 8. Escalation
- Notify incident commander for suspected privileged account takeover or sensitive data access.
- Consult IAM on session invalidation scope.

## 9. Evidence to collect
- Correlated failed and successful sign-in event IDs.
- MFA device registration and token issuance audit records.
- Out-of-band user confirmation with time and channel.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Evidence links and independent confirmation
- Playbook version and analyst approval

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
