# Proposal: Daylight — atom_widening

## Unit

**Name:** Daylight  
**Slug:** daylight  
**Kind:** spell (srd-5.2.1)  
**Level:** 3 · **School:** Evocation · **Duration:** 1 hour (timed, not concentration)

---

## Why the unit doesn't fit

Daylight has four distinct encoding problems, listed from most blocking to least:

---

### 1. Missing effect atom: illumination (blocking — atom_widening)

Daylight's entire mechanical purpose is creating sunlight in an area. No v4 effect atom covers environmental lighting:

- `damage` — wrong kind of effect entirely
- `grant_sense` — grants a sense to a creature, not a zone property
- `negate_named_effect` — negates a specific spell, not how light works
- `create_object` — light is not a physical object

Illumination has deterministic mechanical consequences in 5e SRD:
- It suppresses the mechanical effects of magical Darkness when areas overlap
- It affects Hiding (Stealth) eligibility
- It interacts with conditions like Blinded

This makes it **not** a `dm_agenda` outcome — these are deterministic engine inputs.

**Proposed atom:** `create_light_zone`

Shape sketch:
```typescript
export type CreateLightZoneOperation = {
  readonly kind: "create_light_zone";
  readonly brightLightRadiusFeet: number;
  readonly dimLightAdditionalFeet: number;  // dim light halo beyond bright
  readonly lightKind: "sunlight" | "magical";  // sunlight matters for vampires, Darkness suppression
};
```

This would extend `OngoingOperation` and be handled by a new tracer branch.

---

### 2. Missing attachment: `object` (surface_widening)

Daylight's alternative mode attaches to a physical object (not worn or carried). The light then emanates from the object and can be blocked by covering it.

`Attachment` in `types.ts` is `self | target | area | mark`. The `object` attachment atom **exists in v4 taxonomy** but is absent from the surface type.

```
"Alternatively, you cast the spell on an object that isn't being worn or carried..."
```

**Required widening:** Add `{ kind: "object" }` to the `Attachment` union in `types.ts`.

---

### 3. Missing area shape: `emanation` (surface_widening)

When attached to an object, Daylight fills a 60-foot **Emanation** — an area that moves with the object, not a fixed sphere at a static point.

`Attachment.area.shape` in `types.ts` only supports `{ kind: "sphere"; radiusFeet: number }`. Emanation is mechanically distinct:
- Origin tracks a creature or object (mobile origin)
- Can be blocked by covering the origin object

```
"causing the sunlight to fill a 60-foot Emanation originating from that object. Covering that object with something opaque, such as a bowl or helm, blocks the sunlight."
```

**Required widening:** Add `{ kind: "emanation"; radiusFeet: number }` to the area shape union.

---

### 4. Missing operation: conditional dispel (surface_widening / atom_widening)

Daylight automatically dispels any overlapping spell of darkness with spell level ≤ 3. This fires passively on spatial overlap — not via a reaction, not by targeting a specific spell.

Existing atoms that don't fit:
- `negate_named_effect` — targets a specific spell by `spellId: string`, not by level/type criteria
- `suppress` — suspends a named effect, not a conditional dispel
- `triggered_reaction` — requires the caster to act; this is passive

```
"If any of this spell's area overlaps with an area of Darkness created by a spell of level 3 or lower, that other spell is dispelled."
```

**Proposed new OngoingOperation variant:** `conditional_dispel`

Shape sketch:
```typescript
export type ConditionalDispelOperation = {
  readonly kind: "conditional_dispel";
  readonly condition: "overlapping_area";
  readonly targetCriteria: {
    readonly maxSpellLevel: number;         // ≤ 3 for Daylight
    readonly requiresTag: "darkness";       // closed enum; widen as needed
  };
};
```

This could be classified as `surface_widening` (new variant of an existing operation family) or `atom_widening` depending on whether the taxonomy needs a new atom for the conditional dispel resolution shape.

---

## Summary of proposed widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_atom` | `create_light_zone` | Yes — core effect has no v4 atom |
| 2 | `new_variant` | `Attachment.object` | Surface — v4 atom exists, surface missing |
| 3 | `new_variant` | `Attachment.area.shape.emanation` | Surface — needed for object mode |
| 4 | `new_variant` | `OngoingOperation.conditional_dispel` | Surface (possibly atom) |

---

## What a clean encoding would need

1. `create_light_zone` added to v4 atom inventory and to `OngoingOperation` in `types.ts`
2. `object` added to `Attachment` union in `types.ts`
3. `emanation` added to area shape discriminant in `types.ts`
4. `conditional_dispel` added to `OngoingOperation` in `types.ts`

With all four in place, Daylight would encode as an `ongoing_effect` spell:
- `attachment`: either `area / sphere / point_within_range` (point mode) or `object` (object mode) — the two modes would likely require a new family variant or a union attachment field
- `operation`: `create_light_zone` (primary) + `conditional_dispel` (secondary)
- `duration`: `timed / 1 hour`

The two-mode nature (point vs. object attachment, chosen at cast time) is itself a minor structural question — it might be representable as two entries or require a `choose` procedure atom to model the cast-time selection honestly.
