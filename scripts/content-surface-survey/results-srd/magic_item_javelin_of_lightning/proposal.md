# Proposal: Javelin of Lightning — atom_widening

## Status update

Previously classified `structural_widening` because `MagicItemRecord` was absent from the surface. That blocker is resolved: `MagicItemRecord`, line area shapes, dawn reset cadence, and `replace_attack` activation cost are all present.

The Lightning Bolt activation encodes cleanly (typecheck passes, tracer runs). The unit is **partially authored** — only the Lightning Bolt activation is in `content/magic_item_javelin_of_lightning.dhall`; the passive damage-type swap is omitted because no atom covers it.

---

## Gap 1: `substitute_damage_type` effect atom — BLOCKS composite encoding

> "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

This is an optional per-hit outgoing damage-type substitution. No existing EffectAtom covers it:

- `damage` — emits a new damage instance; does not replace the weapon's existing damage type
- `modify_damage_numeric` — adjusts the numeric amount; does not change damage type
- `grant_resistance` — reduces *incoming* damage; irrelevant here
- `on_hit_trigger` + `MasteryEffect` — only `ModifyRollAdvantageRider | SaveGateRider | GrantWeaponAttackRider`; none cover type substitution

Proposed new atom:

```typescript
| {
    readonly kind: "substitute_damage_type";
    readonly from: DamageType;      // "piercing"
    readonly to: DamageType;        // "lightning"
    readonly optional: boolean;     // true — wielder chooses per hit
    readonly weaponFilter?: WeaponFilter;
  }
```

This fits in `PassiveMechanics.grants` (always-available while item is held) and in a `CompositeMagicItemMechanics` part.

---

## Gap 2: Dynamic line length — self-to-target (surface_widening, minor)

> "This bolt forms a 5-foot-wide Line between you and the target."

`AreaShapeDescriptor.line` requires a fixed `lengthFeet`. The bolt's actual length equals the distance to the target (variable, up to 120 ft). The authored encoding uses `lengthFeet: 120` as an upper-bound approximation.

A `self_to_target` line variant would model this precisely — no `lengthFeet` field, length resolved at activation time from target distance.

---

## Gap 3: `return_item_to_hand` lifecycle atom (atom_widening, minor)

> "Immediately after dealing this damage, the weapon reappears in your hand."

After the Lightning Bolt resolves, the javelin returns to the wielder immediately. No EffectAtom or lifecycle atom covers this. `return_on_end` is tied to spell duration end — not immediate post-activation return.

---

## Gap 4: Area self-exclusion flag (surface_widening, minor)

> "The target and each other creature in the Line (excluding you) makes a DC 13 Dexterity saving throw."

The area Attachment has `occupantDispositionFilter` (friendly / hostile) but no way to exclude the source creature. A boolean `excludeSource?: true` field on the area attachment kind would close this.

---

## Full composite encoding sketch

```
mechanics: {
  family: "composite",
  parts: [
    // Part 1 — passive damage-type swap (BLOCKED: needs substitute_damage_type)
    {
      family: "passive",
      condition: { kind: "holding_item" },
      grants: [
        { kind: "substitute_damage_type", from: "piercing", to: "lightning", optional: true }
      ]
    },
    // Part 2 — Lightning Bolt activation (currently authored)
    {
      family: "activation",
      activationCost: { kind: "replace_attack" },
      resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } },
      resetCadence: { kind: "dawn" },
      phases: [
        {
          kind: "save_gate",
          attachment: { kind: "area", shape: { kind: "line", lengthFeet: 120, widthFeet: 5 }, origin: { kind: "self" } },
          ability: "dex",
          dc: { kind: "fixed", dc: 13 },
          onFail: { kind: "damage", damageType: "lightning", amount: { kind: "fixed", expr: { dice: 4, dieSize: 6 } } },
          onSuccess: { kind: "half_damage" }
        }
      ]
    }
  ]
}
```
