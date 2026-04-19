# Proposal: Conjure Celestial — Surface Widenings

**Outcome**: `surface_widening`  
**Unit**: Conjure Celestial (spell, level 7, conjuration, SRD 5.2.1)

All required atoms exist in v4 and in `types.ts`. Three surface gaps prevent honest encoding.

---

## Gap 1 (Blocker): Per-application caster choice on OngoingEffect

### What the spell says

> For each creature you can see in the Cylinder, choose which of these lights shines on it:
> - **Healing Light**: The target regains Hit Points equal to 4d12 plus your spellcasting ability modifier.
> - **Searing Light**: The target makes a Dexterity saving throw, taking 6d12 Radiant damage on a failed save or half as much damage on a successful one.
>
> Whenever the Cylinder moves into the space of a creature you can see and whenever a creature you can see enters the Cylinder or ends its turn there, **you can bathe it in one of the lights**.

### Why this can't be encoded today

`CastTimeEffectModeChoice` selects **one mode for the entire spell** at cast time (e.g., Alter Self: Aquatic Adaptation / Change Appearance / Natural Weapons). The chosen mode persists for the duration.

Conjure Celestial is different: the choice is made **per-creature per trigger-firing**. Each time any qualifying trigger fires on a given creature, the caster independently picks Healing Light or Searing Light for that creature in that moment. The choice isn't sticky across the spell's duration.

`OngoingEffect` needs a new variant:

```typescript
| {
    readonly kind: "caster_choice";
    readonly label: string;
    readonly options: ReadonlyNonEmptyArray<{
      readonly id: string;
      readonly displayName: string;
      readonly effect: OngoingEffect;
    }>;
  }
```

This fires the trigger as normal, then presents the caster with a choice of which sub-effect to resolve against the triggering creature.

### Why this is surface_widening, not atom_widening

Both sub-effects use existing atoms (`heal_hp` and `save_gate`). The gap is in the **selection mechanism** on `OngoingEffect`, not the atoms themselves.

---

## Gap 2: "On caster movement" trigger

### What the spell says

> Until the spell ends, [...] when you move on your turn, you can also move the Cylinder up to 30 feet.

### Why this can't be encoded today

The `reposition_attachment` atom exists. The `on_caster_spends_action` trigger exists (for bonus actions and standard actions). However, **movement is a separate resource from action economy** — it doesn't cost a bonus action or a standard action. The SRD treats speed as its own pool.

No existing `OngoingTrigger` variant covers "during caster's movement phase on their turn."

### Proposed widening

```typescript
| { readonly kind: "on_caster_moves"; readonly maxFeet?: number }
```

`maxFeet` captures "you can move the cylinder up to 30 feet" alongside the caster's movement. The cylinder movement is optional and bounded by this cap; it does not require expending any action.

---

## Gap 3: Per-creature per-turn application cap

### What the spell says

> A creature can be affected by this spell only once per turn.

### Why this can't be encoded today

Three triggers overlap: `on_creature_enters_area`, `on_creature_ends_turn_in_area`, and (with Gap 2) a cylinder-moves-into trigger. A creature could theoretically qualify for multiple trigger firings in one turn. RAW explicitly prevents stacking.

`OngoingOperation` has no throttle field. `modify_roll_advantage` has `count` + `expiresOn` per rider, but that's on the effect atom, not the operation level.

### Proposed widening

Add an optional `perTargetPerTurn` limit on `OngoingOperation`:

```typescript
export type OngoingOperation = {
  readonly trigger: OngoingTrigger;
  readonly predicate?: OngoingPredicate;
  readonly effect: OngoingEffect;
  readonly perTargetPerTurn?: 1;  // new — "A creature can be affected only once per turn"
};
```

The value `1` is the only RAW-attested cap; typed as a literal to prevent arbitrary numeric abuse.

---

## Encoding sketch (pending all three widenings)

```
ongoing_effect
  level: 7, school: conjuration
  castingTime: action
  range: point 90 ft
  components: V S
  duration: concentration up to 10 minutes
  attachment: area, cylinder r=10 h=40 ft, origin: point_within_range

  initialPhase:
    direct → attachment (area)
    mode: CastTimeEffectModeChoice (per-creature)  ← or caster_choice initialPhase variant

  operations:
    [1] trigger: on_creature_enters_area
        perTargetPerTurn: 1
        effect: caster_choice
          - Healing Light: heal_hp { amount: 4d12+spellcastingMod, target: target_creature }
          - Searing Light: save_gate { dex, dc: caster_spell_save_dc,
                onFail: damage { 6d12 radiant, scaling: +1d12/slot above 7 }
                onSuccess: half_damage }

    [2] trigger: on_creature_ends_turn_in_area
        perTargetPerTurn: 1
        effect: (same caster_choice as above)

    [3] trigger: on_caster_moves { maxFeet: 30 }  ← Gap 2
        effect: reposition_attachment { maxMoveFeet: 30 }

    [4] trigger: passive
        effect: emit_light { brightRadiusFeet: 10 }
```

The upcast scaling (+1d12 damage and +1d12 healing per slot above 7) fits `linear_per_level` on both `DiceAmount` expressions once the choice mechanism exists.
