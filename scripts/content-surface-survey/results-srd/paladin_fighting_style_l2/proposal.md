# Proposal: paladin_fighting_style_l2

**Outcome:** `structural_widening`

## Why the unit does not fit

The only class feature mechanics family in `types.ts` is `activation`:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// family: "activation" requires activationCost + resource + resetCadence + effect
```

Fighting Style (paladin L2) is not a runtime activation. It is a permanent character-level benefit chosen once when the paladin reaches level 2. There is no action cost, no use_count, and no rest reset. Encoding it as `activation` with `activationCost: { kind: "free" }` and an arbitrary use_count would produce a misleading trace — the feature cannot be "used up."

## Gap 1 — Missing class feature family: `passive_grant` / `level_choice`

A new top-level mechanics family is needed for class features that are permanently acquired at a specific class level and are not activated at runtime.

Proposed shape (sketch):

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;  // see Gap 2 / Gap 3
};
```

This family would cover a large class of features: Fighting Style, Unarmored Defense, Weapon Mastery, Spellcasting, etc. — all features that are permanently on once acquired.

## Gap 2 — Missing atom: `grant_feat`

The primary mechanic is "you gain a Fighting Style feat of your choice." This requires a `grant_feat` effect atom. It is absent from the v4 taxonomy entirely.

Proposed:

```
grant_feat — grants a feat (or feat-like ability) selected from a named pool at character-creation or level-up time.
```

This is distinct from `grant_spell_access` (which grants named spells) and from `grant_proficiency` (which grants a proficiency category). The choosing-from-a-pool aspect also pressures a `choose` procedure node.

## Gap 3 — Missing surface variant: `grant_spell_access` in `ClassFeatureEffect`

The Blessed Warrior option grants two Cleric cantrips with Charisma as the spellcasting ability. The v4 taxonomy has `grant_spell_access` as an effect atom, but `ClassFeatureEffect` in `types.ts` only covers:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

`grant_spell_access` needs to be added to `ClassFeatureEffect` (with fields for spell pool, count, and spellcasting ability override) to encode Blessed Warrior.

## Gap 4 — Level-up cantrip replacement

"Whenever you gain a Paladin level, you can replace one of these cantrips with another Cleric cantrip."

This is a recurring level-up-time replacement choice. It doesn't have a corresponding surface shape. The closest v4 atom might be `replace`, but there is no current mechanism for expressing "on each level gained, you may swap one element of a granted set." This is secondary to the primary encoding gap but would need to be addressed for a complete encoding.

## Classification rationale

- The family (`activation`) does not apply → `structural_widening` (not just `surface_widening` or `atom_widening`).
- The missing `grant_feat` atom is also not in v4 taxonomy → additional `atom_widening` pressure, but the primary classification is `structural_widening` because no honest family exists.
- The `grant_spell_access` gap is a `surface_widening` (atom is in v4, not in surface), but again secondary to the structural gap.

## Recommended widening path

1. Add a `passive_grant` family to `ClassFeatureMechanics`.
2. Add `grant_feat` to the v4 atom inventory and to the surface `ClassFeatureEffect` union.
3. Add `grant_spell_access` (with `spellcastingAbility` override field) to `ClassFeatureEffect`.
4. Add a `level_up_swap` mechanic (or extend `grant_spell_access`) to express the cantrip-replacement behavior.
