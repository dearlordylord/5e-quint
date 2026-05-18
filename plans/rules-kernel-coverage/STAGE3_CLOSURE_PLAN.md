# Stage 3 Closure Plan

Stage 1 creates the coverage lane. Stage 2 seeds a first-pass baseline. Stage 3
closes the baseline and then makes the lane mandatory for new reducer semantics.

## Goal

Every TS-current reducer semantic obligation is either:

- `covered`;
- `boundary-only`; or
- `unsupported-by-admission`.

No `needs-*` status remains after closure.

## Phase 1: Battle Hole Frontier Audit

- Enumerate every `BattleHole` kind and every fill kind.
- Classify each as semantic frontier, deterministic boundary projection, or
  unsupported/dead branch.
- Split broad `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` into concrete
  obligations, for example target choice, target list, area choice, reaction
  decision, movement route fact, damage disposition, damage type choice, skill
  choice, ability choice, command option, Grapple/Shove outcome, and
  Concentration save.
- Add focused random MBT/QNT parity witnesses where the choice changes reducer
  state or legal next moves. Reserve deterministic replay for fixed boundary
  projections or tiny closed fixtures.

## Phase 2: Battle Surface/Profile Join

- Ensure every executable `plans/unit-profile-coverage/profiles.jsonl` row maps
  to one or more rules-kernel obligations.
- Keep `profile-obligations.jsonl` as the single profile-to-obligation source;
  generated Unit reports and rules-kernel reports must derive profile join
  status from it.
- Ensure every supported Unit evidence row follows:

  ```text
  Unit -> support profile -> rules-kernel obligation -> QNT owner -> parity witness
  ```

- Leave catalog-only or table-detached rows outside the QNT denominator with
  explicit unsupported/boundary dispositions.

## Phase 3: Character Creation Runtime

- Split `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` into obligations
  for supported choice discovery, cardinality, fill validation, atomic batch
  behavior, advancement replacement, Pact Magic progression, invocation choices,
  Weapon Mastery choices, and finalization projection.
- Reuse `character-creation-runtime-slice.qnt` where it already owns the slice.
- Add narrower QNT/replay files only for current TS-supported reducer semantics,
  not for future SRD backlog.

## Phase 4: Character Sheet Runtime

- Split `SHEET.REST_AND_RESOURCE.TRANSITIONS` into HP lifecycle, Short Rest,
  Long Rest, Hit Dice, Spell Slots, Pact Slots, Lay On Hands, Arcane Recovery,
  Weapon Mastery reselection, ritual projection, and Armor Class obligations.
- Keep build-derived capacity facts out of sheet state obligations unless the
  sheet reducer mutates or validates them.

## Phase 5: Character Battle Handoff

- Split `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` into battle init projection,
  Armor Class base-choice forwarding, spellcasting/invocation projection, battle
  HP/condition/spell-slot settlement, and identity/max-HP conflict handling.
- Use deterministic QNT replay only for fixed projection/handoff facts with
  closed, explicitly named cases. Use focused random MBT when reducer sequencing,
  choices, or state interleaving are the risk.

## Phase 6: Tighten The Gate

- Remove merge-acceptable `needs-*` statuses from the checker.
- Add `pnpm rules-kernel-coverage:check` to root `quality` after the baseline
  report has no transitional obligations.
- Update package READMEs to state that new reducer semantics must land with a
  covered rules-kernel obligation.
