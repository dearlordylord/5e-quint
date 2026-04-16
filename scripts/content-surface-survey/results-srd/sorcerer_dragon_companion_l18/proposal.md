# Widening Proposal: Dragon Companion (Sorcerer L18)

**Outcome:** `structural_widening`  
**Slug:** `sorcerer_dragon_companion_l18`  
**SRD section:** Classes/Sorcerer#Level 18: Dragon Companion

---

## Unit text

> You can cast *Summon Dragon* without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest.
>
> Whenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting.

---

## Why it doesn't fit

This feature has three mechanically distinct parts, none of which maps to the existing `ClassFeatureMechanics` surface.

### 1. Passive material-component waiver

**Text:** "You can cast Summon Dragon without a Material component."

The current `ClassFeatureMechanics` type only has an `activation` family, which models an event the player triggers (cost → resource → effect). This is a **permanent, always-on passive** that modifies how a specific named spell can be cast — no trigger, no resource, no activation event.

No existing family covers "permanent spell-cast property override for a named spell." This requires either:
- A new `passive_modifier` family for class features, or
- A widening of `ClassFeatureEffect` to include a `waive_component` variant that the `activation` family could grant permanently.

---

### 2. Free named-spell cast (1/Long Rest)

**Text:** "You can also cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest."

This is a use-count resource (fixed 1 use, long-rest reset) that grants a slot-less casting of a specific named spell. v4 taxonomy has `grant_spell_access` as an effect atom, but `ClassFeatureEffect` in `types.ts` is narrowed to `GrantExtraActionEffect | HealHpEffect`. There is no variant for:

- Granting access to a specific named spell
- Granting a free (slot-less) casting
- Tying that free casting to a use_count + long_rest_reset cadence

**Required widening:** A new `ClassFeatureEffect` variant, e.g.:

```typescript
export type GrantFreeSpellCastEffect = {
  readonly kind: "grant_free_cast";
  readonly spellId: string;         // "summon_dragon"
  readonly ignoreComponents?: ReadonlyArray<"m" | "v" | "s">;
};
```

This would compose with the existing `UseCountResource` + `RestResetCadence` fields of `ClassFeatureActivationMechanics`.

---

### 3. Optional cast-time concentration-for-duration substitution

**Text:** "Whenever you start casting the spell, you can modify it so that it doesn't require Concentration. If you do so, the spell's duration becomes 1 minute for that casting."

This is a **player-choice metamagic-style modifier** applied at the instant of casting:
- Trigger: "whenever you start casting [Summon Dragon]"
- Choice: opt in or decline
- If opted in: remove Concentration requirement AND change duration to `timed { unit: "minute", amount: 1 }`

No v4 atom covers this. The closest candidates fail:
- `suppress` — acts on an already-active effect; the spell is not yet active at cast time
- `replace` — acts on a prior instance of something; there is no prior cast to replace
- `modify_roll_numeric`, `modify_ac`, etc. — all act on resolved values, not on spell properties being declared

**Required widening:** A new atom (and surface type), e.g. `modify_cast_properties`, representing a player-elected, cast-time substitution of duration/concentration shape:

```typescript
// New atom proposal
export type ModifyCastPropertiesEffect = {
  readonly kind: "modify_cast_properties";
  readonly optional: boolean;
  readonly spellId: string;
  readonly replaceConcentrationWith: Duration;  // timed { unit: "minute", amount: 1 }
};
```

This would map to a new v4 atom, tentatively `cast_property_substitute`, in the Effect category (or possibly a new Procedure variant since it fires during the cast phase, not after resolution).

---

## Summary table

| Mechanic | Required widening | Kind |
|---|---|---|
| Passive material-component waiver | New class-feature `passive_modifier` family OR `waive_component` effect variant | `new_subgraph` |
| Free slot-less named-spell cast 1/LR | New `ClassFeatureEffect::grant_free_cast` variant; v4 `grant_spell_access` wired into surface | `new_variant` |
| Optional cast-time concentration-for-duration swap | New v4 atom `cast_property_substitute` (or `modify_cast_properties`) | `new_atom` |

All three must be addressed before this unit can be honestly encoded. The passive and free-cast widenings could be combined into a single new surface variant if the design allows; the cast-time modifier requires a genuinely new atom.
