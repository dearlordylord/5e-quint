# Proposal: Bestow Curse widenings

**Unit:** Bestow Curse (spell, L3 Necromancy)
**Outcome:** `atom_widening` (with three additional `surface_widening` items)

Bestow Curse fits the `ongoing_effect` spell family structurally: Touch range, initial WIS `save_gate`, on-fail curse persists as `ongoing_effect` with a `CastTimeEffectModeChoice` selecting among four curse options. The widenings arise entirely inside the four effect payloads and the upcast duration mechanism.

---

## Widening 1 — `force_action` atom (atom_widening, blocking)

**Effect 3 text:** "In combat, the target must succeed on a Wisdom saving throw at the start of each of its turns or be forced to take the Dodge action on that turn."

**Encoding attempt:** `on_attached_turn_start` trigger → `save_gate` ongoing effect → on fail: ???

The on-fail result is "the creature must use its action to Dodge." This is not:
- `apply_condition` — no condition imposes a mandatory action choice
- `grant_extra_action` — that grants an _additional_ action to the bearer, not forces a specific action on the target
- `restrict_action_set { kind: "exclude" }` — that removes options but doesn't mandate a specific choice

A new `force_action` atom is needed:

```typescript
| {
    readonly kind: "force_action";
    readonly action: StandardActionKind;  // "dodge" in this case
  }
```

This atom forces the subject to spend its action on a specific standard action kind on its next turn (or current turn, depending on delivery context). It is mechanically distinct from both action granting and action restriction.

---

## Widening 2 — Ability picker for `modify_roll_advantage` (surface_widening)

**Effect 1 text:** "Choose one ability. The target has Disadvantage on ability checks and saving throws made with that ability."

**Encoding attempt:** `modify_roll_advantage { mode: "disadvantage", on: ["ability_check", "saving_throw"], abilityFilter: ??? }`

Two gaps:
1. `saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>` exists for saving throws but is a **fixed** list — not a cast-time choice.
2. No `abilityCheckAbilityFilter` equivalent exists for ability check rolls.

The ability is chosen by the caster at cast time from any of the six SRD abilities. Needed additions:

```typescript
// On modify_roll_advantage:
readonly abilityFilter?: AbilityFilter;  // narrows which ability the roll uses

export type AbilityFilter =
  | { readonly kind: "fixed"; readonly abilities: ReadonlyNonEmptyArray<Ability> }
  | { readonly kind: "choice"; readonly options: ReadonlyNonEmptyArray<Ability> };
```

This parallels the existing `SkillFilter` shape (`fixed` / `choice` variants). The `saveAbilityFilter` field (currently a bare array) would migrate to use `AbilityFilter` or a separate `abilityFilter` field could cover both check and save rolls.

---

## Widening 3 — Attack-target filter on `modify_roll_advantage` (surface_widening)

**Effect 2 text:** "The target has Disadvantage on attack rolls against you."

**Encoding attempt:** `modify_roll_advantage { mode: "disadvantage", on: ["attack_roll"], attackTargetFilter: ??? }`

The existing `attackerTypeFilter` narrows by the **attacker's** creature type (used in Protection from Evil and Good). Effect 2 narrows by the **target** of the attack: specifically, attacks whose intended target is the caster.

Needed addition on `modify_roll_advantage`:

```typescript
readonly attackTargetIsCaster?: true;
```

This is a boolean sentinel (not a general "target filter grammar") because the only SRD pressure is "against you (the caster)." Widen further if future units need "against [specific named ally]."

---

## Widening 4 — `on_caster_deals_damage` trigger (surface_widening)

**Effect 4 text:** "If you deal damage to the target with an attack roll or a spell, the target takes an extra 1d8 Necrotic damage."

**Encoding attempt:** `OngoingOperation { trigger: ??? , effect: damage { kind: "damage", damageType: "necrotic", amount: { kind: "fixed", expr: { dice: 1, dieSize: 8 } } } }`

`on_caster_attack_hit` fires only when the caster's attack roll lands. Spell damage (e.g., Fire Bolt, Fireball) does not go through `on_caster_attack_hit`; it goes through separate resolution chains. Effect 4 needs a trigger for any caster-to-target damage delivery regardless of the delivery mechanism.

Needed addition to `OngoingTrigger`:

```typescript
| { readonly kind: "on_caster_deals_damage" }
```

This fires whenever the caster resolves damage against the attached target, encompassing attack hits, save-fail damage, and direct-apply damage. It subsumes `on_caster_attack_hit` as a sub-case and is the natural generalization for "mark" effects that add riders to all damage the caster deals.

---

## Widening 5 — Duration upcast kind-change (surface_widening)

**Upcast text:** "If you use a level 5+ spell slot, the spell doesn't require Concentration, and the duration becomes 8 hours (level 5-6 slot) or 24 hours (level 7-8 slot). If you use a level 9 spell slot, the spell lasts until dispelled."

The current `DurationValue.upcastTiers` only changes the `amount` field within a fixed duration `kind`. Bestow Curse's upcast switches the Duration discriminant itself:

- L3: `{ kind: "concentration", upTo: { unit: "minute", amount: 1 } }`
- L4: `{ kind: "concentration", upTo: { unit: "minute", amount: 10 } }`
- L5-6: `{ kind: "timed", value: { unit: "hour", amount: 8 } }` ← no concentration
- L7-8: `{ kind: "timed", value: { unit: "hour", amount: 24 } }` ← no concentration
- L9: `{ kind: "permanent", endsOn: ["dispel"] }`

A new upcast structure is needed that can switch the Duration kind (and concentration flag) as a function of minimum slot level:

```typescript
export type DurationUpcastBySlot =
  | { readonly atSlot: number; readonly duration: Duration };

// On SpellMechanicsHeader:
readonly durationUpcastBySlot?: ReadonlyNonEmptyArray<DurationUpcastBySlot>;
```

Each entry overrides the entire `Duration` when the spell is cast at ≥ `atSlot`. The base `duration` field applies for casts below the lowest tier. This is orthogonal to `DurationValue.upcastTiers` (which handles intra-kind amount scaling) and is needed wherever a spell changes its concentration status when upcast.

---

## Encoding path (once widenings land)

With all five widenings, the honest encoding is:

```
ongoing_effect
  initial_phase: save_gate (WIS, caster_spell_save_dc, touch attachment)
    onFail: direct_apply
      mode: CastTimeEffectModeChoice (choose one at cast)
        option A: modify_roll_advantage (disadvantage, ability_check+saving_throw, abilityFilter.choice)
        option B: modify_roll_advantage (disadvantage, attack_roll, attackTargetIsCaster)
        option C: ongoing_operation (on_attached_turn_start → save_gate → onFail: force_action "dodge")
        option D: ongoing_operation (on_caster_deals_damage → damage 1d8 necrotic)
    onSuccess: none
  durationUpcastBySlot:
    L4: concentration 10 min
    L5: timed 8 hours
    L7: timed 24 hours
    L9: permanent (until dispelled)
```

The `family`, `school`, `castingTime`, `range`, `components`, and `attachment` (touch target, one creature) all encode cleanly today.
