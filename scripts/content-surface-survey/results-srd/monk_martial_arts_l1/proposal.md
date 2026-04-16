# Proposal: Widenings Required for Martial Arts (monk L1)

**Outcome:** `structural_widening`

---

## Unit

**Name:** Martial Arts (monk L1)  
**Kind:** `class_feature` / `monk` / acquiredAtLevel 1  
**Provenance:** srd-5.2.1, `Classes/Monk#Level 1: Martial Arts`

---

## Why the unit does not fit the current surface

Martial Arts grants three passive, always-on benefits that activate when the monk is unarmored and wielding only Monk weapons. This pattern — a condition-gated passive feature with no activation cost, no use_count resource, and no reset cadence — has no home in the current `ClassFeatureMechanics` type.

The only existing `ClassFeatureMechanics` family is `activation`, which requires:
- `activationCost: ClassFeatureActivationCost`
- `resource: UseCountResource` (mandatory — no "no resource" variant)
- `resetCadence: RestResetCadence` (mandatory)

None of these apply to Martial Arts. There is no use_count to consume; the benefits simply exist while the precondition is met.

Beyond the structural gap, the effects themselves have no honest representation in `ClassFeatureEffect`:

```
ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect
```

None of the three sub-features maps cleanly to either.

---

## Required widenings

### 1. New family: `passive_class_feature`

A new `ClassFeatureMechanics` family is needed for features that are:
- Always-on (passive) while a precondition is met
- Not activated by the player; not consuming a resource
- Not reset by a rest (because there is nothing to reset)

This pattern is common in D&D 5e (Unarmored Defense, Dexterous Attacks, Sneak Attack eligibility, etc.) and will recur across many class feature encodings.

Proposed shape:
```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly precondition?: PassivePrecondition;  // e.g. "unarmored_monk_weapons"
  readonly effects: ReadonlyArray<ClassFeatureEffect>;
};
```

The `PassivePrecondition` type would need to capture the "unarmored + monk weapons + no shield" gate, which is its own closed grammar requiring design.

### 2. New atom: `grant_bonus_action_attack`

**Sub-feature:** Bonus Unarmed Strike

> "You can make an Unarmed Strike as a Bonus Action."

The existing `grant_extra_action` atom grants a full additional action (with optional action-kind exclusions). This is categorically different: it grants the option to make a specific *attack* (Unarmed Strike) as a *Bonus Action*. 

The key distinction:
- `grant_extra_action` → extra full action slot (consumes Action economy)
- `grant_bonus_action_attack` → a particular attack option available via Bonus Action (distinct from the full action Attack)

A new effect atom is needed that captures: "you may make [attack type X] as a Bonus Action."

### 3. New atom: `replace_damage_die`

**Sub-feature:** Martial Arts Die

> "You can roll 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons. This die changes as you gain Monk levels."

This is a die-expression replacement on a weapon/attack category, not a numeric roll modifier. The v4 taxonomy includes `modify_roll_substitute` for substituting roll results, but that covers "reroll and take the new result"-style effects. Replacing the weapon's damage die expression (`1d1` for unarmed → `1d6`) is a different shape.

The scaling component (`scale_die_size`: d6 → d8 → d10 → d12 at monk levels 5, 11, 17) exists in the v4 atom taxonomy but has no path through `ClassFeatureEffect` to the tracer.

Proposed shape:
```typescript
export type ReplaceDamageDieEffect = {
  readonly kind: "replace_damage_die";
  readonly targetWeaponCategory: "unarmed_strike" | "monk_weapon" | ...;
  readonly die: DiceAmount;  // fixed or threshold_tiers for scaling
};
```

### 4. New variant: ability score substitution on rolls

**Sub-feature:** Dexterous Attacks

> "You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Unarmed Strikes and Monk weapons. In addition, when you use the Grapple or Shove option of your Unarmed Strike, you can use your Dexterity modifier instead of your Strength modifier to determine the save DC."

The v4 taxonomy explicitly lists `modify_ability_score` as out-of-scope (residue, §12), but Dexterous Attacks is not a permanent ability score change — it is a *conditional ability score substitution on specific rolls*. It affects:
- Attack rolls with Unarmed Strike / Monk weapons
- Damage rolls with the same
- Save DC when using Grapple/Shove via Unarmed Strike

This is closer to a roll-modifier variant than a stat change. A closed `AbilityScoreSubstitution` variant might be:
```typescript
export type AbilityScoreSubstitution = {
  readonly kind: "substitute_ability_on_roll";
  readonly substitute: Ability;   // "dex"
  readonly replaces: Ability;     // "str"
  readonly on: ReadonlyArray<"attack_roll" | "damage_roll" | "weapon_save_dc">;
  readonly weaponCategory: "unarmed_strike" | "monk_weapon" | ...;
};
```

---

## Interaction between widenings

All four widenings are independent:
- The passive family is structural — it blocks encoding entirely.
- The three effect atoms are additive — once the passive family exists, each effect still needs its own atom.

The taxonomy classification for widenings 2–4 individually would be:
- `grant_bonus_action_attack`: not in v4 atom list → `atom_widening`
- `replace_damage_die`: not in v4 atom list (distinct from `modify_roll_substitute`) → `atom_widening`
- `substitute_ability_on_roll`: partially covered by v4 residue deferral → `surface_widening` or `atom_widening`

The aggregate verdict is `structural_widening` because the missing passive family blocks any encoding before the atom-level gaps are even reachable.

---

## No content files authored

Per protocol: this unit does not fit the current surface honestly. `monk_martial_arts_l1.dhall`, `monk_martial_arts_l1.json`, and `monk_martial_arts_l1.trace.md` are **not** produced.
