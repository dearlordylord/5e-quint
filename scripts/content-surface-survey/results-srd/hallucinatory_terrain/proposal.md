# Proposal: Widenings required for Hallucinatory Terrain

**Unit:** Hallucinatory Terrain (spell, level 4, illusion, srd-5.2.1)  
**Outcome:** `atom_widening`

The `ongoing_effect` family exists and the 10-minute casting time is already supported via the `minutes` variant of `CastingTime`. The surface is too narrow in four specific ways.

---

## 1. `OngoingOperation` — new variant for terrain illusion

**Current state:** `OngoingOperation = RollModifierOperation | DamageOnHitOperation`

**Gap:** Neither variant can carry "disguise the appearance of natural terrain in an area." The spell's persistent operation is sensory transformation of an area — not a roll modifier, not damage on hit.

**Proposed variant:**
```typescript
export type TerrainIllusionOperation = {
  readonly kind: "terrain_illusion";
  // The sensory channels affected: visual, auditory, olfactory.
  // Tactile is explicitly excluded by SRD text.
  readonly sensoryChannels: ReadonlyArray<"visual" | "auditory" | "olfactory">;
  // Manufactured structures, equipment, and creatures are unaffected.
  readonly excludes: ReadonlyArray<"structures" | "equipment" | "creatures">;
  readonly disbelieveCheck: DisbelieveCheck;
};
```

---

## 2. `Attachment.area` — cube shape support

**Current state:** `Attachment.area` only carries `{ kind: "sphere"; radiusFeet: number }`.

**Gap:** Hallucinatory Terrain targets a 150-ft Cube. `AnchorTarget` already has a `cube` shape variant, but `AnchorTarget` is not `Attachment` and cannot be reused here.

**Proposed fix:** Generalize `Attachment.area.shape` to a discriminated union:
```typescript
shape:
  | { readonly kind: "sphere"; readonly radiusFeet: number }
  | { readonly kind: "cube"; readonly sideFeet: number }
```

---

## 3. New v4 atom: `alter_terrain_appearance`

**Current v4 inventory:** `create_object` (creates a real object), `alter_item_kind` (applies to items). Neither covers making natural terrain appear, sound, and smell like different natural terrain.

**Proposed atom:** `alter_terrain_appearance` in the effect category.

This atom models a deterministic, sustained sensory transformation of an area of natural terrain. It is core mechanics: it determines what creatures perceive and what Investigation check they must beat to pierce the illusion.

---

## 4. New subgraph: disbelieve window

**Gap:** The spell grants creatures a way to pierce the illusion:
> "a creature examining the illusion can take the Study action to make an Intelligence (Investigation) check against your spell save DC to disbelieve it."

This requires a subgraph with no current representation:

```
alter_terrain_appearance --(opens_window)--> study_action_window
study_action_window --(grants)--> ability_check [INT Investigation vs caster spell save DC]
ability_check --(branches_on_check_success)--> disbelieve_effect [per-creature sees-through state]
ability_check --(branches_on_check_fail)--> none
```

**Missing pieces:**
- **`study_action_window`** (or a general `action_choice_window` with a named action filter) — no v4 window atom covers "when a creature chooses to take the Study action against this effect"
- **`disbelieve_effect`** — a per-creature state where the creature "sees a vague image superimposed on the real terrain"; not `apply_condition` (no matching `Condition` value), not `none` (the state is real and affects the creature's perception)
- **`branches_on_check_success` / `branches_on_check_fail`** relations — `ability_check` is in v4 as a resolution atom, but `branches_on_check` is not a listed relation (only `branches_on_save` and `branches_on_completion` exist)

---

## Encoding decision

No `.dhall` or `.json` was authored. The unit cannot be honestly encoded in the current surface. The closest attempt would require either:
- Using `roll_modifier` or `damage_on_hit` as a fake operation (dishonest trace)
- Using a `sphere` attachment (wrong shape)
- Omitting the disbelieve mechanic entirely (incomplete encoding)

All three options violate the honesty guardrails. The widening proposals above are the minimum set needed to encode this unit cleanly.

---

## SRD provenance

Source text: SRD 5.2.1, Spells/Descriptions-H#Hallucinatory Terrain
