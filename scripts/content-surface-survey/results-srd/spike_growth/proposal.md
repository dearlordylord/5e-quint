# Proposal: Spike Growth surface widening

## Outcome: `surface_widening`

The primary mechanics of Spike Growth encode cleanly. One secondary mechanic — the camouflage/recognition check — is omitted because it requires a new `OngoingTrigger` variant.

## What encodes cleanly

- **Difficult Terrain**: `area_is_difficult_terrain` atom via `passive` trigger — works.
- **Per-5-ft movement damage**: `on_creature_moves` trigger with `perFeet: 5` → `damage` 2d4 piercing — works.
- **Area / attachment**: `area` attachment, `sphere r=20 ft`, `origin: point_within_range`, range 150 ft — works.
- **Concentration 10 min**: standard concentration duration — works.

## What is omitted

### Camouflage recognition mechanic

> "The transformation of the ground is camouflaged to look natural. Any creature that can't see the area when the spell is cast must take a Search action and succeed on a Wisdom (Perception or Survival) check against your spell save DC to recognize the terrain as hazardous before entering it."

This is mechanically deterministic: a creature that couldn't see the area at cast time must spend the **Search** standard action and pass a **Wis (Perception or Survival) vs spell save DC** check to know the terrain is dangerous.

The existing `on_creature_studies` trigger corresponds to the **Study** action (SRD 5.2.1 standard action). Search is a different standard action. There is no `on_creature_searches` variant in `OngoingTrigger`.

### Proposed widening

**New `OngoingTrigger` variant: `on_creature_searches`**

```typescript
| {
    readonly kind: "on_creature_searches";
    // optional: when present, the trigger fires only when the
    // creature searches the attached area/effect specifically.
    // Absent = any Search action by the creature.
  }
```

With this trigger, the recognition operation would compose as:

```
trigger: { kind: "on_creature_searches" }
effect:
  ability_check_gate:
    ability: "wis"
    dc: { kind: "caster_spell_save_dc" }
    skillFilter: { kind: "fixed", skills: ["perception", "survival"] }
    onPass: { kind: "none" }  // creature now knows it's hazardous (caller-owned flag)
    onFail: { kind: "none" }  // creature still unaware (enters anyway)
```

Note: the "can't see the area at cast time" predicate is a caller-resolved spatial state — similar to illusion disbelief gates. The ability check trigger itself is deterministic.

The SkillFilter shape (`{ kind: "fixed", skills: ["perception", "survival"] }`) is already in the surface and would serve this gate.

## Classification

`surface_widening` — all v4 atoms needed exist; only the `OngoingTrigger` variant for the Search action is missing.
