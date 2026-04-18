# Proposal: Boon of Combat Prowess

**Outcome:** `atom_widening`

## Unit

Epic Boon Feat (Level 19+). Two mechanics:
1. **Ability Score Increase** — increase one ability score of your choice by 1, max 30.
2. **Peerless Aim** — when you miss with an attack roll, you can hit instead (once per turn reset at turn start).

---

## Gap 1 — `convert_miss_to_hit` (atom_widening, blocking)

**SRD text:** "When you miss with an attack roll, you can hit instead."

Peerless Aim is a retroactive roll-outcome override: after the attack roll resolves as a miss, the bearer may declare it a hit instead. This is distinct from all existing EffectAtoms:

- `modify_roll_numeric` — applies a numeric delta *before* resolution (e.g. +1d4 to the roll). Cannot retroactively change a miss to a hit.
- `modify_roll_advantage` — grants advantage/disadvantage at roll time. Not retroactive.
- `modify_crit_range` — lowers the critical-hit threshold. Not a miss-to-hit conversion.

The concept is a **post-resolution outcome substitute**: after the d20 resolves as a miss, the outcome is overridden to "hit." The v4 taxonomy has no atom for this.

**Proposed atom:**

```
convert_miss_to_hit
  category: effect
  semantics: after the bearer's attack roll resolves as a miss, override
             the outcome to a hit. The attack hits for full weapon damage
             (no additional effects from the conversion itself).
```

This atom would be the `effect` payload of a triggered-reaction-style activation whose trigger is `caster_misses_attack_roll` (see Gap 2).

---

## Gap 2 — `ReactionTrigger.caster_misses_attack_roll` (surface_widening)

**SRD text:** "When you miss with an attack roll…"

The bearer's reaction window opens on their own outgoing attack missing. `ReactionTrigger` currently models:

- `hit_by_attack_roll` — an *incoming* attack hits the bearer.
- `targeted_by_named_spell` — the bearer is targeted by a specific spell.
- `creature_casts_spell` — a creature within range casts a spell.
- `spell_save_outcome` — the bearer finishes a saving throw against a spell.

None covers "the bearer just made an attack roll that missed." A new variant is needed:

```typescript
| { readonly kind: "caster_misses_attack_roll" }
```

---

## Gap 3 — `modify_ability_score.ability: Ability | CastTimeChoice<Ability>` (surface_widening)

**SRD text:** "Increase one ability score of your choice by 1, to a maximum of 30."

`modify_ability_score` currently takes `ability: Ability` — a fixed ability set at authoring time. This feat lets the player pick any of the six abilities at feat-acquisition (build) time.

`CastTimeChoice<T>` is already defined in the surface as a build-time or cast-time selection. The fix is widening the `ability` field:

```typescript
// before
readonly ability: Ability;

// after
readonly ability: Ability | CastTimeChoice<Ability>;
```

This same widening would apply to any future feat or feature that grants "+1 to a stat of your choice."

---

## Gap 4 — `CompositeFeatMechanics` (surface_widening)

The feat contains both a passive grant (ASI) and an activated ability (Peerless Aim). `FeatMechanics = PassiveMechanics | ActivatedAbilityMechanics` does not admit composite mechanics.

`CompositeClassFeatureMechanics` already exists for class features with the same structural need:

```typescript
export type CompositeClassFeatureMechanics = {
  readonly family: "composite";
  readonly parts: ReadonlyNonEmptyArray<ClassFeatureComponentMechanics>;
};
```

The parallel for feats would be:

```typescript
export type CompositeFeatMechanics = {
  readonly family: "composite";
  readonly parts: ReadonlyNonEmptyArray<FeatComponentMechanics>; // PassiveMechanics | ActivatedAbilityMechanics
};

export type FeatMechanics = PassiveMechanics | ActivatedAbilityMechanics | CompositeFeatMechanics;
```

---

## Encoding once gaps are resolved

After all four gaps are addressed, the encoding would be:

```
FeatRecord {
  kind: "feat",
  category: "epic_boon",
  mechanics: {
    family: "composite",
    parts: [
      // Part 1: ASI
      {
        family: "passive",
        grants: [{
          kind: "modify_ability_score",
          ability: { kind: "choice", label: "Ability Score", options: ["str","dex","con","int","wis","cha"] },
          delta: 1,
          maximum: 30
        }]
      },
      // Part 2: Peerless Aim
      {
        family: "activation",
        activationCost: { kind: "reaction", trigger: { kind: "caster_misses_attack_roll" } },
        resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } },
        resetCadence: ??? // "start of your next turn" — not a rest reset, not a dawn reset
                         // needs a "turn_start" reset cadence (another gap, lesser priority)
        phases: [{ kind: "direct", attachment: { kind: "self" }, effects: [{ kind: "convert_miss_to_hit" }] }]
      }
    ]
  }
}
```

Note a fifth minor gap: the reset cadence for Peerless Aim ("until the start of your next turn") is per-turn, not rest-based or dawn-based. The existing `usageLimit: { kind: "once_per_turn" }` on the `ActivatedAbilityMechanics` header covers this exactly — the feature is usable once per turn and the fence resets at turn start. So this gap may already be covered by the `usageLimit` field combined with an appropriate resource cap.
