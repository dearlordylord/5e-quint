---
name: prepare-pr-review
description: Prepare or update this project's human-facing PR reviews, coordinating independent review and reproductions into one current report for acceptance decisions.
---

# Prepare PR review

Give the operator enough evidence and explanation to decide what to change,
accept, defer, or discuss. Apply the project's
[review rules](../../../.claude/review-rules.md); they own defect analysis and
quality standards. This skill owns review coordination and presentation.

## Establish the review

Find the requested PRs, comparison base, checked heads, original issues, and
existing reports and evidence. Use the existing review entrypoint and artifact
location when present; keep new material private unless publication is requested.
Preserve any deliverables required by another explicitly selected review workflow.

Distinguish fresh review, evidence gathering, explanation changes, and presentation
changes. For explanation changes, reuse applicable evidence and identify its
checked revision. For presentation-only work, check the changed surfaces and
links; retain the existing conclusions and evidence. Claims about current branch
state need current evidence; captured metadata describes its capture time. An unavailable artifact is a limitation,
not an empty result.

Proceed once each PR has an identified comparison and evidence inventory, or
an explicit limit on what can be reviewed. Keep code fixes, publication, merging,
and broad verification within the user's separately authorized scope.

## Investigate and prove

For fresh code review, invoke `$code-review` from the available skills. Supply
the pinned comparison, originating issue/spec, project standards, and
[issue-tracker workflow](../../../docs/agents/issue-tracker.md). Its independent
Standards and Spec reviews own the initial code findings. Retain their separate
outputs and ordering; attach proof dispositions without merging or reranking
the axes. Reuse those outputs for explanation-only updates when inputs are
unchanged. If the skill is unavailable, report the missing dependency.

Assign an independent reproduction role using the
user's chosen models or the environment's available agents. When delegation is
unavailable, perform separate review and proof passes and report the lack of an
independent reviewer. State any unavailable explicitly requested model rather
than silently substituting one.

When independent PR analysis benefits from delegation, assign bounded groups
with separate artifact ownership. Pass checked revisions, source and evidence
paths, the requested scope, and verification limits. The integrator owns synthesis and acceptance of the combined report.
Follow the project's [verification instructions](../../../docs/agents/verification.md)
when executing proofs and its [QNT/MBT limits](../../../docs/agents/QNT-MBT.md)
for formal or model-based checks. Preserve a requested close review loop.

Treat reviewer findings as leads. For a claimed gameplay or user-visible defect,
seek a focused reproduction through the supported boundary and an appropriate
working control. Retain the command, revision, observed result, and artifacts.
An internal function result proves that result; persistence, display, and later
runtime effects require their own evidence. A bug-reproducing test passing means
it observed the asserted defect.

Apply the review rules to establish cause, affected consumers, correction scope,
and introduced versus inherited behavior. Keep source-backed structural findings,
explicitly deferred scope, coverage gaps, and unresolved leads distinct from
reproduced failures. Preserve uncertainty about origin or reach where evidence
ends. A symptom reproduction alone does not qualify a proposed shared fix.

## Explain the PR, then its problems

The report has two distinct parts, in this order.

**Explanation** gives the operator a design to understand and react to: what
changes for the player or caller, one situation before and after, the chosen
interface and data ownership, meaningful alternatives/tradeoffs, assumptions,
and intended scope. Put unresolved RAW or product decisions here with their
options, consequences, and recommendation. Include choices already made by the
author when accepting the design would endorse them. Make pending operator
choices explicit. Use only the elements relevant to that PR.

**Problems** presents the Standards and Spec findings, supported by evidence and
proof dispositions. For each substantial finding connect the concrete situation,
expected/observed results and consequence; cause and demonstrated/unexamined
reach; recommended correction, placement and acceptance impact. Link to the
related design decision instead of mixing its discussion into the defect list.
Keep exact file/line or commit links accessible.

Distinguish intended behavior from behavior confirmed by the review. Preserve
original PR titles unless the operator asks to rewrite them; choose explanation
language from the task. Make the corresponding GitHub PR readily accessible
from its review context, without searching or guessing. Keep source-PR navigation
distinguishable from local report navigation; choose placement to fit the report.

Correctness fixes are fixes; reserve “nit” for minor presentation or style.
Explain technical terms where used, including in detailed evidence. Link scripts
and logs for exact mechanics; their interpretation must remain understandable.
Match wording to the observation: missing roll instructions are not an observed
dice roll, and accepted input is not proof of a later state change.

Raise a RAW decision only when relevant local passages leave a genuine question.
Show the exact question, plausible readings, concrete consequences, and your
recommendation. Internal scheduling, model coverage gaps, and deferred implementation
do not by themselves create rules ambiguity. Product choices such as save
compatibility need their own explanation and alternatives. Ask the operator when
a material unresolved choice blocks a conclusion or dependent action; otherwise
proceed with the evidence and recommendation. A batch report may retain the
question as pending for the planned joint review.

For partial acceptance, compare the remaining work with the originating issue
and captured closing directives. Recommend removing an automatic issue close or
linking a follow-up before merge when deferred work would otherwise lose tracking.
Keep this a recommendation until the corresponding mutation is authorized.

## Maintain one current report

Update existing summaries, cards, detailed explanations, and next-step tables
consistently. Replace superseded recommendations in place. Keep useful evidence
accessible with its revision and limits; preserve scripts, logs, and machine
results when only rewriting their explanation. Choose a format that fits the
existing report; HTML, a new index, and a separate archive are not prerequisites.

When independent review is available, use it for substantial new findings or
changed interpretations of evidence; otherwise disclose that limitation.
Compare explanations against the underlying artifacts, including rejected leads,
existing measurements, controls, and exact observations. Resolve findings and
recheck the affected delta until no reasonable findings remain. Expensive
verification is governed by the project's existing obligations, not by a report
rewrite or another review round.

Finish when the human-facing surfaces agree, every reported finding has a clear
disposition and evidence limit, actionable decisions include a recommendation,
and evidence links resolve. For regenerated reports, check that regeneration
preserves the current conclusions and existing navigation. For an HTML report,
open the rendered result and exercise the reader's path: understand the change
and its design choices before encountering the defect list,
open its GitHub PR, return to the explanation, and expand its details. Check
the report's existing entrypoint and a newly added review. Mark any unavailable
visual or interaction check explicitly.

When creating or materially changing this workflow, forward-test it with an
independent agent given a realistic request, raw inputs, and an approved example.
Withhold the expected findings and finished answer. Inspect its actual output
against the reader's path above, repair demonstrated gaps, and recheck the delta.
Report what was
reviewed or rerun and what remains unverified; review completion is distinct from
merge or release qualification.
