# TODO

## Abstraction Leak Cleanup

These functions currently mix generic battle plumbing with rule-specific SRD
logic. Keep behavior and Quint parity intact while moving ownership closer to
the spell, feature, or monster rule that actually owns the behavior.

- [applyDamage](../packages/core/src/battle-machine-helpers.ts#L331) (`packages/core/src/battle-machine-helpers.ts:331`)
  Owns the SRD 5.2.1 "Knocking Out a Creature" override inside a generic damage helper.
- [isRedirectAlly](../packages/core/src/battle-machine-helpers.ts#L478) (`packages/core/src/battle-machine-helpers.ts:478`)
  Encodes Goblin Boss Redirect Attack's "Small or Medium ally within 5 feet" restriction inside a generic helper. SRD reference: `.references/srd-5.2.1/Monsters/Monsters-E-G.md`, `Goblin Boss`, `Redirect Attack`.
- [legalHitReactions](../packages/core/src/battle-machine-helpers.ts#L532) (`packages/core/src/battle-machine-helpers.ts:532`)
  Aggregates Shield, Parry, Cutting Words, and Goblin Boss Redirect Attack legality in one generic helper.
- [legalDamageReactionsByCreature](../packages/core/src/battle-machine-helpers.ts#L590) (`packages/core/src/battle-machine-helpers.ts:590`)
  Aggregates Uncanny Dodge and Deflect Attacks legality in one generic helper.
- [eligibleForCounterspell](../packages/core/src/battle-machine-helpers.ts#L662) (`packages/core/src/battle-machine-helpers.ts:662`)
  Encodes Counterspell-specific ownership in a generic helper: spell availability, level 3+ slot requirement, one-slot-per-turn gating, and component checks.
- [battleResolveHitReaction](../packages/core/src/battle-machine-actions-attack.ts#L389) (`packages/core/src/battle-machine-actions-attack.ts:389`)
  Generic resolver owns concrete per-rule mutations for Shield, Parry, Cutting Words, and Goblin Boss Redirect Attack.
- [afterDamageReactionTokens](../packages/core/src/available-actions.ts#L3426) (`packages/core/src/available-actions.ts:3426`)
  Generic action-token enumerator recomputes rule-specific legality for Hellish Rebuke, Retaliation, and Fire Shield.

## First Cleanup Pass

- Extract Redirect Attack ownership first. It is the clearest monster-specific leak and already has an SRD-backed TODO in code.
- Then split generic hit-reaction discovery/resolution from rule-specific eligibility and mutation logic.
- Keep `battle.qnt` and `battle-machine.ts` parity as the correctness boundary while moving ownership.
