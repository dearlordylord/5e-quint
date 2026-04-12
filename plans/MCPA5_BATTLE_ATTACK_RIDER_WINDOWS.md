# MCPA5 — Battle Attack Rider Windows

## Purpose

Define the bounded public ownership model for attack riders that must key off a
specific battle attack timing window instead of being exposed as free-floating
creature actions.

## Non-Goal

This task does not wire the riders end to end. It fixes the ownership boundary
so later implementation can extend battle state and public battle tokens
without adding duplicate MCP payloads or creature-local guesses about attack
context.

## RAW Anchors

- `Brutal Strike` in `.references/srd-5.2.1/Classes/Barbarian.md`:
  declaration is tied to a chosen Strength-based attack roll on your turn after
  using Reckless Attack; the attack must not have Disadvantage; the rider only
  resolves if that attack hits.
- `Stunning Strike` in `.references/srd-5.2.1/Classes/Monk.md`:
  once per turn when you hit with a Monk weapon or an Unarmed Strike.
- `Cunning Strike` in `.references/srd-5.2.1/Classes/Rogue.md`:
  when you deal Sneak Attack damage; remove Sneak Attack dice before rolling;
  the effect occurs immediately after the attack's damage is dealt.
- `Eldritch Smite` in `.references/srd-5.2.1/Classes/Warlock.md`:
  once per turn when you hit with your pact weapon; expend a Pact Magic slot;
  optional Prone applies only if the target is Huge or smaller.
- `Divine Smite` in `.references/srd-5.2.1/Spells/Descriptions-A-D.md` and
  `Paladin's Smite` in `.references/srd-5.2.1/Classes/Paladin.md`:
  cast immediately after hitting with a melee weapon or an Unarmed Strike; the
  free-use path is a once-per-Long-Rest way to cast that same spell.

## Existing Code Findings

- `available-actions.ts` already keeps these rider events off the public action
  surface. They are internal machine events, not MCP/public tokens.
- `battleAttack` already owns the safe attack boundary: target, attack roll, AC,
  rolled weapon damage, explicit spatial/visibility facts, crit derivation,
  Sneak Attack legality, and hit-reaction windows.
- Battle already has interrupt infrastructure for attack follow-through:
  `PIAttackHit`, `PIAttackDamage`, `AwaitCtx`, and battle-scoped action tokens.
- The current creature guards for these riders are too coarse for public use:
  they know level and resource totals, but not the qualifying hit, chosen
  target, weapon identity, or attack timing window.

## Ownership Decision

These riders stay battle-owned. They should surface only as battle tokens during
the qualifying attack window, never as generic creature tokens in
`get_available_actions`.

### `USE_BRUTAL_STRIKE`

- Window: pre-roll declaration on the active creature's turn, after
  `BATTLE_DECLARE_RECKLESS` and before the chosen qualifying `BATTLE_ATTACK` or
  `BATTLE_OFF_HAND_ATTACK` resolves.
- Public token fields: chosen Brutal Strike effect list only.
- Battle-owned legality:
  - active creature is the attacker;
  - Rage / Barbarian level / once-per-turn state;
  - Reckless Attack already declared this turn;
  - the queued attack is Strength-based;
  - the queued attack does not have Disadvantage;
  - the rider has not already been reserved for another attack this turn.
- Runtime inputs: none. The follow-through is deterministic from battle-owned
  hit outcome and battle-owned target identity.
- Follow-through: if the reserved attack hits, add the extra damage and apply
  the selected effects on that hit. If it misses, the reservation expires
  unused.

### `STUNNING_STRIKE`

- Window: post-hit window keyed off `PIAttackHit`, before the battle advances
  past the hit.
- Public token fields: none beyond actor identity.
- Battle-owned legality:
  - the pending hit's attacker and target;
  - once-per-turn use tracking;
  - Focus Point availability;
  - the hit came from a Monk weapon or an Unarmed Strike.
- Runtime inputs:
  - resolved Constitution save result for the target.
- Follow-through:
  - spend 1 Focus Point;
  - on failed save, apply `Stunned` until the start of the attacker's next turn;
  - on successful save, halve the target's Speed until the start of the
    attacker's next turn and grant Advantage to the next attack roll against the
    target before then.

### `USE_CUNNING_STRIKE`

- Window: post-hit, but before Sneak Attack damage is finalized. Battle must
  pause after it knows the hit qualifies for Sneak Attack and before it commits
  the final Sneak Attack dice count.
- Public token fields: chosen Cunning Strike effect list only.
- Battle-owned legality:
  - the pending hit's attacker and target;
  - Sneak Attack is legal on this hit and has not already been spent this turn;
  - remaining Sneak Attack dice and the per-hit effect-count cap;
  - target size for `Trip`;
  - movement follow-through for `Withdraw`.
- Runtime inputs:
  - only the saving throw results required by the selected effects.
- Follow-through:
  - reduce the pending Sneak Attack dice before rolling damage;
  - deal the modified attack damage;
  - immediately after damage, apply the selected effects.

`Poison` needs one extra legality fact that battle does not currently own:
whether the attacker has a Poisoner's Kit on their person. That fact must be
projected into battle state from owned equipment/tool data or the `Poison`
option must stay unavailable.

### `USE_ELDRITCH_SMITE`

- Window: post-hit window keyed off `PIAttackHit`.
- Public token fields: none beyond actor identity.
- Battle-owned legality:
  - the pending hit's attacker and target;
  - once-per-turn use tracking;
  - Pact Magic slot availability;
  - the hit came from the attacker's pact weapon;
  - target size for optional `Prone`.
- Runtime inputs: none.
- Follow-through:
  - expend one Pact Magic slot;
  - add Force damage using the battle-owned Pact Magic slot level;
  - optionally apply `Prone` if the target is Huge or smaller.

### `USE_DIVINE_SMITE_FREE`

- Window: post-hit window keyed off `PIAttackHit`.
- Public token fields: none beyond actor identity.
- Battle-owned legality:
  - the pending hit's attacker and target;
  - the hit came from a melee weapon or an Unarmed Strike;
  - the once-per-Long-Rest free-use flag.
- Runtime inputs: none.
- Follow-through:
  - mark the free use spent;
  - add Divine Smite damage using the spell's base slot level;
  - apply the extra damage die against Fiends and Undead using battle-owned
    target creature type.

The free-use path should share the same battle-owned hit window as paid Divine
Smite. The only difference is the resource spend source.

## Required Battle Projection Deltas

Implementation should extend battle projection from existing owned facts rather
than inventing MCP-side rider payloads.

- Project existing per-turn / per-rest rider state that already exists in
  `classStates`:
  - `brutalStrikeUsedThisTurn`
  - `stunningStrikeUsedThisTurn`
  - `cunningStrikeUsesThisTurn`
  - `smiteFreeUsed`
  - `eldritchSmiteUsedThisTurn`
- Project existing class-level ownership that battle currently lacks for these
  windows:
  - Paladin level
  - Warlock level
- Project existing authored/derived attack identity facts battle needs for
  legality:
  - target `creatureType` for Divine Smite's Fiend/Undead bonus;
  - whether the relevant equipped weapon counts as a Monk weapon;
  - whether the relevant equipped weapon is the pact weapon.
- If `Poison` is implemented, project tool possession from owned character
  equipment/tool facts. Do not model Poison as an MCP override.

## Recommended Implementation Shape

- Reuse battle-scoped action discovery instead of creature-scoped action
  discovery.
- Keep the base `battleAttack` runtime unchanged. Add rider-specific battle
  tokens and rider-specific runtime only where a target save result is genuinely
  battle-external.
- Extend the attack interrupt model rather than stuffing rider choices into the
  base `BATTLE_ATTACK` payload.
- For Cunning Strike, introduce an explicit battle-owned pending Sneak Attack
  commit step so the chosen die reduction happens before damage is rolled while
  the effect still resolves immediately after damage.

## Summary

- `USE_BRUTAL_STRIKE` is a pre-roll reservation window.
- `STUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, and `USE_DIVINE_SMITE_FREE` are
  post-hit windows keyed to the actual qualifying hit.
- `USE_CUNNING_STRIKE` is a post-hit / pre-Sneak-Attack-commit window with
  after-damage follow-through.
- Missing legality facts belong in battle projection, not in MCP payloads.
