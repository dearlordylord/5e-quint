# Rules Kernel Coverage Report

Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `profile-obligations.jsonl`, and `KERNEL-COVERAGE` source markers.

## Summary

- Total obligations: 15
- Covered obligations: 7
- Open transitional obligations: 6
- Boundary or unsupported obligations: 2

| Status | Count |
| --- | ---: |
| covered | 7 |
| needs-qnt-owner | 4 |
| needs-parity-witness | 1 |
| needs-surface-evidence | 1 |
| boundary-only | 1 |
| unsupported-by-admission | 1 |

| Runtime | Count |
| --- | ---: |
| shared-algebras | 1 |
| battle | 9 |
| character-creation | 2 |
| character-sheet | 2 |
| character-battle | 1 |

## Obligations

| Obligation | Runtime | Status | Profiles |
| --- | --- | --- | --- |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | battle | covered |  |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | battle | covered | `unit-feature.reaction-roll-or-damage-reduction`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `unit-feature.alternate-action-cost`, `unit-feature.action-surge-resource`, `unit-feature.attack-damage-rider`, `unit-feature.bonus-action-ongoing-rage`, `unit-feature.first-attack-roll-reckless-advantage`, `unit-feature.passive-armor-class-bonus`, `unit-feature.passive-ranged-attack-roll-bonus`, `unit-feature.reaction-roll-or-damage-reduction`, `unit-feature.save-damage-replacement`, `unit-feature.self-bonus-action-healing`, `unit-feature.weapon-critical-range-19`, `unit-feature.weapon-damage-dice-roll-choice`, `unit-feature.zero-hit-point-replacement` |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `spell.invocation-damage-save-or-attack`, `spell.hit-point-restoration`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | battle | covered | `stat-block.attack-control` |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | character-creation | covered |  |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | character-sheet | covered | `character-sheet.armor-class-base-formula` |
| `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` | battle | needs-qnt-owner |  |
| `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | battle | needs-surface-evidence |  |
| `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` | character-creation | needs-qnt-owner | `character-creation.class-feature-feat-choice`, `character-creation.class-feature-advancement-replacement`, `character-creation.warlock-pact-magic-advancement`, `character-creation.weapon-mastery-choice`, `character-creation.eldritch-invocation-choice` |
| `SHEET.REST_AND_RESOURCE.TRANSITIONS` | character-sheet | needs-qnt-owner |  |
| `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` | character-battle | needs-qnt-owner |  |
| `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION` | battle | boundary-only |  |
| `BATTLE.SURFACE.CATALOG_ONLY_RECORDS` | battle | unsupported-by-admission |  |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | shared-algebras | needs-parity-witness |  |

## Open Work

- `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` (needs-qnt-owner): Classify every current BattleHole kind as QNT-owned semantic frontier, deterministic boundary projection, or unsupported/dead branch
- `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` (needs-surface-evidence): Prove each currently admitted executable battle Surface profile points to a covered semantic obligation
- `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` (needs-qnt-owner): Audit every current Character Creation choice/fill/finalization profile into semantic obligations and parity witnesses
- `SHEET.REST_AND_RESOURCE.TRANSITIONS` (needs-qnt-owner): Audit current Character Sheet HP, rest, spell-slot, pact-slot, Hit Dice, and feature-resource transitions into QNT-connected obligations
- `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` (needs-qnt-owner): Audit Character Sheet to battle init and battle handoff settlement for HP, zero-HP lifecycle, conditions, spell slots, and identity checks
- `SHARED.HIT_POINTS.POSITIVE_DAMAGE` (needs-parity-witness): Shared resolved positive-Hit-Point damage procedure and its TS parity route through consuming reducers

## Checker Issues

No checker issues.
