# Playbook: agent-decision-review

## 1. Purpose
Review a proposed AI-assisted SOC action against observed evidence and authorization policy before an analyst can accept it.

## 2. At a glance
- Triggers: Any suggestion produced by an LLM or LoRA agent, especially when it requests external actions or asserts a verdict.
- Data needed: Model identifier, adapter version, input evidence refs, proposed tool and arguments, user scope, result/trace.
- Time budget: 5 minutes

## 3. Before you start
- Keep model-generated reasoning as a hypothesis only.
- Require data minimization: do not feed secrets or personal data into an unapproved endpoint.

## 4. Triage
- Any destructive change, account lock, outbound notification, or containment requires an authorized human.
- Reject claims that cite missing evidence or tools outside allowlist.

## 5. Investigation steps
1. **Check source grounding** — every claim must reference a real case event or evidence ID.
2. **Validate tool call** — check allowed tool name, typed arguments, tenant scope, and read-only versus state change.
3. **Compare baseline** — ask whether deterministic rules or a standard playbook reach the same decision.
4. **Request approval for effects** — obtain human sign-off for containment, blocking, account reset or external submission. (needs approval)
5. **Capture trace** — record model/adapter IDs, tool results, timing, confidence limitations and decision.
6. **Escalate uncertainty** — prefer undetermined over inventing a verdict.

## 6. Containment
- Never execute a model-suggested destructive response automatically. (needs approval)

## 7. Eradication and recovery
- Rollback only through approved operational change processes.
- Include false positives in offline evaluation after redaction and authorization.

## 8. Escalation
- Escalate to SOC lead for policy-bypassing model output or unsupported critical finding.
- Escalate adapter regressions to ML owner before enabling in production.

## 9. Evidence to collect
- Prompt/response identifiers with sensitive values redacted.
- Source evidence IDs, tool name/arguments and observed outputs.
- Approval record and model/adapter version.

## 10. Report card
- Verdict: true positive, benign, escalated or undetermined
- Steps completed, steps stalled, time taken
- Evidence links and independent confirmation
- Playbook version and analyst approval

## 11. Settings
- version: 1
- owner: soc
- review_every_days: 90
