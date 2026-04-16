# Web — Surface Widening Proposal

**Unit:** Web (level 2 Conjuration, SRD 5.2.1)
**Outcome:** `surface_widening`
**Closest existing family:** `ongoing_effect` (SpellMechanics)

---

## What fits

- Top-level `kind: "spell"` ✓
- `family: "ongoing_effect"` ✓ (concentration, persistent area effect)
- `attachment: { kind: "area", shape: { kind: "sphere" ... } }` — close, but the area is a **Cube**, not a sphere. Minor shape gap (see note below).
- `duration: { kind: "concentration", upTo: { unit: "hour", amount: 1 } }` ✓
- `castingTime: { kind: "action" }` ✓
- `range: { kind: "point", feet: 60 }` ✓
- `components: { v: true, s: true, m: "a bit of spiderweb" }` ✓
- `level: 2`, `school: "conjuration"` ✓

---

## Gap 1 — `Condition` type missing `"restrained"`

**File:** `src/surface/types.ts`

```typescript
export type Condition = "prone";
```

Web's core mechanical outcome is applying the **Restrained** condition. This is a hard type-level block — `"restrained"` cannot be expressed in any valid `SaveGateRiderResult` or equivalent.

**Proposed fix:**
```typescript
export type Condition = "prone" | "restrained";
```

This is a closed enum addition; no structural change required.

---

## Gap 2 — `OngoingOperation` has no save-gate variant

**File:** `src/surface/types.ts`

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Web's operation is: *when a creature enters the area or starts its turn there → open a DEX save gate → on failure apply Restrained*.

Neither `roll_modifier` (modifies a roll with a DiceDelta) nor `damage_on_hit` (rider damage when the caster hits) can express this. A new variant is needed:

**Proposed new variant:**
```typescript
export type AreaSaveGateOperation = {
  readonly kind: "area_save_gate";
  readonly trigger: AreaEventTrigger;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: SaveGateRiderResult;
  readonly onSuccess: SaveGateRiderResult;
  readonly escapeCheck?: AreaEscapeCheck;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | AreaSaveGateOperation;
```

---

## Gap 3 — No area-event trigger type for per-creature-per-turn save gates

Web's save gate fires on **two distinct sub-events** per creature per turn:
- First time the creature **enters** the area on its turn
- Creature **starts its turn** in the area

The existing `AnchoredEvent` has `enters_area` but is designed for one-shot release from `anchored_trigger`. Ongoing area spells need a different closed enum of per-creature triggers:

**Proposed new type:**
```typescript
export type AreaEventTrigger =
  | { readonly kind: "enter_or_turn_start" }  // Web, Spike Growth, Spirit Guardians
  | { readonly kind: "enter_only" }
  | { readonly kind: "turn_start_only" };
```

This trigger type belongs on `AreaSaveGateOperation` (Gap 2) and potentially other future area operation variants.

---

## Gap 4 — No escape-check mechanic

Web includes an active escape option:
> "A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC. If it succeeds, it is no longer Restrained."

This pattern — *spend an action, make an ability/skill check vs. spell DC, remove a condition on success* — appears in several area-control spells (Web, Evard's Black Tentacles, Entangle, etc.) and needs surface representation.

**Proposed new type:**
```typescript
export type AreaEscapeCheck = {
  readonly kind: "ability_check";
  readonly ability: Ability;
  readonly skill?: string;       // "athletics", "acrobatics", etc.
  readonly dc: DcSource;
  readonly removes: Condition;
  readonly cost: { readonly kind: "action" } | { readonly kind: "bonus_action" };
};
```

This would be an optional field on `AreaSaveGateOperation`.

---

## Gap 5 (minor) — Area shape `"cube"` not in `Attachment`

The `area` attachment only supports `{ kind: "sphere" }`:
```typescript
readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };
```

Web's area is a 20-foot Cube. The `AnchorTarget` type already has a cube shape:
```typescript
{ readonly kind: "area"; readonly shape: { readonly kind: "cube"; readonly maxSideFeet: number } }
```

**Proposed fix:** Add `{ kind: "cube"; sideFeet: number }` to the `shape` discriminated union inside `Attachment.area`.

---

## Gap 6 (omitted riders — dm_agenda boundary)

**Terrain effects (Difficult Terrain + Lightly Obscured):** These are positional/environmental state modifiers. Per ARCHITECTURE.md, terrain state is caller-owned, not core mechanics. Omitted as dm_agenda territory.

**Flammability (2d4 fire damage when webs burn):** This is a conditional interaction between the web object and a fire source — a secondary damage rider that fires when the area is subjected to fire. This could eventually be modeled as a conditional `activation` triggered by a fire-exposure event, but it requires:
- An `object` attachment or `area` + `fire_exposure_event` window (neither in v4)
- The damage itself (2d4 fixed, fire type) is representable once the trigger is
- Omitted from this proposal as a deferred gap; not core to the Restrained/save-gate mechanic.

---

## v4 Atom coverage

The `area_save_gate` operation would trace through existing v4 atoms cleanly:
- `activate` procedure → `area` attachment → `area_save_gate` operation (new surface type, not a new atom)
- `save_gate` resolution atom ✓ (exists in v4)
- `apply_condition` effect atom ✓ (exists in v4, needs `"restrained"` value)
- `ability_check` resolution atom ✓ (exists in v4, for the escape check)

No new v4 atoms are proposed. All four gaps are surface-type variants or new surface-type shapes that compose from existing v4 atoms.
