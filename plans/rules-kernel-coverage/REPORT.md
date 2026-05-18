# Rules Kernel Coverage Report

Generated from `plans/rules-kernel-coverage/obligations.jsonl`, `profile-obligations.jsonl`, `generator-readiness.jsonl`, and `KERNEL-COVERAGE` source markers.

## Summary

- Total obligations: 15
- Covered obligations: 8
- Open transitional obligations: 5
- Boundary or unsupported obligations: 2

| Status | Count |
| --- | ---: |
| covered | 8 |
| needs-qnt-owner | 4 |
| needs-parity-witness | 0 |
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
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | battle | covered | _direct reducer entrypoint_ |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | battle | covered | `spell.reaction-shield`, `spell.readied-action-time-spell`, `unit-feature.reaction-roll-or-damage-reduction` |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `unit-feature.action-surge-resource`, `unit-feature.alternate-action-cost`, `unit-feature.attack-damage-rider`, `unit-feature.bonus-action-ongoing-rage`, `unit-feature.first-attack-roll-reckless-advantage`, `unit-feature.passive-armor-class-bonus`, `unit-feature.passive-ranged-attack-roll-bonus`, `unit-feature.reaction-roll-or-damage-reduction`, `unit-feature.save-damage-replacement`, `unit-feature.self-bonus-action-healing`, `unit-feature.weapon-critical-range-19`, `unit-feature.weapon-damage-dice-roll-choice`, `unit-feature.zero-hit-point-replacement` |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | battle | covered | `spell.hit-point-restoration`, `spell.invocation-damage-save-or-attack`, `spell.reaction-shield`, `spell.readied-action-time-spell` |
| `BATTLE.STAT_BLOCK.ATTACK_CONTROL` | battle | covered | `stat-block.attack-control` |
| `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY` | character-creation | covered | _direct reducer entrypoint_ |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | character-sheet | covered | `character-sheet.armor-class-base-formula` |
| `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` | battle | needs-qnt-owner | _profile mapping pending_ |
| `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` | battle | needs-surface-evidence | _surface join pending_ |
| `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` | character-creation | needs-qnt-owner | `character-creation.class-feature-advancement-replacement`, `character-creation.class-feature-feat-choice`, `character-creation.eldritch-invocation-choice`, `character-creation.warlock-pact-magic-advancement`, `character-creation.weapon-mastery-choice` |
| `SHEET.REST_AND_RESOURCE.TRANSITIONS` | character-sheet | needs-qnt-owner | _profile mapping pending_ |
| `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` | character-battle | needs-qnt-owner | _profile mapping pending_ |
| `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION` | battle | boundary-only | _outside reducer semantics_ |
| `BATTLE.SURFACE.CATALOG_ONLY_RECORDS` | battle | unsupported-by-admission | _outside reducer semantics_ |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | shared-algebras | covered | _direct reducer entrypoint_ |

## Generator Readiness

| Obligation | Status | Subset |
| --- | --- | --- |
| `SHARED.HIT_POINTS.POSITIVE_DAMAGE` | fixture-bound | `variant`, `record`, `pure-def`, `int`, `bool`, `if-expression`, `let-binding`, `arithmetic`, `comparison`, `boolean-connective`, `implies`, `all-block` |

## Open Work

- `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` (needs-qnt-owner): Classify every current BattleHole kind as QNT-owned semantic frontier, deterministic boundary projection, or unsupported/dead branch
- `BATTLE.SURFACE.EXECUTABLE_PROFILE_JOIN` (needs-surface-evidence): Prove each currently admitted executable battle Surface profile points to a covered semantic obligation
- `CREATION.CURRENT_SUPPORTED_CHOICES.FULL_PROFILE_AUDIT` (needs-qnt-owner): Audit every current Character Creation choice/fill/finalization profile into semantic obligations and parity witnesses
- `SHEET.REST_AND_RESOURCE.TRANSITIONS` (needs-qnt-owner): Audit current Character Sheet HP, rest, spell-slot, pact-slot, Hit Dice, and feature-resource transitions into QNT-connected obligations
- `CHARACTER.BATTLE.HANDOFF.SETTLEMENT` (needs-qnt-owner): Audit Character Sheet to battle init and battle handoff settlement for HP, zero-HP lifecycle, conditions, spell slots, and identity checks

## Checker Issues

No checker issues.
