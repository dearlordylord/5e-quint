# Item Property Validation Matrix v0

Purpose:

- validate `TAXONOMY_atoms_graph.md` against the last untouched source root (`item_property_root`);
- stress the Cross-Rule Composition (H) and Cross-Rule Rewrite (N) subgraphs, which item properties pressure more than any other source kind;
- confirm whether any weapon property forces a missing atom that masteries, feats, and class features did not surface.

This pass completes source-root coverage for the SRD corpus.

## Why This Sample

The full SRD 5.2.1 weapon property catalog is only 9 units (plus mastery properties already validated separately). A single-round pass over all 9 is the right scope.

Item properties are the purest cross-rule composition source in the corpus:

- most do not produce a fresh effect;
- most modify the way another rule (Attack action, attack rolls, reach, ability modifier selection, ammunition use) resolves;
- several are referenced by name in feats (Great Weapon Fighting: `Two-Handed` / `Versatile`; Two-Weapon Fighting: `Light`) and masteries (Nick: `Light`) already validated;
- together they provide the densest cross-rule pressure in a single small sample.

If `v3` is holding, item properties should fit as composition with at most narrow policy observations. If not, a final atom-level gap will surface here.

## Canonical Sample

1. `Ammunition`
2. `Finesse`
3. `Heavy`
4. `Light`
5. `Loading`
6. `Reach`
7. `Thrown`
8. `Two-Handed`
9. `Versatile`

Source text: `.references/srd-5.2.1/Equipment.md`, section "Properties".

## Single-Group Structure

All 9 properties fit in a single group because the sample is small and the shape is uniform: each property is a scoped rule that modifies how the weapon interacts with core rules (Attack action, attack rolls, ability selection, range, grip, ammunition). The single-group file is `item-property-validation/ROUND_1.md`.

## Validation Questions

For each property, check:

1. which `v3` nodes and edges actually fit?
2. does it produce a fresh effect or rewrite another rule's behavior?
3. does the existing Cross-Rule Composition (H) and Cross-Rule Rewrite (N) subgraph coverage hold, or does any property surface a new shape?
4. does ammunition tracking pressure a new atom for resource consumption that isn't covered by `consumes` + `use_count`?
5. does the Light property's extra-attack grant compose with the mastery (Nick) and feat (Two-Weapon Fighting) rules already validated?

## Expected Pressure Areas

- Cross-Rule Rewrite validated densely across `Heavy`, `Light`, `Finesse`, `Versatile`, `Thrown`, `Loading`;
- attack-count modification via Light (cross-reference with Extra Attack from class features);
- ability-modifier selection via Finesse (grip and stat choice);
- range modification via Reach (attacker-reach rewrite);
- ammunition consumption via Ammunition (resource shape in a light-touch form);
- grip-gated damage increase via Versatile.

## Outcome Rule

If the pass exposes only:

- cross-rule composition and rewrite cases expressible with existing atoms and existing subgraphs;
- narrow observations like ammunition half-recovery cadence;

then `v3` closes out at the top level and the only remaining taxonomy decision is whether to promote the typed scaling split from `v3`'s recorded residue to `v4`.

If the pass exposes a structurally missing atom, record it before closing out.
