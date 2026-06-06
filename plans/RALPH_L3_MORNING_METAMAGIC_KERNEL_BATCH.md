# Ralph Lane: L3 Morning Metamagic And Kernel Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL",
      "status": "done",
      "title": "Map Careful Spell profile to rules-kernel obligations"
    },
    {
      "number": 2,
      "id": "L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED",
      "status": "done",
      "title": "Map Heightened Spell profile to rules-kernel obligations"
    },
    {
      "number": 3,
      "id": "L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED",
      "status": "done",
      "title": "Map Transmuted Spell profile to rules-kernel obligations"
    },
    {
      "number": 4,
      "id": "L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED",
      "status": "done",
      "title": "Map Twinned Spell profile to rules-kernel obligations"
    },
    {
      "number": 5,
      "id": "L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT",
      "status": "done",
      "title": "Audit Antimagic Field QNT proof evidence rows"
    },
    {
      "number": 6,
      "id": "L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY",
      "status": "done",
      "title": "Survey remaining Quickened action-spell procedures"
    },
    {
      "number": 7,
      "id": "L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE",
      "status": "done",
      "title": "Promote next Quickened Spell procedure slice"
    },
    {
      "number": 8,
      "id": "L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY",
      "status": "done",
      "title": "Resolve Heightened repeat-save lifecycle boundary"
    },
    {
      "number": 9,
      "id": "L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY",
      "status": "done",
      "title": "Resolve Distant Extended and Subtle cast-property boundary"
    },
    {
      "number": 10,
      "id": "L3MMETA-10-REROLL-METAMAGIC-BOUNDARY",
      "status": "done",
      "title": "Resolve Empowered and Seeking reroll boundary"
    },
    {
      "number": 11,
      "id": "L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT",
      "status": "done",
      "title": "Audit metamagic selected-identity replay completeness"
    },
    {
      "number": 12,
      "id": "L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION",
      "status": "done",
      "title": "Consolidate metamagic and kernel evidence"
    },
    {
      "number": 13,
      "id": "L3MMETA-13-HEIGHTENED-HIDEOUS-LAUGHTER-REPEAT-SAVE-SLICE",
      "status": "done",
      "title": "Promote Heightened Hideous Laughter repeat-save carry-through"
    },
    {
      "number": 14,
      "id": "L3MMETA-14-HEIGHTENED-AREA-MULTITARGET-REPEAT-SAVE-BOUNDARY",
      "status": "done",
      "title": "Resolve area and multi-target Heightened repeat-save carry-through"
    },
    {
      "number": 15,
      "id": "L3MMETA-15-DISTANT-CAST-RANGE-SLICE",
      "status": "done",
      "title": "Promote first Distant Spell cast-local range slice"
    },
    {
      "number": 16,
      "id": "L3MMETA-16-EXTENDED-CAST-DURATION-CONCENTRATION-SLICE",
      "status": "done",
      "title": "Promote first Extended Spell duration and Concentration slice"
    },
    {
      "number": 17,
      "id": "L3MMETA-17-SUBTLE-CAST-COMPONENT-SLICE",
      "status": "done",
      "title": "Promote first Subtle Spell component projection slice"
    },
    {
      "number": 18,
      "id": "L3MMETA-18-SEEKING-SPELL-ATTACK-REROLL-SLICE",
      "status": "done",
      "title": "Promote first Seeking Spell missed-attack reroll fill"
    },
    {
      "number": 19,
      "id": "L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE",
      "status": "done",
      "title": "Promote first Empowered Spell damage-dice reroll fill"
    },
    {
      "number": 20,
      "id": "L3MMETA-20-HEIGHTENED-GREASE-AREA-REPEAT-SAVE-SLICE",
      "status": "done",
      "title": "Promote Heightened Grease area repeat-save carry-through"
    },
    {
      "number": 21,
      "id": "L3MMETA-21-HEIGHTENED-GUST-OF-WIND-LINE-REPEAT-SAVE-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Heightened Gust of Wind Line repeat-save carry-through"
    },
    {
      "number": 22,
      "id": "L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Heightened multi-target repeating save-gated conditions"
    }
  ]
}
-->

## Objective

Close the post-merge Metamagic/kernel accounting gap and keep expanding
Metamagic only through vertical procedure slices. The overnight Metamagic lane
finished at 2026-06-05T08:36:50Z, about 3h07m before the morning status check,
so this lane has more tasks than the previous seven-task lane.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
83665a61ee9e47e11c88b3f14da9d26472320fe1
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 83665a61ee9e47e11c88b3f14da9d26472320fe1 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL | ready-for-implementation-after-light-research | none | Fix `unit-feature.metamagic-careful-save-protection` rules-kernel join. |
| 2 | L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED | ready-for-implementation-after-light-research | none | Fix `unit-feature.metamagic-heightened-save-disadvantage` rules-kernel join. |
| 3 | L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED | done | none | Fix `unit-feature.metamagic-damage-type-substitution` rules-kernel join. |
| 4 | L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED | done | none | Fix `unit-feature.metamagic-effective-level-extra-target` rules-kernel join. |
| 5 | L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT | done | none | Antimagic action-interdiction and magical-effect-interdiction `.mbt.qnt` owners are explicit MBT-only witnesses, not qnt-proof evidence. |
| 6 | L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY | done | none | Survey selected `spellAttackSequence` as the next runnable Quickened action-spell slice. |
| 7 | L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE | ready-for-implementation-after-light-research | L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY | Promote `spellAttackSequence` through QNT, runtime, MBT, and ledgers. |
| 8 | L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY | done | none | Boundary artifact identifies occurrence-local repeat-save state and the first Heightened Hideous Laughter slice. |
| 9 | L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY | done | none | Boundary artifact splits Distant/Extended/Subtle into distinct cast-local range, duration/Concentration, and component slices. |
| 10 | L3MMETA-10-REROLL-METAMAGIC-BOUNDARY | done | none | Boundary artifact splits Empowered/Seeking into distinct post-roll spell damage dice and missed spell attack reroll fill slices. |
| 11 | L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT | ready-for-implementation-after-light-research | none | Verify every promoted Metamagic profile has selected-identity replay or documented non-applicability. |
| 12 | L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION | done | L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL, L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED, L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED, L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED, L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT, L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT | Regenerated and confirmed metrics. |
| 13 | L3MMETA-13-HEIGHTENED-HIDEOUS-LAUGHTER-REPEAT-SAVE-SLICE | ready-for-implementation-after-light-research | L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY | Promote combatant-owned Heightened repeat-save carry-through for Hideous Laughter. |
| 14 | L3MMETA-14-HEIGHTENED-AREA-MULTITARGET-REPEAT-SAVE-BOUNDARY | done | L3MMETA-13-HEIGHTENED-HIDEOUS-LAUGHTER-REPEAT-SAVE-SLICE | Boundary artifact splits remaining Heightened repeat-save carry-through into Grease area, Gust of Wind Line area, and repeating save-gated condition slices. |
| 15 | L3MMETA-15-DISTANT-CAST-RANGE-SLICE | ready-for-implementation-after-light-research | L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY | Promote generic cast-local range modifier plus one range-bearing Spell Invocation witness. |
| 16 | L3MMETA-16-EXTENDED-CAST-DURATION-CONCENTRATION-SLICE | ready-for-implementation-after-light-research | L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY | Promote generic cast-local duration modifier plus same-occurrence Concentration-maintenance roll-mode rider. |
| 17 | L3MMETA-17-SUBTLE-CAST-COMPONENT-SLICE | ready-for-implementation-after-light-research | L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY | Promote generic cast-local component projection with priced or consumed Material preservation. |
| 18 | L3MMETA-18-SEEKING-SPELL-ATTACK-REROLL-SLICE | ready-for-implementation-after-light-research | L3MMETA-10-REROLL-METAMAGIC-BOUNDARY | Promote typed missed spell attack reroll fill plus one Ray of Frost `spellAttackDamage` witness. |
| 19 | L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE | ready-for-implementation-after-light-research | L3MMETA-10-REROLL-METAMAGIC-BOUNDARY | Promote typed spell damage dice reroll fill plus one single-damage-hole `spellAttackDamage` witness. |
| 20 | L3MMETA-20-HEIGHTENED-GREASE-AREA-REPEAT-SAVE-SLICE | ready-for-implementation-after-light-research | L3MMETA-14-HEIGHTENED-AREA-MULTITARGET-REPEAT-SAVE-BOUNDARY | Promote the first area Heightened repeat-save rider on the Grease ground-hazard occurrence. |
| 21 | L3MMETA-21-HEIGHTENED-GUST-OF-WIND-LINE-REPEAT-SAVE-SLICE | ready-for-implementation-after-light-research | L3MMETA-20-HEIGHTENED-GREASE-AREA-REPEAT-SAVE-SLICE | Promote the Line area Heightened repeat-save rider and preserve it through direction replacement. |
| 22 | L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE | ready-for-implementation-after-light-research | L3MMETA-14-HEIGHTENED-AREA-MULTITARGET-REPEAT-SAVE-BOUNDARY | Promote the combatant-owned presence rider for repeating multi-target `saveGatedCondition` effects. |

## Task Details

### Task 1 - L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL

Map the Careful Spell profile to the existing rules-kernel obligation vocabulary
or document the missing obligation precisely.

### Task 2 - L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED

Map the Heightened Spell profile to the existing rules-kernel obligation
vocabulary or document the missing obligation precisely.

### Task 3 - L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED

Map the Transmuted Spell profile to the existing rules-kernel obligation
vocabulary or document the missing obligation precisely.

### Task 4 - L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED

Map the Twinned Spell profile to the existing rules-kernel obligation vocabulary
or document the missing obligation precisely.

### Task 5 - L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT

Audit whether the Antimagic MBT QNT drivers should contribute proof evidence or
be explicitly classified as MBT-only witnesses.

Audit decision: the Antimagic action-interdiction and magical-effect-interdiction
`.mbt.qnt` drivers remain MBT-only parity witnesses. Ongoing-spell suppression is
the Antimagic profile with current qnt-proof evidence.

### Task 6 - L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY

Survey remaining Quickened action-spell procedures from current supported
profiles and produce one runnable next-slice recommendation.

Survey decision: promote exactly `spellAttackSequence` next. The survey artifact
is `plans/unit-profile-coverage/L3MMETA-06_QUICKENED_REMAINING_ACTION_SPELLS_SURVEY.md`.

### Task 7 - L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE

Promote `spellAttackSequence` as the next Quickened Spell procedure slice.

Recommended scope:

- Change `spellAttackSequenceProfile.metamagicCompatibility` from
  `actionSpellResolverNotRewritten` to `bonusActionRewrite`.
- Add runtime tests for Quickened Eldritch Blast discovery and resolution after
  the Magic Action is spent, including Sorcery Point spend, Bonus Action spend,
  no Magic Action spend, and same-turn level 1+ spell lock behavior.
- Add at least one Spell Slot `spellAttackSequence` case using Scorching Ray to
  confirm Spell Slot spend and same-turn spell-slot accounting.
- Add a selected-identity MBT witness for the promoted procedure, preferably a
  narrow Eldritch Blast literal projection with a leaf-only driver.
- Add a distinct `QuickenedSpellAttackSequenceProcedure` fact or equivalent
  domain-specific procedure fact to the rule-core Quickened support slice.
- Update unit-profile and rules-kernel evidence rows only after runtime and
  parity witnesses exist.

### Task 8 - L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY

Resolve or plan the Heightened repeat-save lifecycle boundary.

Boundary decision: Heightened Spell's "saves against the spell" wording is not
limited to the initial Saving Throw. Repeat-save lifecycles must carry the
cast-selected Heightened target from the Spell Invocation into later Spell
Effect save holes before support can be promoted. The selected roll-mode fact
should be occurrence-local and should not be inferred from authored spell
identity or duplicated as a parallel registry. The boundary artifact is
`plans/unit-profile-coverage/L3MMETA-08_HEIGHTENED_REPEAT_SAVE_BOUNDARY.md`.

### Task 9 - L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY

Resolve or plan Distant, Extended, and Subtle cast-property witnesses.

Boundary decision: Distant, Extended, and Subtle belong to a generic Spell
Invocation cast-property owner, not to authored spell identity or to individual
spell procedure registries. Keep current runtime support closed until typed
cast-local facts exist for range, duration, same-occurrence Concentration
maintenance, and components. The boundary artifact is
`plans/unit-profile-coverage/L3MMETA-09_CAST_PROPERTY_METAMAGIC_BOUNDARY.md`.

### Task 10 - L3MMETA-10-REROLL-METAMAGIC-BOUNDARY

Resolve or plan Empowered and Seeking post-roll reroll fill boundaries.

Boundary decision: Empowered and Seeking belong to post-roll fill owners, not
to cast-time Spell Invocation Metamagic admission. Keep current runtime support
closed until typed fills exist for spell damage dice replacement and missed
spell attack d20 replacement. The boundary artifact is
`plans/unit-profile-coverage/L3MMETA-10_REROLL_METAMAGIC_BOUNDARY.md`.

### Task 11 - L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT

Audit selected-identity replay for promoted Metamagic profiles.

### Task 12 - L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION

Regenerate and verify Metamagic/kernel ledgers after dependencies close.

Consolidation decision: rules-kernel and unit-profile ledgers regenerate without
artifact drift after the dependency set closed.

### Task 13 - L3MMETA-13-HEIGHTENED-HIDEOUS-LAUGHTER-REPEAT-SAVE-SLICE

Promote Heightened repeat-save carry-through for the combatant-owned
Hideous Laughter lifecycle.

Recommended scope:

- Add a presence-only Saving Throw roll-mode rider to the Hideous Laughter
  active-effect occurrence for the selected Heightened target.
- Thread the existing `heightenedSpellTargetId` from the cast selection only to
  decide whether that rider belongs on a failed target's active effect. Do not
  store a duplicate target id on the effect.
- Apply the rider to both end-turn and damage-triggered repeat-save holes, using
  existing Saving Throw Advantage/Disadvantage combination semantics so
  damage-triggered Advantage plus Heightened Disadvantage cancels to normal.
- Update the focused QNT owner and add focused runtime tests for initial failed
  save, end-turn repeat save, and damage-triggered cancellation.
- Add selected-identity MBT evidence and remove `hideousLaughter` from the
  repeat-save Heightened support rejection only after runtime and QNT evidence
  exist.

### Task 14 - L3MMETA-14-HEIGHTENED-AREA-MULTITARGET-REPEAT-SAVE-BOUNDARY

Resolve the remaining Heightened repeat-save carry-through shape for persisted
area and multi-target repeating effects.

Scope after Task 13:

- Decide the occurrence-local selected-target rider shape for
  `greaseGroundHazard`, `gustOfWindLine`, and repeating `saveGatedCondition`
  profiles.
- Keep persisted area occurrence identity separate from authored spell identity.
- For area effects, colocate any selected target id with the area occurrence
  only when the active effect is not combatant-owned and therefore cannot derive
  the target from the owner.
- Leave support gates closed until focused runtime, QNT, and selected-identity
  evidence exist for each promoted profile family.

Boundary decision: area repeat-save effects need an occurrence-local
`heightenedSpellTargetDisadvantage` rider that stores the selected target id
beside the persisted area occurrence. Repeating combatant-owned
`saveGatedCondition` effects should not duplicate the target id and should
carry only a presence rider on the failed target's active effect. The boundary
artifact is
`plans/unit-profile-coverage/L3MMETA-14_HEIGHTENED_AREA_MULTITARGET_REPEAT_SAVE_BOUNDARY.md`.

Follow-up slices:

- `L3MMETA-20-HEIGHTENED-GREASE-AREA-REPEAT-SAVE-SLICE`
- `L3MMETA-21-HEIGHTENED-GUST-OF-WIND-LINE-REPEAT-SAVE-SLICE`
- `L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE`

### Task 15 - L3MMETA-15-DISTANT-CAST-RANGE-SLICE

Promote the first Distant Spell cast-local range slice.

Recommended scope:

- Add a cast-local range modifier fact derived from selected Distant Spell and
  canonical Surface range shape.
- Admit only spells with range of at least 5 feet or Touch range before Sorcery
  Point spending; reject Self and other non-range-bearing shapes.
- Thread the modifier through one narrow target or origin admission owner that
  already consumes typed range facts.
- Do not apply the modifier to area dimensions, light radii, movement
  distances, or movable-effect limits unless that procedure owner explicitly
  consumes the cast-local range fact for its owned SRD rule.
- Add focused runtime tests, focused QNT parity, selected-identity MBT evidence
  after runtime and QNT witnesses exist, and ledger updates only for the
  promoted owner.

### Task 16 - L3MMETA-16-EXTENDED-CAST-DURATION-CONCENTRATION-SLICE

Promote the first Extended Spell duration and Concentration slice.

Recommended scope:

- Add a cast-local duration modifier fact for timed or Concentration durations
  of at least 1 minute, doubled to the 24-hour cap.
- Attach a same-occurrence Concentration-maintenance Saving Throw roll-mode
  rider only when the affected spell requires Concentration.
- Start with one single-occurrence SRD spell owner that already stores an
  executable duration cleanup timer and uses the shared Concentration lifecycle.
- Verify both duration cleanup and Concentration-save roll-mode projection
  before claiming support.
- Add focused runtime tests, focused QNT parity, selected-identity MBT evidence
  after runtime and QNT witnesses exist, and ledger updates only for the
  promoted owner.

### Task 17 - L3MMETA-17-SUBTLE-CAST-COMPONENT-SLICE

Promote the first Subtle Spell cast-local component projection slice.

Recommended scope:

- Parse spell components into suppressible and preserved component facts at the
  Spell Invocation boundary.
- Add a cast-local component projection for selected Subtle Spell: Verbal and
  Somatic are suppressed; Material is suppressed only when it is not consumed
  and has no specified cost.
- Preserve consumed or priced Material requirements and do not mutate authored
  Spell Definition component records.
- Do not infer stealth, audibility, visibility, Counterspell eligibility, or
  hidden-state changes from Subtle alone; future owners may consume the
  component projection where their rules need it.
- Add runtime and QNT witnesses using SRD or synthetic identity-safe fixtures
  before using the projection in any visibility, silence, free-hand, or
  Reaction-spell owner.

### Task 18 - L3MMETA-18-SEEKING-SPELL-ATTACK-REROLL-SLICE

Promote the first Seeking Spell missed-attack reroll fill.

Recommended scope:

- Add a typed missed spell attack reroll fill owned by the pending spell
  Attack Roll continuation, not by cast-time Metamagic admission.
- Start with Ray of Frost through the `spellAttackDamage` profile: an initial
  miss opens the Seeking opportunity, the replacement result is forced, and a
  replacement hit opens the existing damage hole.
- Enforce known option, shared Sorcery Point affordability, the
  different-Metamagic stacking exception, missed-original-roll eligibility, and
  spell-attack-only scope before spending Sorcery Points.
- Keep Scorching Ray and other repeated spell-attack procedures closed until
  invocation-local one-use accounting exists for post-roll rerolls.
- Add focused runtime tests, focused QNT parity, selected-identity MBT evidence
  after runtime and QNT witnesses exist, and ledger updates only for the
  promoted owner.

### Task 19 - L3MMETA-19-EMPOWERED-SPELL-DAMAGE-REROLL-SLICE

Promote the first Empowered Spell damage-dice reroll fill.

Recommended scope:

- Add a typed spell damage dice reroll fill owned by a pending `rolledDice`
  spell damage continuation, pairing each selected original die with its
  forced replacement roll.
- Start with one single-damage-hole `spellAttackDamage` witness, preferably
  Ray of Frost at a character level where the damage has at least two dice.
- Enforce known option, shared Sorcery Point affordability, the
  different-Metamagic stacking exception, Charisma-modifier selected-die limit,
  and forced use of replacement rolls before spending Sorcery Points.
- Keep Scorching Ray, Magic Missile allocation, saving-throw area damage,
  ongoing damage, and multi-hole damage procedures closed until each owner has
  its own post-roll fill witness and invocation-local one-use accounting.
- Add focused runtime tests, focused QNT parity, selected-identity MBT evidence
  after runtime and QNT witnesses exist, and ledger updates only for the
  promoted owner.

### Task 20 - L3MMETA-20-HEIGHTENED-GREASE-AREA-REPEAT-SAVE-SLICE

Promote Heightened repeat-save carry-through for the Grease ground-hazard area
occurrence.

Recommended scope:

- Add an occurrence-local selected-target rider to the `greaseGroundHazard`
  active effect beside `areaId`, `save`, and `expiresAt`.
- Populate the rider only from the cast-selected `heightenedSpellTargetId`;
  do not infer from authored spell id, spell name, or provenance.
- Project Disadvantage only when a later entry or end-turn Grease save is for
  the selected target; preserve ordinary Prone application, movement facts, and
  non-selected target outcomes.
- Update the focused QNT owner before opening runtime support.
- Add focused runtime tests, selected-identity MBT evidence after runtime and
  QNT witnesses exist, and ledger updates only for the promoted Grease owner.

### Task 21 - L3MMETA-21-HEIGHTENED-GUST-OF-WIND-LINE-REPEAT-SAVE-SLICE

Promote Heightened repeat-save carry-through for the Gust of Wind Line area
occurrence.

Recommended scope:

- Add the same area selected-target rider shape to the `gustOfWindLine` active
  effect beside `areaId`, `directionId`, `save`, `pushDistanceFeet`, movement
  cost, and expiration.
- Preserve the rider through Bonus Action direction replacement because the
  replacement changes Line direction, not the selected Heightened target.
- Project Disadvantage only when the later end-turn Line save target matches
  the rider, while validating push and movement facts against the current Line
  occurrence.
- Update the focused QNT owner before opening runtime support.
- Add focused runtime tests, selected-identity MBT evidence after runtime and
  QNT witnesses exist, and ledger updates only for the promoted Gust owner.

### Task 22 - L3MMETA-22-HEIGHTENED-SAVE-GATED-CONDITION-MULTITARGET-REPEAT-SAVE-SLICE

Promote Heightened repeat-save carry-through for repeating multi-target
`saveGatedCondition` effects.

Recommended scope:

- Add a presence-only roll-mode rider to `spellConditionEndTurnSave` active
  effects; do not store a duplicate target id because the active-effect owner
  is already the later save target.
- Populate the rider only on failed targets whose combatant id matched the
  cast-selected `heightenedSpellTargetId`.
- Project Disadvantage only from the rider on later end-turn saves, preserving
  existing condition application and success cleanup behavior for all targets.
- Update the focused QNT owner before opening runtime support.
- Add focused runtime tests, selected-identity MBT evidence after runtime and
  QNT witnesses exist, and ledger updates only for the promoted repeating
  `saveGatedCondition` owner.

## Task Rules

- Do not make bookkeeping tasks claim runtime behavior they do not execute.
- For tasks 1-4, prefer adding or correcting profile-obligation mappings over
  inventing new rule-core slices unless the existing obligation vocabulary is
  genuinely missing.
- For original tasks 6-10, research tasks may output a future plan or explicit
  closure. Among those original tasks, only task 7 is allowed to implement new
  runtime behavior, and only after task 6 identifies a narrow procedure slice.
- Tasks 15-17 are Task 9 follow-up implementation slices. They may promote
  runtime behavior only through their named cast-property owners and only after
  focused runtime, QNT, selected-identity MBT, and ledger evidence exist.
- Tasks 18-19 are Task 10 follow-up implementation slices. They may promote
  runtime behavior only through their named post-roll reroll fill owners and
  only after focused runtime, QNT, selected-identity MBT, and ledger evidence
  exist.
- Tasks 20-22 are Task 14 follow-up implementation slices. They may promote
  Heightened repeat-save behavior only through their named occurrence owners
  and only after focused runtime, QNT, selected-identity MBT, and ledger
  evidence exist.

## Verification

- RAW/ubiquitous-language check: read `.references/srd-5.2.1/Classes/Sorcerer.md`
  and relevant spell passages before modeling Metamagic behavior.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run `pnpm rules-kernel-coverage:check -- --write` and
  `pnpm rules-kernel-coverage:check` for kernel join tasks.
- Run `pnpm unit-profile-coverage:check -- --write` and
  `pnpm unit-profile-coverage:check` for profile/evidence tasks.
- Run focused runtime tests and `pnpm --filter @dnd/battle-runtime typecheck`
  when code changes.
- Run MBT only for completed battle-runtime behavior changes, with the global
  `.ralph/mbt-global.lock`.
