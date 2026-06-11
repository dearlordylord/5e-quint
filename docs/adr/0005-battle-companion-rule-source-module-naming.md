# Battle companion rule modules keep SRD rule-source names; genericity lives in the vocabulary layers

The battle companion cluster is named at two deliberately different levels. The
state vocabulary is generic — `companion-state.ts` defines `BattleCompanion*`
types, and the durable protocol is a familiar-like tag union with no authored
identity. The behavior modules are spell-named — `find-familiar-lifecycle.ts`,
`find-familiar-pact-chain.ts`, `find-familiar-telepathy.ts`,
`find-familiar-state.ts`, the QNT slice `battle-runtime-find-familiar.qnt`, both
MBT witnesses, and the coverage profile `spell.find-familiar-lifecycle` (whose
`runtimeOwners` in `plans/unit-profile-coverage/profiles.jsonl` pin these
paths). A 2026-06-11 architecture review of the companion session admission
branch proposed completing the genericization: rename/split the lifecycle
module into a `companion-lifecycle.ts` (generic transitions) and a casts module,
because the generic `admitCompanionToBattle` lives in a spell-named file and the
module exported a duplicated `FindFamiliar* = BattleCompanion*` type-alias
family.

Decision: keep the SRD rule-source names for the behavior modules; delete only
the duplicated alias family. Temporary dismissal, 30-foot reappearance, zero-HP
disappearance, telepathy, Touch-spell delivery, and the Pact of the Chain attack
exception are Find Familiar spell text (plus its Pact rider) — the module
formalizes that one SRD passage, and the repo's SRD-parity discipline names rule
modules after the rule source they trace to. The QNT slice, the witnesses, and
the coverage registry all share the name; renaming would trade RAW traceability
for consistency with a vocabulary that intentionally lives one layer up (battle
state types, sheet protocol tags), and would force registry churn
(`profiles.jsonl`, `unit-evidence.jsonl`, coverage markers) with no executable
gain. The generic admission operation may live in the spell-named module for as
long as its admission semantics (placement kinds, reappearance identity,
disappearance rules) are Find Familiar RAW generalized only by the protocol
facts it receives.

## Considered options

- **Full rename/split** (`companion-lifecycle.ts` + `find-familiar-casts.ts`,
  profile id rename) — rejected. The battle mechanics trace to the Find
  Familiar SRD passage; the profile registry and QNT/witness corpus pin the
  name; the only consistency gained is with a different layer's vocabulary.
- **Status quo with the dual alias vocabulary** — rejected. Two names for the
  same type (`FindFamiliarState = BattleCompanionState` and seven siblings,
  plus a reverse alias in `companion-state.ts`) is pure noise: ~9 internal use
  sites, zero external consumers. The aliases are deleted; `BattleCompanion*`
  is the single state vocabulary.
- **(Chosen)** spell-named rule modules over the generic `BattleCompanion*`
  state vocabulary, no aliases.

## Consequences

- `find-familiar-lifecycle.ts` and its sibling modules keep their names;
  future architecture reviews should not re-suggest the rename absent the
  revisit trigger below.
- Revisit trigger: a second source rule that contributes genuinely distinct
  battle lifecycle *mechanics* — not merely different protocol facts — e.g.
  Find Steed's mounted-combat protocol. At that point the shared transitions,
  if any survive as shared, move to a protocol-named module driven by the new
  rule's own QNT slice; the split is justified by the new rule text, not by
  naming preference.
- The protocol-tag hoist (review candidate R2, approved separately) is the
  sanctioned home for cross-layer genericity: tags, facts table, constructors,
  and guards in one shared-algebras leaf consumed by sheet, bridge, and battle.
