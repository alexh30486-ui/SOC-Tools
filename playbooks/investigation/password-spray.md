# Playbook: password-spray

## 1. Purpose
Determine whether repeated failed logins across multiple accounts reflect credential spraying or normal authentication noise. Do not label an account compromised solely from failures.

## 2. At a glance
- Triggers: Repeated failed logins against multiple distinct accounts from one source over a short time; MITRE T1110.003.
- Data needed: Source IP, target accounts, event timestamps, MFA events, success/failure result, user agent, network and IAM source.
- Time budget: 20 minutes

## 3. Before you start
- Confirm event timestamps and normalize timezones.
- Check existing incidents and any authorized login testing.

## 4. Triage
- High when many identities are targeted and one or more successes follow; medium when failures only without other signals.
- Do not assume the source IP belongs to the attacker; VPNs, corporate proxies, and NAT can group many users.

## 5. Investigation steps
1. **Bound the window** — identify first and last failed attempts and number of distinct accounts.
2. **Compare source and target** — check IP, user agents, tenants and affected accounts for shared patterns.
3. **Look for successful access** — inspect successful sign-ins and MFA/conditional-access results after the failed attempts.
4. **Rule out benign causes** — compare with service account rotations, password expiry, identity-provider outages and approved tests.
5. **Preserve evidence** — link raw event IDs and a timestamped query with counts, redacting credentials.
6. **Decide and document** — record findings, uncertainty and next update time.

## 6. Containment
- If unauthorized access is corroborated, request identity team approval to revoke sessions or disable affected accounts. (needs approval)
- Apply rate limiting or access policies with identity owner review. (needs approval)

## 7. Eradication and recovery
- Review identity lockout policy and MFA coverage.
- Monitor source, targeted accounts, and any new successes.

## 8. Escalation
- Escalate to identity incident response if a suspicious login succeeds after the failures or privileged accounts are targeted.
- Escalate broadly only if the scope and account impact justify it.

## 9. Evidence to collect
- Sign-in failure and success records with event IDs and times.
- MFA challenges and conditional-access decisions.
- Approved maintenance or testing tickets.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Evidence links and independent confirmation
- Playbook version and analyst approval

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
