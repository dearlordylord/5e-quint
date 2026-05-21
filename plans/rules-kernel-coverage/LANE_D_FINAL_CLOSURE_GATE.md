# Lane D Final Closure Gate

Generated for `RKBC-FINAL-COVERAGE-CLOSURE-GATE`.

This gate refreshed the rules-kernel and Unit profile coverage reports without
adding new rule behavior. No RAW rule was modeled or reinterpreted in this task;
the SRD/ubiquitous-language check is therefore limited to confirming that the
remaining rows are coverage and profile-join obligations over already-authored
runtime surfaces, not new mechanics claims.

## Refreshed Snapshot

- Rules-kernel obligations: 72 total; 60 covered; 7 open transitional; 5
  boundary or unsupported.
- Rules-kernel open statuses: 6 `needs-parity-witness`; 1
  `needs-surface-evidence`.
- Installed Unit inventory: 224 Units.
- Unit profile coverage: 118 profiles; 97 rules-kernel-covered profiles; 7
  mapped-open profiles; 14 unmapped profiles.
- Supported Unit rules-kernel chain coverage: 119/135 covered; 7 mapped-open
  Units; 9 unmapped Units.

## Closure Decision

Lane D is not closed at the rules-kernel gate. The remaining gaps are explicit
nonfeature follow-ups: each should add coverage evidence, profile-join evidence,
or a precise unsupported/boundary closure. They must not widen runtime behavior
unless a future plan deliberately promotes a separate feature slice.

## Nonfeature Follow-Ups

| Follow-up | Blocking obligation | Required output |
| --- | --- | --- |
| `RKBC-NONFEATURE-DIRECT-CONDITION-LIFECYCLE-WITNESS` | `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE` | Add focused parity witness ownership for direct spell-owned condition application, cleanup, duration expiry, and target-action early ending, or split unsupported branches into boundary rows. |
| `RKBC-NONFEATURE-SAVE-GATED-ATTACK-ADVANTAGE-WITNESS` | `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | Add focused parity witness ownership for failed-save attack-roll Advantage active effects from save outcome through attack-roll projection. |
| `RKBC-NONFEATURE-MOONBEAM-MOVABLE-ZONE-WITNESS` | `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE` | Add focused parity witness ownership for current Moonbeam movable-zone lifecycle semantics, or split any shapechanging rider that is outside current runtime support. |
| `RKBC-NONFEATURE-CREATURE-TYPE-PROTECTION-WITNESS` | `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` | Add focused parity witness ownership for creature-type protection, prevention, and relevant-effect Saving Throw Advantage. |
| `RKBC-NONFEATURE-CONDITION-IMMUNITY-THP-WITNESS` | `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS` | Add focused parity witness ownership for condition immunity with start-turn Temporary Hit Point refresh and cleanup. |
| `RKBC-NONFEATURE-CONDITION-REMOVAL-PROTECTION-WITNESS` | `BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION` | Add focused parity witness ownership for direct condition removal and poison protection semantics beyond the selected-identity evidence already recorded for Unit replay. |
| `RKBC-NONFEATURE-SURFACE-PROFILE-JOIN-EVIDENCE` | `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | Prove every currently admitted executable battle Surface profile points to a covered rules-kernel semantic obligation, or record explicit non-runtime/boundary dispositions. |

## Unit Profile Join Gaps

The mapped-open Unit rows are blocked by the rules-kernel follow-ups above:
`animal_friendship`, `faerie_fire`, `heroism`, `invisibility`,
`lesser_restoration`, `protection_from_evil_and_good`, and
`protection_from_poison`.

The unmapped supported Unit rows require profile-obligation join decisions:
`bard_jack_of_all_trades`, `cleric_channel_divinity`, `cleric_divine_order`,
`druid_primal_order`, `heat_metal`, `monk_uncanny_metabolism`,
`ranger_deft_explorer`, `rogue_expertise`, and `wizard_scholar`.

The profile-level unmapped rows are listed in
`plans/unit-profile-coverage/UNIT_REPORT.md` under "Rules-Kernel Profile Join
Gaps". Their next step is a profile-obligation mapping or a precise
non-runtime/boundary disposition, not opportunistic runtime implementation in
this lane.

## Verification

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`

Battle MBT was not run because this task changed coverage planning artifacts
only and did not change promoted Quint or runtime behavior.
