# Widening Proposal: Holy Nimbus (paladin L20)

**Outcome:** `structural_widening`
**Provenance:** SRD 5.2.1 — Classes/Paladin#Level 20: Holy Nimbus

---

## Why this unit cannot be encoded honestly

Holy Nimbus activates as a Bonus Action and grants three concurrent effects for 10 minutes, with a Long Rest reset that also supports spell-slot-based early restoration. Four distinct structural gaps block encoding:

### 1. Single `effect` → must be multi-effect (`structural_widening`)

`ClassFeatureActivationMechanics` has:
```ts
readonly effect: ClassFeatureEffect;
```

Holy Nimbus grants **three independent, simultaneous effects** (Holy Ward, Radiant Damage, Sunlight). There is no honest way to collapse these into one `ClassFeatureEffect` variant. The field must become:
```ts
readonly effects: ReadonlyArray<ClassFeatureEffect>;
```
This is a structural change to the payload family itself.

---

### 2. Missing `ClassFeatureEffect` variant: conditional `modify_roll_advantage` (`surface_widening`)

**Holy Ward:** *"You have Advantage on any saving throw you are forced to make by a Fiend or an Undead."*

The v4 atom `modify_roll_advantage` exists and is used in mastery (`ModifyRollAdvantageRider`), but `ClassFeatureEffect` only has `GrantExtraActionEffect | HealHpEffect`. A new variant is needed:

```ts
export type ConditionalAdvantageEffect = {
  readonly kind: "conditional_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly condition: AdvantageCondition;  // new — see below
};
```

Additionally, the creature-type source filter ("forced by a Fiend or Undead") requires a new `AdvantageCondition` surface type — something like:
```ts
export type AdvantageCondition =
  | { readonly kind: "source_creature_type"; readonly types: ReadonlyArray<CreatureType> };
```
`CreatureType` ("fiend", "undead") is not currently modeled in the surface.

---

### 3. Missing `ClassFeatureEffect` subgraph: area damage on enemy turn start (`structural_widening`)

**Radiant Damage:** *"Whenever an enemy starts its turn in the aura, that creature takes Radiant damage equal to your Charisma modifier plus your Proficiency Bonus."*

The v4 atoms `turn_start_window`, `area`, and `damage` all exist, but no `ClassFeatureEffect` variant composes them. The required subgraph is:

```
activate → persist (10 min)
persist → area attachment (self-centered, the aura)
area → turn_start_window (each enemy in area, at start of their turn)
turn_start_window → damage (radiant, CHA mod + PB)
```

This is a new class feature effect shape: **persistent area that deals damage whenever a creature starts their turn inside it**. This pattern recurs elsewhere (Spirit Guardians, Cloudkill) but has never been modeled at the class feature surface level.

**Secondary gap:** The damage amount "CHA modifier + PB" is a flat stat-derived value. `DiceAmount` only supports fixed dice expressions, threshold tiers, or linear-per-level progressions. A new `DiceAmount` variant would be needed:
```ts
| { readonly kind: "ability_modifier_plus_pb"; readonly ability: Ability }
```

---

### 4. Missing `RestResetCadence` variant: spell-slot-based restoration (`surface_widening`)

*"Once you use this feature, you can't use it again until you finish a Long Rest. You can also restore your use of it by expending a level 5 spell slot (no action required)."*

`RestResetCadence` currently supports:
- `short_or_long_rest`
- `long_rest`
- `short_rest`
- `partial_short_full_long`

None of these cover "also restorable by expending a specific spell slot level mid-rest." A new variant is needed:
```ts
| {
    readonly kind: "long_rest_or_spell_slot";
    readonly slotLevel: SpellLevel;  // 5 in this case
  }
```

This is a `surface_widening` — the activation family exists, but the reset cadence discriminated union needs a new member.

---

## Omitted from proposals

**Sunlight** ("The aura is filled with Bright Light that is sunlight") — this is an environmental / narrative effect. Per ARCHITECTURE.md, DM-owned notification surfaces and world-state descriptions are out of core. No atom or surface widening proposed.

---

## Summary table

| Gap | Classification | Blocking? |
|---|---|---|
| Single `effect` field | `structural_widening` | Yes |
| `ClassFeatureEffect: conditional_advantage` | `surface_widening` | Yes |
| `ClassFeatureEffect: area_damage_on_turn_start` | `structural_widening` | Yes |
| `RestResetCadence: long_rest_or_spell_slot` | `surface_widening` | Yes |
| `DiceAmount: ability_modifier_plus_pb` | `surface_widening` | Yes (for damage amount) |
| Sunlight | out-of-core | No |
