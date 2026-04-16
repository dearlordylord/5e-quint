# Widening Proposal: Cloak of Arachnida

**Unit slug:** `magic_item_cloak_of_arachnida`
**Outcome:** `structural_widening`
**Confidence:** high

---

## Why this unit cannot be encoded honestly

The content surface (`src/surface/types.ts`) defines `UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `MagicItemRecord` variant and no `magic_item` family anywhere in the type system. The tracer's exhaustive `switch` on `unit.kind` would throw `"unhandled unit kind"` for any `magic_item` record. No honest encoding exists at the current surface — the blocker is structural, not cosmetic.

Even if a `MagicItemRecord` kind were added, five further widenings would be required before the Cloak of Arachnida could be encoded fully and honestly. All six gaps are described below in dependency order.

---

## Gap 1 — MagicItemRecord + `magic_item` UnitRecord kind (new subgraph)

**What the SRD says:** The Cloak of Arachnida is a Wondrous Item, Very Rare (Requires Attunement). It is a magic item with a distinct acquisition model, attunement requirement, and activation cadence — none of which map onto the spell/class-feature/mastery lifecycle.

**What the surface has:** `UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`. The v4 taxonomy (`TAXONOMY_atoms_graph.md`) exposes a `magic_item_root` source atom but there is no corresponding TypeScript type, Dhall schema, or tracer branch.

**What is needed:** A new `MagicItemRecord` discriminated union member with at minimum: `kind: "magic_item"`, item category (wondrous/armor/weapon/…), rarity, attunement flag, and a properties array. This is a new subgraph — it affects types.ts, the Dhall package, the tracer, and likely the interpreter pipeline.

---

## Gap 2 — `passive_bundle` mechanics family (new subgraph)

**What the SRD says:** "While wearing this cloak… you gain the following benefits." Four distinct always-on passive effects are granted simultaneously for as long as the item is worn and attuned:
1. Spider Climb — Climb Speed equal to your Speed, hands-free vertical/ceiling movement
2. Spider Walk — immunity to web restraint + move through web difficult terrain freely
3. Web Sense — tremorsense 10 ft. over any surface connected by a web
4. Web casting — cast *Web* once per dawn (DC 13, doubled area)

**What the surface has:** Existing mechanics families (`spell_cast`, `class_feature`, `mastery`) model single-procedure activations: you spend a resource, a procedure runs, an effect resolves. None models a bundle of heterogeneous always-on passives gated only by wearing + attunement.

**What is needed:** A `passive_bundle` family (or equivalent attunement-passive container) that can hold multiple simultaneous effect records, each active for the duration of wear + attunement, with no activation procedure of their own. This is architecturally distinct from any existing family and requires a new mechanics subgraph.

---

## Gap 3 — `RestResetCadence: dawn` (new variant)

**What the SRD says:** "Once used, this property can't be used again until the next dawn."

**What the surface has:** `RestResetCadence` covers `short_or_long_rest | long_rest | short_rest | partial_short_full_long`. All variants reset on a rest. Dawn is a time-of-day event independent of rest.

**What is needed:** A new `"dawn"` variant in `RestResetCadence` (or an equivalent `DawnResetCadence` type). This is a surface-level variant gap, but it is blocked by Gap 1 (no magic item kind) and Gap 2 (no passive_bundle family to host the resource field).

---

## Gap 4 — `charge` resource kind (new variant)

**What the SRD says:** The Web casting property consumes a single per-dawn charge. This is mechanically distinct from `use_count` (which resets on rest) and from `spell_slot` (which is a pooled class resource).

**What the surface has:** `types.ts` resource discriminants: `spell_slot` and `use_count`. The v4 taxonomy includes a `charge` atom, but it is not exposed in the TypeScript surface.

**What is needed:** A `"charge"` resource kind in `types.ts`, paired with the `dawn` reset cadence from Gap 3. Together they model the "once-per-dawn charge" pattern that appears on many magic items. This is a narrow variant addition but is structurally dependent on Gaps 1–3.

---

## Gap 5 — Climb Speed effect variant (new atom)

**What the SRD says:** "You have a Climb Speed equal to your Speed and can move up, down, and across vertical surfaces and along ceilings, while leaving your hands free."

**What the surface has:** `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. Neither grants a typed movement speed. The v4 taxonomy lists a `modify_speed` atom, but there is no speed-kind discriminant (`"climb"` vs `"fly"` vs `"swim"` vs `"burrow"`), and `ClassFeatureEffect` does not include any speed-granting variant.

**What is needed:** Either a new `GrantClimbSpeedEffect` variant (analogous to the v4 `modify_speed` atom) or a generic `GrantTypedSpeedEffect` with a `speed_kind: "climb" | "fly" | "swim" | "burrow"` discriminant. This is a new atom addition to the effect vocabulary.

---

## Gap 6 — Web immunity / terrain traversal immunity atom (new atom)

**What the SRD says:** "You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."

**What the surface has:** The v4 taxonomy has a `block_travel` atom modeling movement impediment, but no atom for _immunity to a specific restraint type_ or _terrain traversal override for a named terrain kind_. Neither `ClassFeatureEffect` nor any v4 atom covers "immune to being restrained by webs" or "treat web terrain as normal terrain."

**What is needed:** A new narrow effect atom — something like `TraversalImmunityEffect` with a `terrain_kind: "web"` discriminant, or a two-part encoding: `ConditionImmunityEffect(restrained_by_web)` + `TerrainTraversalEffect(web, normal)`. This is a new atom addition with no existing surface analog.

---

## Dependency summary

```
Gap 1 (MagicItemRecord kind)
  └── Gap 2 (passive_bundle family)
        ├── Gap 3 (dawn reset cadence)
        │     └── Gap 4 (charge resource)
        ├── Gap 5 (climb speed atom)
        └── Gap 6 (web immunity atom)
```

All six gaps must be resolved before any honest encoding of the Cloak of Arachnida is possible. The Web casting sub-mechanic (DC 13 save, doubled *Web* area) is the only property that partially overlaps an existing mechanics family (a spell cast with a save), but even that requires Gaps 3 and 4, and the doubled-area modifier has no surface encoding either.

---

## Recommended widening order

1. Add `MagicItemRecord` and `magic_item` kind to `types.ts` + tracer
2. Design `passive_bundle` mechanics family schema (Dhall + TS)
3. Add `"dawn"` to `RestResetCadence`
4. Add `"charge"` resource kind
5. Add typed speed effect variant (climb / fly / swim / burrow)
6. Add web-immunity / terrain-traversal-immunity atom

Steps 3–6 are narrow additions once the structural skeleton (1–2) exists.
