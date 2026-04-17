# Proposal: Ring of Elemental Command

**Outcome:** `structural_widening`  
**Confidence:** high

---

## Why the unit cannot be encoded honestly

The Ring of Elemental Command requires three co-present mechanic families on a single `MagicItemRecord`:

1. **Passive grants** (Elemental Bane) — advantage on attacks vs elementals, elementals get disadvantage vs you.
2. **Activated save-gate ability** (Elemental Compulsion) — Magic action, DC 18 Wisdom save, Charmed + action control on fail.
3. **Charge-pool spellcasting** (Spellcasting) — 5 charges, 1d4+1 at dawn, plane-specific spell list at variable charge costs.

`MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics` allows exactly one family. Even the smallest honest subset of this item (passive Elemental Bane co-present with the activated Elemental Compulsion) is irrepresentable in the current surface. This is the primary blocker.

---

## Widening 1 — Multi-family mechanics (`structural_widening`)

**Needed:** A composition mechanism for items that have simultaneous passive grants, activation(s), and charge-pool spellcasting. The simplest surface form would be a `composite_mechanics` family or a record-level array of named mechanic blocks.

Evidence: all three properties (Bane, Compulsion, Spellcasting) are present on every ring variant — they are not alternatives.

---

## Widening 2 — Plane-conditional variant structure (`surface_widening`)

**Needed:** Elemental Focus grants are conditioned on which elemental plane the ring is linked to (Air / Earth / Fire / Water). This is not a cast-time `CastTimeChoice` — the plane is set once at acquisition by GM fiat. The surface needs a variant/enum-keyed conditional block:

```
planeVariant: "air" | "earth" | "fire" | "water"
  → conditional passive grants for that variant
  → conditional spell list for that variant
```

No current surface type supports this pattern for magic items.

---

## Widening 3 — `grant_language` atom (`atom_widening`)

**Needed:** All four Elemental Focus variants grant knowledge of a planar language (Auran, Terran, Ignan, Aquan). No language-grant atom exists in `EffectAtom`.

**Proposed shape:**
```typescript
{ kind: "grant_language"; language: string }
```

Evidence: "Air: You know Auran." / "Earth: You know Terran." / "Fire: You know Ignan." / "Water: You know Aquan."

---

## Widening 4 — `difficult_terrain_exception` atom (`atom_widening`)

**Needed:** Earth variant exempts the wearer from difficult terrain penalties for terrain made of rubble, rocks, or dirt. There is no terrain-type exemption atom. `deny_opportunity_attack` is unrelated; no speed atom covers this.

**Proposed shape:**
```typescript
{ kind: "ignore_difficult_terrain"; terrainTypes?: ReadonlyNonEmptyArray<string> }
```

Evidence: "Terrain composed of rubble, rocks, or dirt isn't Difficult Terrain for you."

---

## Widening 5 — `pass_through_terrain` atom (`atom_widening`)

**Needed:** Earth variant allows the wearer to move through solid earth or rock as if it were difficult terrain (without disturbing matter). This is a phasing-style movement mode. `grant_speed` covers fly/swim/climb/burrow — none of those model passage through solid matter. The shunt-on-end-of-turn clause is an additional sub-mechanic.

**Proposed shape:**
```typescript
{
  kind: "pass_through_terrain";
  terrainKind: "earth_and_rock";
  movementCost: "difficult_terrain";
  shuntOnTurnEnd: true;
}
```

Evidence: "You can move through solid earth or rock as if those areas were Difficult Terrain without disturbing the matter through which you pass. If you end your turn in solid earth or rock, you are shunted out to the nearest unoccupied space you last occupied."

---

## Widening 6 — `breathe_underwater` atom (`atom_widening`)

**Needed:** Water variant grants the ability to breathe underwater. No atom models alternate breathing environments.

**Proposed shape:**
```typescript
{ kind: "grant_breath_mode"; environment: "underwater" | "any" }
```

Evidence: "Water: you can breathe underwater."

---

## Secondary note: Elemental Compulsion action-control clause

Elemental Compulsion's on-fail effect includes "you determine what it does with its move and action on its next turn." The current `apply_condition` for `charmed` does not model controller-designation (the Charmed condition in SRD does not grant full control — that is a Dominate-style effect). This is either:

- An `atom_widening` requiring a `grant_action_control` atom, or
- `dm_agenda` if "you determine what it does" is considered DM-mediated adjudication.

The Charmed application itself fits. The controller-designation rider does not. This should be flagged as a secondary gap independent of the structural widening.

---

## Summary of blockers in priority order

| Priority | Issue | Classification |
|---|---|---|
| 1 | Co-present passive + activation + charge-pool families | `structural_widening` |
| 2 | Plane-conditional variant grants/spells | `surface_widening` |
| 3 | Missing `grant_language` atom | `atom_widening` |
| 4 | Missing `ignore_difficult_terrain` atom | `atom_widening` |
| 5 | Missing `pass_through_terrain` atom | `atom_widening` |
| 6 | Missing `breathe_underwater` atom | `atom_widening` |
| 7 | Elemental Compulsion controller-designation rider | `atom_widening` (secondary) |
