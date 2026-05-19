# Code Review Rules

Code review agents must check all items below. These are quality gates, not optional style preferences.

## Comments

- No comments that repeat the code. If the code already says what it does, the comment is noise.
- Cast justifications must be technically accurate.
- Comments may document an unavoidable modeling assumption only if the code cannot encode it.

## Dead Code

Every function, type, constant, and export must have a current call site or consumer. No code "for future use" unless explicitly requested.

## Tests

- Do not write tests that only verify compile-time guarantees. If the compiler checks it, a test adds nothing.
- Tests must exercise runtime behavior, projection behavior, parity behavior, or boundary decoding.
- Do not update `qa_generated.qnt` during normal development review.

## SRD And Modeling Parity

For rules behavior, verify that every modeled rule traces to SRD 5.2.1 text in `.references/srd-5.2.1/` or to an explicit entry in `ASSUMPTIONS.md`.

Flag:

- homebrew or "reasonable extension" mechanics not present in the SRD;
- silent interpretation of ambiguous RAW;
- mixed provenance modeled as if it were one source;
- support-status metadata that has no type-system or runtime consequence;
- runtime projection facts stored as authored provenance.

### Authored Identity Dispatch

Reviewers must flag production runtime dispatch on authored identity: ids,
names, slugs, source/provenance sections, page refs, prose labels, or recognizable
official catalog labels. SRD identity is publishable content/provenance, but it
is still not the runtime rule model; use Surface shape, support-profile readers,
typed procedure facts, and explicit runtime state. PHB+ / non-SRD official
content must not copy real official identity into publishable source, tests, or
fixtures at all.

Accept only narrow authored-identity boundaries: Surface catalog/schema/content,
SRD or synthetic tests/fixtures, composition/user-selection identity, true
cross-record references named by the rule, and explicitly documented support
admission boundaries. A support-profile parser or reducer branching on
`spell.name`, `unit.name`, `id`, or `provenance.section` is not allowed merely
because it is in support code.

## Quint And Runtime Parity

Review combat behavior against the authoritative Quint model.

Flag:

- XState or TypeScript behavior that diverges from `battle.qnt` without a corresponding spec change;
- changes to fields mapped by MBT bridges without checking the relevant parity tests;
- duplicated rule logic between Quint, TS, bridge code, and UI that should be shared, derived, or explicitly projected;
- exploratory battle MBT runs that violate the repo's MBT cost rules.

## Type Safety — Cast Review Checklist

For every `as T` cast, verify:

1. A comment explains why the cast is necessary.
2. The evidence supporting the cast is local and correct.
3. A generic type parameter, parser, branded constructor, or type guard could not eliminate the cast.
4. The cast does not hide a boundary parse that should happen once at the edge.

## TypeScript Type-System Terminology

Branded types are compile-time-only constructs and are erased during transpilation.

Flag:

- "branded at runtime";
- cast justifications that imply brands have runtime meaning;
- claims that two differently branded strings differ at runtime.

Correct pattern: "Brands are erased at runtime; both values are `string`, so this cast is safe because ..."

## Assertion And Either Boundaries

Assertions are only for facts that have already been established at compile time or by an immediately preceding parser/type guard/support gate, where a failure means the caller violated an internal invariant. Runtime domain failures, absent lookup results, unsupported authored content, invalid tool input, and user/session state conflicts must be represented with `Either`, `Option`, a parser result, or a precise discriminated union instead of throwing.

Flag:

- functions that throw while parsing, decoding, looking up, or normalizing external/authored/runtime data;
- `require*` helpers that accept weak input and discover ordinary domain failure themselves;
- constructors from primitive values that throw for invalid values instead of exposing a total parse/constructor result;
- support-gate or catalog/readability failures that a caller could report, recover from, or compose with other errors;
- catchable workflow errors modeled as exceptions instead of typed results.

Accept:

- named assertion helpers that check an invariant already proven by the current type, parser, support gate, exhaustive match, or narrowed workflow state;
- defensive throws in test helpers, CLI scripts, and process bootstrap where there is no meaningful typed caller;
- exhaustive-match impossible branches and projection/interpreter harness "unhandled" branches, provided the branch is asserting that the harness has already handled every compile-time-known variant and would fail to compile or stay correct when the union widens.

Required reviewer question:
"Is this throw asserting an already-established compile-time fact, or is it discovering a runtime/domain failure that should be data?"

### Collection Validation

When validating or projecting a collection of independent items into `Either` or other typed error results, reviewers must check whether fail-fast behavior is intentional.

Flag:

- loops over collections that `return Either.left(...)` on the first invalid item when later items can be validated independently;
- `Either.all` or monadic sequencing used where the boundary result already has `issues`, `ReadonlyNonEmptyArray<Issue>`, or multi-error response semantics;
- single-error return types at boundaries whose domain naturally reports a batch, catalog, roster, fill list, option list, or Unit ref set.

Prefer:

- `traverseValidation` for independent per-item validation;
- `ReadonlyNonEmptyArray<Issue>` or existing issue-list result types at domain boundaries;
- preserving fail-fast only when later validation depends on earlier successful values, mutation order, resource consumption, or a protocol step that must stop.

Required reviewer question:
"Are these items independent enough that callers should see every issue, or is there a domain reason to stop at the first failure?"

## State Space Minimality

For every product type, interface, type alias, Schema struct, Quint record, and machine context shape, verify: can every combination of field values occur in practice?

Flag:

- sentinel values such as `""`, `0`, `null`, or `undefined` meaning "not applicable";
- optional fields and empty collections that are second spellings for the same domain state;
- booleans alongside fields only meaningful for one boolean value;
- optional fields that must all be present-or-absent together;
- status enums or metadata labels with no type or runtime consequence;
- union variants whose names lie about part of their members;
- impossible provenance, ownership, support-status, or phase combinations.

Prefer discriminated unions, nested types, `Option`, branded/domain values, or stronger parser outputs that make invalid states unrepresentable.

Optional fields and empty collections must represent distinct domain states. Do not use `undefined` as a second spelling for an empty list. If a type can represent unknown, omitted, and empty, document the domain meaning of each or redesign the type so the invalid distinction is unrepresentable.

## Domain Naming

Avoid contrast names such as `normalized`, `legacy`, `current`, `new`, or `promoted` unless the repo owns the opposite concept at the same boundary and the term is domain-backed.

Prefer names for the rule, source shape, or domain object being modeled, not names that describe migration mechanics or implementation history.

### Counterexample And Absurdity Checks

For every proposed API, type, variant, field, hole, fill, or witness name,
reviewers must actively look for counterexamples and push the design to absurd
cases before accepting it.

Required reviewer questions:

1. What is the meaningful domain opposite of each adjective or modifier in the
   name?
2. Can both the named state and its opposite exist in this model?
3. Does the type system, parser, reducer, or caller protocol treat those states
   differently?
4. If the API is used in the most literal or absurd way its shape permits, does
   it still make common sense?

Flag:

- adjectives with no modeled opposite, such as `measuredDistanceFeet` when
  there is no `unmeasuredDistanceFeet` concept;
- names that sound precise but only describe implementation flavor, provenance,
  UI workflow, or how a caller obtained a value;
- witness/fill shapes that let callers restate rule constants instead of
  supplying only table facts;
- abstractions that remain type-safe but become silly, contradictory, or
  misleading when applied to adjacent RAW cases.

Prefer plain domain nouns when the modifier has no executable consequence. For
example, use `distanceFeet` for a caller-provided distance fact; let the hole
carry the rule's maximum distance and let the reducer compare the two.

## Temporal State And Lifecycle

For every field on a durable type, verify the field's lifetime matches the type's lifetime.

Flag:

- creation-session facts, draft ids, submitted choices, or fill protocol state stored on long-lived character sheets without a durable workflow that uses them;
- current combat/rest state such as current HP, temporary HP, remaining Hit Dice, reactions, turn resources, pending choices, or active effects stored on creation-time or durable identity records;
- ambiguous temporal names such as `current`, `selections`, `source`, `initial`, or `final` when the owner could be read months later and the field's time horizon is unclear;
- derived facts stored beside their source facts when the two can drift after advancement, rest, equipment changes, or runtime effects;
- audit/provenance fields modeled as core executable state, or executable state modeled as provenance.

Required reviewer questions:

1. If this object is read ten months after creation, does the field still mean what its name says?
2. Is this a creation input, durable character fact, authored provenance, runtime projection, or current encounter state?
3. When the character advances, rests, changes equipment, or enters/leaves battle, does this field remain correct, get recomputed, or become stale?

Preferred fixes:

- split creation-session records, durable sheet records, runtime creature state, and audit/provenance metadata into distinct types;
- name fields after durable domain facts rather than the UI action that originally selected them;
- derive replay/draft-shaped views from the durable sheet only at workflows that need draft mechanics again;
- keep temporary/current resources in machine or encounter state, not in character creation output.

## Connascence

Review every changed literal, branch condition, helper boundary, narrowed type, protocol step, and duplicated rule for connascence: code facts that must change together for correctness.

Flag distant or high-degree connascence, especially:

- magic strings/numbers whose validity depends on a separate parser, support gate, schema, spec, bridge, test fixture, or authored content convention;
- tuple/array index assumptions instead of named fields or narrowed tuple types;
- duplicated validation, projection, encoding, decoding, or execution algorithms;
- downstream code manually remembering what an upstream parser, support gate, schema, or type guard already proved;
- caller protocols requiring operations in a specific order when a single API or state-typed API could encode the sequence;
- duplicated default values, initial state, status meanings, sentinel semantics, hole IDs, phase keys, or action names.

Required reviewer questions:

1. What must change together if this line changes?
2. Is that coupling local and obvious, or distant and implicit?
3. Is the coupling weak enough for its distance? If not, require a refactor.

Preferred fixes:

- replace magic values with named constants, literal unions, branded/domain types, or derived values;
- replace positional conventions with records, named fields, or narrowed tuple types;
- centralize duplicated algorithms behind one implementation;
- pass narrowed/domain-specific values forward instead of rechecking or reinterpreting primitives;
- colocate unavoidable strong connascence in one helper/module named after the domain invariant.

Do not accept comments as the only fix when the relationship can be encoded in types, schemas, constants, helper structure, or the Quint model.

### Executable Assumptions

When changed code depends on an assumption for correctness, reviewers must verify that the assumption is executable at the boundary where it matters.

Flag:

- replacing a named assertion, parser, support gate, exhaustive match, or domain helper with code that merely follows a convention;
- code that would keep compiling and running if a future schema/type/support slice widened, but would silently ignore or misinterpret the new meaningful data;
- local algorithms that rely on "only one", "first", "current", "supported", "for now", ordering, cardinality, or phase boundaries without an assertion or exhaustive handling at that algorithm boundary;
- comments that state a correctness precondition while the code does not enforce it.

Accept:

- trusting a type/parser/narrowed value when future widening would make the code fail to compile or when the algorithm would remain semantically correct;
- removing an assertion only when the downstream algorithm now handles all cases the assertion previously excluded;
- keeping a local assertion even when the current type proves the fact, if future widening could otherwise compile and change the meaning silently.

Required reviewer question:
"If the upstream type or support gate admits more meaningful data later, does this line fail loudly, remain correct, or silently drop meaning?"

Preferred fixes:

- keep or add a named assertion at the semantic boundary;
- make the algorithm exhaustive over the widened shape;
- strengthen the domain type so invalid or unsupported shapes are unrepresentable at the call site;
- move the assertion into a helper named after the invariant when several call sites depend on the same assumption.

Examples:

- Parse-don't-validate means parse or narrow once at the boundary and carry the stronger type forward; it does not require hiding the assumptions a downstream algorithm consumes. When an algorithm depends on a cardinality invariant already proven by a narrowed type, reify that dependency at the algorithm boundary with a named helper or assertion rather than anonymous positional access. This is not repeated validation; it makes the compile-time invariant visible at the semantic boundary that must change if the narrowed shape later widens.

Shotgun validation example:

```typescript
// Bad: wide input comes in, the function checks it, but the type system forgets.
function apply(input: Command): State {
  if (input.kind !== "choice") return invalidState();
  return applyChoice(input.optionIds);
}

// Good: pre-narrow when callers must already know the fact.
function apply(input: Command & { readonly kind: "choice" }): State {
  return applyChoice(input.optionIds);
}

// Good: post-narrow when this function discovers the fact.
function accept(
  input: Command,
): Either<Issue, Command & { readonly kind: "choice" }> {
  return input.kind === "choice"
    ? Either.right(input)
    : Either.left(wrongKind());
}
```

If code checks a domain fact internally, either require that fact in the input type, return a narrowed output type that carries the fact, or both. Do not accept wide input, check it, then continue or return with the same wide type unless the remaining algorithm genuinely handles every variant.

## Holistic Fix Requirement

When reviewing a fix made in response to prior review feedback, do not only verify that the cited line changed. Review whether the fix preserves the surrounding domain model, lifecycle, timing, provenance, and support boundary.

For every accepted fix, reviewers must ask:

1. What broader invariant did the original bug violate?
2. Does the fix encode that invariant at the right boundary, or only patch one symptom?
3. Did the fix introduce a new state, continuation, support marker, or timing path?
4. If yes, is that new shape composable with adjacent procedures, nested reactions, replay/resume flows, and future widening?
5. Are tests exercising the invariant, not just the originally failing example?

Flag fixes that:

- solve one test while bypassing the modeled procedure lifecycle;
- add support by omission, optional markers, or convention instead of an explicit typed boundary;
- create a second path for the same domain rule without explaining why both paths must exist;
- make future widening silently wrong rather than failing loudly;
- update runtime behavior without checking whether the plan, README, assumptions, and support gates now overclaim.

Prefer the smallest holistic correction that restores the domain invariant. Do not suggest line-local patches when the issue is really a lifecycle, timing, provenance, or support-boundary problem.

## Boundary Typing

All data crossing system boundaries must be parsed or decoded at the boundary and represented with precise domain types afterward.

Flag:

- `any`, untyped JSON access, or raw external data beyond the boundary;
- typed internal callers forced through an `unknown` parameter, erasing compile-time compatibility that should be checked at the call site;
- passing weak `string`, `number`, or broad union values deeper after a stronger fact has been established;
- validation repeated downstream instead of parsing once and carrying the parsed type;
- authored Surface data, runtime projection data, and provenance collapsed into one type or field.

Pattern: split raw boundary parsing from typed core logic.

```typescript
function f(input: Wider): Narrower {
  return narrow(input);
}

function fRaw(input: unknown): Either.Either<Narrower, ParseIssue> {
  const parsed = parseToWider(input);
  return Either.isLeft(parsed)
    ? Either.left(parsed.left)
    : Either.right(f(parsed.right));
}
```

Known typed callers call `f`, not `fRaw`; only JSON/tool/user/storage/wire boundaries and parser rejection tests call `fRaw`.

## No Bare Primitives For Domain Values

Function signatures and type definitions must not use bare `string`, `number`, or `boolean` where a domain-specific type, literal union, branded type, or alias exists or should exist.

Symptoms to flag:

- `(x: DomainType): string` where the return value has domain meaning;
- `ReadonlyMap<string, string>` where keys or values have known domains;
- numeric fields that represent HP, AC, spell slot level, phase index, die size, count, range, or action economy without a domain type or documented reason;
- string literals for hole IDs, subject tags, unit IDs, action names, condition names, damage types, or phase keys outside a central constructor/helper;
- type-narrowing helpers that accept primitives after a boundary parser could have produced the stronger type.

## Immutability

No `let` for conditional assignment. Use:

- `const` with a ternary for single-variable branches;
- a destructured struct or extracted function for multi-variable branches;
- `Either.gen` / `Effect.gen` when a branch needs monadic computation.

Legitimate mutation for accumulators or builder patterns must be local, obvious, and justified by the surrounding algorithm.
