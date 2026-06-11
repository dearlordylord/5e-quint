# Scenario Outcome Audit

Task: PDS-A19-SCENARIO-OUTCOME-AUDIT

Date: 2026-06-11

## Inputs Checked

- `prd/04_TYPED_WITNESS_PROTOCOL.md` closeout notes.
- `docs/adr/0001-forest-of-qnt-slices.md` addendum.
- `packages/battle-runtime/README.md` witness-protocol authoring notes.
- `UBIQUITOUS_LANGUAGE.md`; this task does not model a new SRD rule, so no
  new RAW passage is required.
- Discovery command:
  `rg -l 'qScenario(Result|InvalidReason)' packages/battle-runtime --glob '*.mbt.qnt' | sort`

Current result: 60 battle-runtime MBT witnesses.

## Decision

All 60 files are typed scenario-outcome migration candidates. No file should be
kept as an explicit `qScenarioResult` / `qScenarioInvalidReason` string.

Reason: every discovered field is witness state consumed by the QNT-to-TS parity
bridge, and many of those values participate in guards or witness-protocol
projection. Even when the vocabulary is local to one witness, the finite set is
already a protocol fact between that witness and its paired driver. Leaving it as
`str` permits impossible outcomes that neither the QNT scenario nor the TS driver
can handle. The migration should keep the vocabulary local, but type it locally.

This does not require promoting local projection vocabulary into a shared
cross-driver type. The right shape is a file-local QNT variant plus the paired
TS literal union/mapping that already owns that witness.

## Migration Shape For A20-A22

Use one shape for all batches:

1. Replace `qScenarioResult: str`, `var qScenarioResult: str`, and
   `qScenarioInvalidReason: str` storage with typed witness state.
2. For local domain outcomes, add a file-local QNT variant such as
   `<WitnessName>ScenarioOutcome` and store it in a field named
   `qScenarioOutcome`.
3. Constructors should be domain-specific, not generic migration names. Keep
   `Init` as the initial-state constructor only inside the file-local outcome
   type; use procedure names for the other constructors.
4. For pure protocol outcomes (`init`, `resolved`, `needsHoles`, `invalid`),
   prefer deriving the driver projection from `protocol.result` and
   `protocol.result.WInvalid(reason)` rather than adding a duplicate outcome
   field.
5. For selected-identity witnesses, extend `selected-identity-witness.ts` once
   to support a variant-tag projection schema, backed by the existing
   `quintVariantTag` helper. Do not add per-driver ad hoc decoders. The TS side
   may map local QNT constructor tags back to the existing TS literal union
   values for comparison.
6. For custom drivers, decode the local QNT variant with `quintVariantTag` and a
   file-local exhaustive map to the existing TS projection type.
7. Remove the `qScenarioResult` / `qScenarioInvalidReason` names during
   migration so the self-discovery command drains to empty.

## Batch Self-Discovery

A20-A22 should use this exact command, taking the first at most 20 paths in
alphabetical order per batch:

```sh
rg -l 'qScenario(Result|InvalidReason)' packages/battle-runtime --glob '*.mbt.qnt' | sort
```

After A22, the command should print no paths. If a later implementer believes a
specific local projection string must remain, they should stop and revise this
audit instead of adding a skip list.

## Quality Gate Recommendation

Add a quality gate after the drain. The gate should reject any remaining
`qScenarioResult` or `qScenarioInvalidReason` occurrence in
`packages/battle-runtime/**/*.mbt.qnt`, using the same discovery pattern above.
This belongs with the existing witness convention checks in
`scripts/check-mbt-driver-closure.cjs`; do not grow the import-closure allowlist.

## Classification

Typed scenario-outcome migration candidates:

- `packages/battle-runtime/battle-runtime-antimagic-field-ongoing-suppression.mbt.qnt`
- `packages/battle-runtime/battle-runtime-attack-spell-shape-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-beam-sequence-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-blur-attack-roll-defense-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
- `packages/battle-runtime/battle-runtime-condition-removal-protection-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-creature-size-change-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-danger-sense-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-dark-ones-blessing.mbt.qnt`
- `packages/battle-runtime/battle-runtime-disciple-of-life.mbt.qnt`
- `packages/battle-runtime/battle-runtime-dispel-magic-ongoing-spell-ending.mbt.qnt`
- `packages/battle-runtime/battle-runtime-dispel-magic-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-dragonborn-breath-weapon.mbt.qnt`
- `packages/battle-runtime/battle-runtime-dragons-breath-granted-action.mbt.qnt`
- `packages/battle-runtime/battle-runtime-dragons-breath-initial-effect.mbt.qnt`
- `packages/battle-runtime/battle-runtime-druid-lands-aid.mbt.qnt`
- `packages/battle-runtime/battle-runtime-druid-wild-shape-form-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-extra-attack.mbt.qnt`
- `packages/battle-runtime/battle-runtime-feature-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-find-familiar-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-fireball-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-gust-of-wind-line-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-heat-metal-object-contact.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hunters-prey.mbt.qnt`
- `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level2-mobility-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-level2-protection-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-levitated-creature-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-lightning-bolt-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-magical-darkness-point-origin-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-mind-spike-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-mycelium-step-feature-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-open-hand-technique.mbt.qnt`
- `packages/battle-runtime/battle-runtime-paladin-sacred-weapon-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-potent-cantrip.mbt.qnt`
- `packages/battle-runtime/battle-runtime-preserve-life.mbt.qnt`
- `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
- `packages/battle-runtime/battle-runtime-ray-of-enfeeblement-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-remarkable-athlete-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-rogue-steady-aim.mbt.qnt`
- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
- `packages/battle-runtime/battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-spike-growth-movement-hazard.mbt.qnt`
- `packages/battle-runtime/battle-runtime-thaumaturgy-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-web-restraint-hazard.mbt.qnt`
- `packages/battle-runtime/monk-martial-arts-selected-identity.mbt.qnt`

Explicit driver projection labels to keep as `qScenario*` strings: none.

## Implementation Notes For Future Batches

- Six witnesses currently use top-level mutable `var qScenarioResult: str`:
  `battle-runtime-interrupt-stack-resume.mbt.qnt`,
  `battle-runtime-spike-growth-movement-hazard.mbt.qnt`,
  `battle-runtime-thaumaturgy-selected-identity.mbt.qnt`,
  `battle-runtime-weapon-mastery-selected-identity.mbt.qnt`,
  `battle-runtime-web-restraint-hazard.mbt.qnt`, and
  `monk-martial-arts-selected-identity.mbt.qnt`.
- Two witnesses currently store `qScenarioInvalidReason: str`:
  `battle-runtime-extra-attack.mbt.qnt` and
  `battle-runtime-hunters-prey.mbt.qnt`. These should collapse to typed
  `WitnessProtocol` invalid reasons unless the paired driver needs a separate
  local outcome fact.
- Many selected-identity witnesses already derive TS unions from literal arrays
  or object keys. Keep those TS unions as the comparison surface; the QNT
  variant tag decoder should feed those existing types instead of creating a
  second TS enum.
