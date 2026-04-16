# Widening proposal: Dominate Monster

**Outcome:** `surface_widening`  
**Unit:** Dominate Monster (level 8 enchantment, SRD 5.2.1)

---

## Why the unit cannot be encoded honestly

Dominate Monster fits the `activation` payload family in shape — it is a concentration spell that opens with a Wisdom save gate. The problem is the spell `Effect` union (`DamageEffect | NoneEffect`) has no way to express condition application, and three additional mechanics (ongoing telepathic command, damage-triggered repeat save, conditional save advantage) have no surface representation at all.

Forcing this into `activation` with `onFail: { kind: "none" }` would produce a tracer graph that says the spell does nothing on a failed save. That is a misleading trace.

---

## Proposed widenings (narrowest-first)

### 1. `apply_condition` variant in spell `Effect`

**Type:** `new_variant` of `Effect`

The failed-save outcome is the Charmed condition. The `Effect` type needs a condition variant:

```typescript
export type ConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;   // widen Condition enum as needed
};

export type Effect = DamageEffect | NoneEffect | ConditionEffect;
```

The `Condition` type currently contains only `"prone"` (for mastery Topple). This pass would add at minimum `"charmed"`.

**SRD evidence:** "must succeed on a Wisdom saving throw or have the Charmed condition for the duration"

---

### 2. `telepathic_command` variant in `OngoingOperation`

**Type:** `new_variant` of `OngoingOperation`

After the save fails, the spell establishes a persistent telepathic command channel. The v4 atoms `telepathic_link` and `command_companion` cover this, but no `OngoingOperation` variant exists for it. A minimal encoding:

```typescript
export type TelelepaticCommandOperation = {
  readonly kind: "telepathic_command";
  readonly commandCost: { readonly kind: "free" };   // no action on caster's turn
  readonly reactionCommandCost?: { readonly kind: "reaction" };   // to command a Reaction
};
```

This lets the ongoing_effect or a hybrid family express "while concentrated, caster holds command authority over the target."

**SRD evidence:** "On your turn, you can use this link to issue commands to the target (no action required) … You can command the target to take a Reaction but must take your own Reaction to do so."

---

### 3. Damage-triggered repeat save

**Type:** `new_variant` in spell mechanics (breaking condition on concentration spell)

The spell's `repeat_save` trigger is bound to damage events on the target, not to a fixed interval. The v4 atom `repeat_save` exists but there is no surface shape for "repeat the initial save whenever the subject receives damage." One approach: a `breakingCondition` field on concentration duration:

```typescript
export type BreakingCondition =
  | { readonly kind: "on_damage_received"; readonly save: { ability: Ability; dc: DcSource } };

// Extension to Duration concentration variant:
// readonly breakingCondition?: BreakingCondition;
```

**SRD evidence:** "Whenever the target takes damage, it repeats the save, ending the spell on itself on a success."

---

### 4. Conditional advantage on initial save gate

**Type:** `new_variant` in `ActivationPhase` save_gate

The initial save carries conditional Advantage for the target if the caster or allies are in melee with it. No field in `save_gate` phase models this. A minimal addition:

```typescript
// Optional field on save_gate ActivationPhase:
// readonly targetAdvantageIf?: { readonly kind: "caster_or_ally_in_melee" };
```

This is a narrow variant; other spells (e.g. Charm Person, Charm Monster) share this "Advantage if fighting" pattern, so this variant has multi-spell pressure.

**SRD evidence:** "The target has Advantage on the save if you or your allies are fighting it."

---

### 5. Slot-scaled `Duration`

**Type:** `new_variant` of `Duration`

Upcasting to a level 9 spell slot extends concentration from 1 hour to 8 hours. The `Duration` type has no slot-scaling variant. A minimal encoding:

```typescript
export type SlotScaledConcentration = {
  readonly kind: "concentration_slot_scaled";
  readonly base: DurationValue;
  readonly tiers: ReadonlyArray<{ readonly atSlotLevel: number; readonly upTo: DurationValue }>;
};
```

Alternatively, extend `Duration` to carry a `SlotScaling<DurationValue>`.

**SRD evidence:** "Your Concentration can last longer with a level 9 spell slot (up to 8 hours)."

---

## Atoms already in v4 (no atom_widening needed)

| Atom | v4 section |
|---|---|
| `apply_condition` | §9 Effect Atoms |
| `telepathic_link` | §9 Effect Atoms |
| `command_companion` | §9 Effect Atoms |
| `repeat_save` | §5 Resolution Atoms |
| `save_gate` | §5 Resolution Atoms |
| `concentrate` / `expire` | §6 Lifecycle Atoms |

All five proposed widenings are new variants of existing surface types, not new atoms.

---

## Encoding summary if widenings land

Once the five variants above are in place, Dominate Monster encodes honestly as:

- **Family:** `activation` (or a new `ongoing_activation` hybrid if the command mechanic requires it)
- **Phase:** `save_gate` (WIS, caster_spell_save_dc, conditional target advantage)
  - `onFail`: `apply_condition(charmed)` + `telepathic_command` ongoing operation
  - `onSuccess`: `none`
- **Duration:** `concentration_slot_scaled` (base 1 hour, tier at slot 9: 8 hours)
- **Breaking condition:** `on_damage_received` repeat save

No new family is required; the `activation` family already handles one-shot save-gated effects.
