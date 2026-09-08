# Code Review Rules

Review changed code and the invariants, callers, projections, and acceptance
contracts it can affect. These are mandatory quality gates within that scope.
Read `CLAUDE.md` for repository-wide rules. Report findings with file/line
evidence; do not repeat unchanged reviews or record a checklist transcript.
After fixes, recheck the affected delta and original invariant, expanding scope
when a changed boundary affects adjacent behavior. Converge until no reasonable
findings remain; reject a finding only with a concrete reason. This does not
waive any active specification's review or verification obligations.

## RAW, Identity, And Parity

- Trace changed rules to local SRD 5.2.1 or an explicit RAW ambiguity in
  `ASSUMPTIONS.md`. Flag homebrew, silent interpretation, mixed provenance,
  support labels without executable consequences, and projections stored as
  authored provenance.
- Enforce the authored-identity and PHB+ boundaries in `CLAUDE.md` and
  [authoring policy](../docs/mushroom-playbook/AUTHORING.md). Runtime dispatch
  must use parsed Surface shape, typed procedure facts, and runtime state.
  Support code is not exempt: branching on a record's name, id, or provenance
  is forbidden outside explicitly documented admission boundaries. Unsupported
  mechanics must not be simplified, rebalanced, or replaced with homebrew.
- Locate each changed runtime semantic obligation in
  [obligations.jsonl](../plans/rules-kernel-coverage/obligations.jsonl).
  Review all its `qntOwners` and `parityWitnesses`; for Surface behavior follow
  [profile-obligations.jsonl](../plans/rules-kernel-coverage/profile-obligations.jsonl).
  Missing mappings for changed reducer semantics are findings.
- Use [qnt-owner-roles.jsonl](../plans/rules-kernel-coverage/qnt-owner-roles.jsonl)
  to identify `semantic-core` authorities. Bridges, fixtures, selected-identity
  traces, and proof-only modules are required evidence, not alternate rules
  authorities. There is no whole-battle or package-local aggregation spec;
  deleted roots in Git history are not parity gates.
- Flag runtime/QNT divergence, mapped MBT field changes without relevant parity
  checks, duplicated rule algorithms, and violations of
  [QNT/MBT resource policy](../docs/agents/QNT-MBT.md).

## Types And Failure Boundaries

- Parse external/authored/tool/storage data once at the boundary. Typed callers
  must retain compile-time compatibility, not pass through `unknown`. Carry
  narrowed inputs and outputs forward; do not check a fact then discard its
  type evidence. Reject `any`, raw JSON beyond its decoding boundary, downstream
  revalidation, and
  primitives or broad unions where domain types exist or should exist.
- Domain-valued signatures, maps, IDs, numbers, tags, and phase keys need domain
  types, central constructors, or a documented reason for a primitive. Derive
  fixed unions from typed `as const` arrays; use exhaustive `effect/Match`.
- Every `as T` needs a comment explaining its necessity with locally correct
  evidence, and must be unavoidable by
  a generic, parser, branded constructor, or guard. Brands are erased; never
  claim they distinguish runtime values or justify an unchecked boundary parse.
- Throws/assertions may assert facts already established by types or an
  immediately preceding parser, guard, support gate, or exhaustive match.
  Ordinary lookup, decoding, catalog/readability, unsupported-content, input,
  and session failures must be typed results. A `require*` helper must not
  discover ordinary domain failure from weak input.
- Defensive throws are acceptable in test helpers, CLI/bootstrap code with no
  meaningful typed caller, and exhaustive interpreter/projection harness
  branches only if widening fails to compile or leaves them correct.
- For independent collection validation, accumulate issues with
  `traverseValidation` and the existing issue-list/nonempty-array type. Flag
  fail-fast loops or `Either.all`/monadic sequencing when callers should receive
  every issue. Stop early only for dependencies, mutation/resource ordering,
  or a protocol that requires it.

## State, Domain Names, And Lifetimes

For each changed shape, test whether every field combination is meaningful.
Flag sentinel "not applicable" values, redundant optional/empty states,
booleans with conditionally meaningful fields, jointly optional fields,
unsupported status labels, misleading unions, and impossible provenance,
ownership, support, or phase combinations. Use discriminated unions, nested
records, `Option`, and stronger parser outputs. Unknown, omitted, and empty
must have distinct domain meanings or be unrepresentable.

Carry related facts as one narrowed value. Reject contracts that admit meaningless
combinations or discard correlations established at a boundary.

Name entities for their domain role or contract, not migration history or
implementation flavor. For modifiers such as `current`, `normalized`, `full`,
`promoted`, or `optimized`, require a meaningful modeled opposite at the same
boundary and explain its executable distinction. Split a union whose name
fits only some members. Push APIs, fields, fills, and witnesses to literal and
absurd cases: they must remain domain-plausible, and callers must supply table
facts rather than restate rule constants.

Match each field's lifetime to its owner. Keep creation choices/draft protocol,
durable sheet facts, encounter/rest resources, and audit/provenance distinct.
Ask whether the field remains correct months later and after advancement,
equipment changes, rest, and battle entry/exit. Derive projections from their
canonical source; do not store facts that can drift or retain draft-shaped state
on a durable sheet without a durable workflow that uses it.

## Connascence And Executable Assumptions

For every changed literal, branch, helper, narrowed type, and caller protocol,
ask what must change together and whether that coupling is local and explicit.
Flag distant magic values, positional conventions, duplicated algorithms or
initial state, reinterpreted support facts, and manual caller sequencing.
Prefer named constants/fields, shared algorithms, narrowed values, and single
or state-typed operations. Localize unavoidable strong coupling in a helper
named for the invariant; comments alone cannot enforce it.

If an upstream schema or support gate widens, the consuming algorithm must fail
loudly or remain correct, never silently lose meaning. Enforce cardinality,
ordering, phase, "first", "only", and "supported" assumptions at the semantic
boundary. A named assertion may reify an already-proven type invariant when
future widening could otherwise compile incorrectly; this is not repeated
boundary validation. Remove it only when the algorithm handles all formerly
excluded cases. If a function checks a domain fact, require it in the input,
return its narrowed evidence, or genuinely handle the entire wider type.

## Fixes, Tests, And Hygiene

- Review a fix against the original domain invariant, including lifecycle,
  timing, provenance, and support. New state or continuation paths must compose
  with adjacent procedures, nested reactions, replay/resume, and widening.
  Reject symptom-only fixes, support by omission/convention, duplicate rule
  paths, and newly stale claims in plans, READMEs, assumptions, or support gates.
- Tests must exercise runtime, projection, parity, or boundary decoding rather
  than compiler guarantees. Test the invariant, not just the failing example.
  Normal scenarios need plausible choices/values; legal-but-perverse scenarios
  must explicitly identify the edge case. Recheck plausibility after refactors.
- Every function, type, constant, and export needs a current consumer unless
  future use was explicitly requested. Remove comments that repeat code. Cast justifications must be accurate;
  comments may document unavoidable modeling assumptions only when code cannot
  encode them.
- No `let` for conditional assignment: use a const/ternary, returned record,
  extracted function, or `Either.gen`/`Effect.gen`. Accumulator/builder mutation
  must be local, obvious, and justified by the algorithm.
