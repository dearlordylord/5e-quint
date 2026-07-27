# Authored SRD prose policy research

## Question

For publishable SRD 5.2.1 Surface records, should prose fields be exact local
RAW excerpts, or should records avoid verbatim RAW and carry only
source-derived/structured content?

This note evaluates both positions against primary repository evidence. It does
not decide Mushroom/PHB+ expression policy, which already has a separate owner.

## Executive finding

The repository has no evidenced product decision that handwritten SRD summaries
are needed for MCP usability, client usability, licensing, or mechanics
projection.

The current `summary` policy is a late audit design, not an original Surface
requirement:

1. The original Surface prototype introduced a required free-text
   `description` beside structured `mechanics`, but did not define whether it
   was an excerpt or summary ([commit `6d0eeefd4`](https://github.com/dearlordylord/5e-quint/commit/6d0eeefd4),
   [commit `3b94dd303`](https://github.com/dearlordylord/5e-quint/commit/3b94dd303)).
2. The bulk content-survey prompt required honest structured mechanics but gave
   no instruction to copy, summarize, or independently author
   `description` ([prompt at commit `3379ef1179`](https://github.com/dearlordylord/5e-quint/blob/3379ef1179/scripts/content-surface-survey/prompt-template.md)).
3. The first explicit `source-derived summary prose` policy appears in the
   delivery redesign for the corpus audit, where it was made schema-owned to
   avoid a candidate self-admitting through `descriptionKind`
   ([issue #87 resolution](https://github.com/dearlordylord/5e-quint/issues/87#issuecomment-4981443801)).
   That resolution solved audit ownership and safety; it did not establish a
   user need for summaries.
4. [Issue #231](https://github.com/dearlordylord/5e-quint/issues/231) then
   introduced the closed `exact | summary` evidence distinction, implemented in
   [commit `6cb2c0343`](https://github.com/dearlordylord/5e-quint/commit/6cb2c0343).
   [Issue #232](https://github.com/dearlordylord/5e-quint/issues/232) explicitly
   accepted “faithful source-derived summary prose” as one repair option.

The result is a historical hybrid. The current corpus has 599 top-level
`description` values: 349 are already normalized contiguous RAW excerpts and
250 are not. The schemas nevertheless classify all 599 as `summary`. Across
all nested positions there are 616 `summary` observations and 169 `exact`
observations. These counts are reproducible from
`readSurfaceRecords` + `walkDecodedSurfaceRecord` in the production audit and
the schema roles at
[`schema-spell.ts`](../../packages/surface/src/surface/schema-spell.ts#L83-L87)
and
[`schema-nonspell.ts`](../../packages/surface/src/surface/schema-nonspell.ts#L100-L101).

## Position A: publishable SRD prose should always be exact local RAW

### Strongest reasons

1. **Exact copying is licensed here.** The local SRD states that SRD 5.2.1 is
   provided under CC BY 4.0 and may be used as permitted by that license when
   the specified attribution is included
   ([`Legal.md`](../../.references/srd-5.2.1/Legal.md#L1-L7)). The repository
   already carries that attribution
   ([`ATTRIBUTION.md`](../../.references/srd-5.2.1/ATTRIBUTION.md#L1-L11)).
   Therefore SRD licensing supplies no primary-source reason to paraphrase.

2. **Exact evidence has a small, deterministic contract.** The current exact
   check tokenizes candidate and source and requires one contiguous word
   sequence
   ([audit lines 2329–2331](../../scripts/srd521-surface-authored-corpus-audit.cjs#L2329-L2331)).
   This directly answers “did this prose come from its cited local owner?”
   without attempting to infer meaning.

3. **It eliminates paraphrase-created rules choices.** A summary necessarily
   chooses what to omit, combine, reorder, or rename. Those choices can alter
   targeting, conditions, exceptions, timing, or scaling even when every word
   appears somewhere in the source. Exact excerpts do not eliminate excerpt
   selection risk, but they eliminate author-created sentence semantics.

4. **It gives a standalone catalog faithful presentation text.** If a consumer
   must inspect a Surface record without separately joining the local RAW
   corpus, exact excerpts provide authoritative user-facing wording. This is
   the strongest product reason for retaining a `description` field.

5. **It simplifies review and future mutation coverage.** Exactness can be
   checked by source locator plus sequence equality. The current summary
   checker needs stemming, word equivalences, relation windows, typed
   modifier/noun associations, numeric ownership, ordered-clause thresholds,
   and cross-sentence borrowing heuristics
   ([audit lines 1415–1443](../../scripts/srd521-surface-authored-corpus-audit.cjs#L1415-L1443),
   [1570–1795](../../scripts/srd521-surface-authored-corpus-audit.cjs#L1570-L1795),
   [1822–1995](../../scripts/srd521-surface-authored-corpus-audit.cjs#L1822-L1995),
   [2150–2273](../../scripts/srd521-surface-authored-corpus-audit.cjs#L2150-L2273)).

### Limits of this position

- “Exact” must mean a mechanically derived or reviewed excerpt from a precise
  local locator. Hand-copying still permits accidental omissions and stale
  duplicates.
- An exact excerpt does not prove that typed `mechanics` faithfully model the
  excerpt. RAW traceability and runtime/QNT parity remain separate evidence.
- Copying every full rule into every record duplicates the RAW corpus and makes
  the portable artifact larger.
- Exact wording is valid for SRD content, but must not be generalized to PHB+
  or Mushroom content. The Mushroom policy explicitly requires independently
  authored public expression
  ([`docs/mushroom-playbook/AUTHORING.md`](../../docs/mushroom-playbook/AUTHORING.md#L67-L75)).

## Position B: publishable mechanics records should never duplicate RAW prose

The defensible version of this position is not “keep clever paraphrases.”
It is: **store typed mechanics and a precise source reference; obtain prose from
the canonical RAW owner when presentation needs it.**

### Strongest reasons

1. **The Cleanroom Core already contains both RAW and the mechanics slice.**
   The owning glossary says the Core contains licensed RAW and the generated
   Cleanroom Mechanics Slice
   ([`docs/cleanroom/CONTEXT.md`](../../docs/cleanroom/CONTEXT.md#L27-L29)).
   It separately defines that slice as complete structured authored mechanics
   ([lines 43–45](../../docs/cleanroom/CONTEXT.md#L43-L45)). Repeating RAW in
   each mechanics record is therefore redundant for the declared handoff.

2. **The portable Surface boundary is mechanics/catalog integrity, not a second
   RAW corpus.** The Portable Surface Contract accepts the generated aggregate,
   while the complete canonical SRD catalog remains source-side authority
   ([`docs/cleanroom/CONTEXT.md`](../../docs/cleanroom/CONTEXT.md#L91-L96)).
   A source locator can join the structured record to RAW without maintaining a
   third authored statement.

3. **Current MCP behavior does not use Unit descriptions.** Catalog discovery
   returns only Unit `id` and `name`
   ([`content-tools.ts`](../../packages/mcp/src/content-tools.ts#L23-L34),
   [lines 268–285](../../packages/mcp/src/content-tools.ts#L268-L285)).
   Stat Block discovery similarly returns typed attack and defense projections,
   not copied trait/action prose
   ([lines 35–59](../../packages/mcp/src/content-tools.ts#L35-L59)).
   There is no primary code evidence that summaries were introduced for MCP
   token economy or agent comprehension.

4. **Structured mechanics, not prose, are the execution contract.** Surface
   documentation says runtime packages execute reusable domain facts and must
   not recover missing behavior from authored identity. The Cleanroom glossary
   likewise defines Functional Reducers as consuming parsed authored mechanics
   ([`docs/cleanroom/CONTEXT.md`](../../docs/cleanroom/CONTEXT.md#L99-L101)).
   A prose summary is neither a safe reducer input nor evidence that the
   mechanics graph is complete.

5. **The original summaries partly acted as an omission basket.** During the
   early survey, records could preserve a rider in `description` while omitting
   it from structured mechanics; the Fire Bolt survey result states exactly
   that at commit
   [`3379ef1179`](https://github.com/dearlordylord/5e-quint/blob/3379ef1179/scripts/content-surface-survey/results-srd/fire_bolt/result.json).
   The current architecture rejects incomplete mechanics graphs, so that
   historical use is no longer legitimate.

6. **One source removes drift and semantic-audit complexity.** If presentation
   reads RAW through a stable source locator, a source correction cannot leave
   an independently maintained summary stale. It also removes the need to
   decide whether a paraphrase is “semantically close enough.”

### Limits of this position

- A Surface artifact used without the RAW corpus would lose self-contained
  user-facing rule text. That is an owner-level product tradeoff.
- Joining presentation to line/range locators requires stable canonical
  locators or a generated excerpt projection.
- Some strings are themselves rule input or authored expression, not merely a
  record summary. Material component text and Stat Block trait/action prose
  need a deliberate typed/presentation boundary rather than blanket deletion.
- Production still has prose-sensitive Stat Block support classification:
  it searches descriptions for “advantage” and “attack roll”
  ([`statblock-action-execution-support.ts`](../../packages/battle-runtime/src/statblock-action-execution-support.ts#L50-L68))
  and classifies attack riders from description text
  ([`statblock-action-support.ts`](../../packages/battle-runtime/src/statblock-action-support.ts#L299-L316),
  [348–395](../../packages/battle-runtime/src/statblock-action-support.ts#L348-L395)).
  Removing that prose before replacing these checks with typed facts would
  change support behavior.

## What the current `summary` checker actually proves

It is not a semantic equivalence checker.

For a summary-role value, the production audit accepts an exact normalized
substring immediately; otherwise it applies lexical/structural heuristics
([audit lines 2310–2326](../../scripts/srd521-surface-authored-corpus-audit.cjs#L2310-L2326)):

- every meaningful candidate word must have a source stem or one of a small
  explicit equivalences;
- selected domain-word order must match a sufficiently similar source sentence;
- `and`, `or`, `when`, `where`, and `whether` must have locally matching
  neighboring evidence;
- ability/damage-type modifiers must remain near a supported rule noun;
- numbers/dice, units, labels, and numeric sequence order must remain associated
  with a structurally matching source sentence or adjacent pair;
- a long candidate clause must have at least a 0.51 longest-common-subsequence
  ratio to a source sentence;
- exact-vocabulary sentence reorderings and narrow cross-sentence one-for-one
  word swaps are rejected.

It does **not** prove logical equivalence, completeness, negation preservation,
scope, implication, exception equivalence, or that every omitted RAW fact is
present in typed mechanics. Passing means “no implemented heuristic found an
unsupported construction,” not “this sentence means the same thing as RAW.”

## Provenance of the design: fact versus inference

### Established facts

- Free-text `description` predates MCP production and predates the corpus audit.
  It was present in the first isolated Surface prototype
  ([commit `6d0eeefd4`](https://github.com/dearlordylord/5e-quint/commit/6d0eeefd4)).
- The original prototype goal was to exercise structured authoring →
  interpreter/tracer flow, not to define a client prose contract
  ([`CONTENT_SURFACE_PROTOTYPE.md` at that commit](https://github.com/dearlordylord/5e-quint/blob/6d0eeefd4/plans/CONTENT_SURFACE_PROTOTYPE.md)).
- The survey prompt did not define an exact or summary policy.
- The audit redesign explicitly named source-derived summaries only while
  deciding schema ownership and preventing content-side self-admission.
- The exact/summary discriminant landed in #231/#97 on 2026-07-27.
- SRD licensing permits attributed reuse; summary is not a license requirement.
- The current MCP catalog interface does not return Unit descriptions.

### Supported inferences

- The heterogeneous corpus is primarily accidental implementation history:
  early human/agent authors copied some passages and compressed others because
  no prose policy existed.
- Summaries were useful during the prototype as human-readable encoding notes
  and, in some cases, as a place to retain mechanics that the structure did not
  yet express.
- The accepted audit design inherited the existence of summaries and focused on
  how to audit them safely; it did not independently justify keeping them.

### Not established

- No primary source found says summaries exist to optimize MCP tokens, improve a
  React client, satisfy CC BY, or serve runtime mechanics.
- No primary source found says the portable Surface aggregate must be
  independently human-readable without the RAW portion of the Cleanroom Core.
- No primary source found decides whether top-level `description` is durable
  catalog presentation or removable authoring residue.

## Decision matrix

| Policy                                                      | Fidelity                       | Audit complexity                        | Duplicate state       | Standalone display | Current evidence                                                 |
| ----------------------------------------------------------- | ------------------------------ | --------------------------------------- | --------------------- | ------------------ | ---------------------------------------------------------------- |
| Handwritten source-derived summaries                        | Medium and heuristic           | Highest                                 | Yes                   | Concise            | Historical, but no current consumer need found                   |
| Exact excerpt stored in every prose field                   | High expression fidelity       | Low                                     | Yes                   | Best               | Legally allowed; useful only if catalog must carry its own prose |
| Typed mechanics + source locator; presentation joins RAW    | High if mechanics parity holds | Low for prose; mechanics parity remains | No                    | Requires RAW/join  | Best match for declared Cleanroom Core and current MCP           |
| Generated exact excerpt projection outside mechanics source | High                           | Low after locator validation            | Derived, not authored | Best               | Good compromise if standalone presentation is required           |

## Recommendation

Do not retain the current handwritten-summary policy.

Decide the boundary in this order:

1. **Does a Surface/Cleanroom mechanics record need self-contained user-facing
   rules prose?**
   - If **no**, remove top-level `description` from the mechanics slice and
     retain precise RAW locators plus typed mechanics.
   - If **yes**, make the prose an exact excerpt generated or verified from the
     cited local RAW owner. Do not hand-maintain paraphrases.
2. Keep exact authored prose only at boundaries where the expression itself is
   intentionally published, and keep execution on typed facts.
3. Before deleting nested Stat Block prose, replace the current prose-sensitive
   support classification with typed mechanics facts.
4. Keep Mushroom/PHB+ independent-expression policy separate; it is not
   evidence for paraphrasing redistributable SRD text.

Given the current declared Cleanroom Core and MCP behavior, the strongest
evidence favors **typed mechanics + source locator for top-level descriptions**.
If the owner wants the aggregate to double as a standalone rules compendium,
the recommendation changes to **generated exact excerpts**, not summaries.

## Unresolved owner decisions

1. Must the portable Surface aggregate be useful as a standalone human-readable
   rules catalog without the RAW corpus?
2. Is top-level `description` a durable presentation field, or can presentation
   join through provenance/source locators?
3. Which nested prose values are intentional authored expression, and which
   should become typed facts plus an optional generated presentation excerpt?
4. Should the existing summary audit remain temporarily during migration, or
   should the migration be atomic so no new summary can enter?
