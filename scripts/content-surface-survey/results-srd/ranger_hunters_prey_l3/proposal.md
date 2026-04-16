# Proposal: Hunter's Prey (ranger L3) — structural_widening

## Unit summary

Hunter's Prey grants a **choice between two passive weapon-attack riders**, swappable on Short or Long Rest:

- **Colossus Slayer** — when you *hit* with a weapon AND the target is missing HP → +1d8 damage (once/turn)
- **Horde Breaker** — when you *make* a weapon attack → optionally make a second weapon attack against a different adjacent creature (once/turn)

## Why neither option fits

### Gap 1: No passive rider family for class features

`ClassFeatureMechanics` has exactly one family: `activation`. That family requires:
- `activationCost` — something the ranger spends (action, bonus action, or free)
- `resource` — a use_count pool
- `resetCadence` — rest-based refill
- `effect` — a discrete effect granted when activated

Neither Colossus Slayer nor Horde Breaker has any of these properties. Both are **always-on passive riders** while the option is chosen — they fire automatically on qualifying weapon attacks with no activation step and no consumable resource. Encoding either as `activation` would produce a fundamentally false trace.

The mastery surface (`on_hit_trigger`) is structurally closer to what these features need, but mastery records are the wrong kind — and the mastery family itself would need widening to handle Horde Breaker's pre-resolution trigger.

### Gap 2: No choose-N-options container

The feature is not a single mechanic — it is a **container that offers a choice**:

> "You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one."

There is no `UnitRecord` kind or `ClassFeatureMechanics` family that represents "choose one of N sub-features, each with independent mechanics, swappable on rest." This is an orthogonal structural gap even if the individual options were encodable.

### Gap 3: HP-state predicate (Colossus Slayer)

Colossus Slayer's rider fires only "if it's missing any of its Hit Points." This is a runtime predicate gating the damage effect: the rider checks current HP against max HP at the moment of the hit. The v4 atom vocabulary has no filter or condition variant for HP-state predicates. The closest surface constructs (`save_gate`, `attack_roll`) are resolution nodes, not passive value-checks.

### Gap 4: on_attack_window atom (Horde Breaker)

Horde Breaker triggers "when you **make** an attack" — before the attack roll resolves. The v4 window atoms cover `on_hit_window` and `on_miss_window` (post-resolution) but have no pre-resolution attack window. The trigger point for Horde Breaker is distinct from both: it fires when the attack is declared, not after it lands.

## Proposed widening

### A. New class feature family: passive_weapon_rider

A new `ClassFeatureMechanics` family for passive riders that activate automatically on qualifying weapon events, with no activationCost/resource/resetCadence. Required fields would include:

- `trigger`: when the rider fires (weapon_hit, weapon_attack_declared, etc.)
- `condition` (optional): a filter predicate that gates the rider (e.g., hp_below_max)
- `effect`: the rider effect (damage, grant_weapon_attack, etc.)
- `usageLimit` (optional): once_per_turn, etc.

### B. New top-level container: option_set

A new `ClassFeatureMechanics` family (or top-level `UnitRecord` kind) for features that grant a choice among sub-options:

- `options`: array of N sub-mechanics (each independently decodable)
- `choosesN`: how many options are active at once
- `swapCadence`: when the active choice can be replaced (rest kind, free, etc.)

### C. New atom: on_attack_window

A v4 window atom that fires when a weapon attack is declared (before the attack roll). Distinct from `on_hit_window` (post-resolution, only on hits) and `post_roll_window` (post-resolution, any outcome). Needed for Horde Breaker and any similar "when you attack…" riders.

### D. New surface variant: hp_below_max_predicate (or conditional_filter)

A filter predicate type usable in passive rider conditions. Represents a runtime check against creature state (HP, conditions, etc.) that gates whether a rider fires. Colossus Slayer's "if it's missing any of its Hit Points" is the pressure case.

## Narrowest honest classification

`structural_widening` — the primary blocker is the absence of a passive rider family for class features and the absence of a choice-container structure. Atom gaps (on_attack_window, hp_below_max_predicate) are secondary but also necessary.

## What IS encodable today (for future reference)

- The once-per-turn fence: `use_count` + `turn_start_window` ✓
- The weapon-hit trigger shape: `attack_roll` → `on_hit_window` ✓ (but only in mastery, not class feature)
- The nested weapon attack (Horde Breaker): `grant_weapon_attack` rider ✓ (but only in mastery, and wrong trigger timing)
- The rest-based option swap: no vocabulary exists

Colossus Slayer is approximately 80% expressible if a passive rider family existed and the HP predicate were added. Horde Breaker needs both the passive rider family and `on_attack_window`. The option-choice container is a wholly new concept.
