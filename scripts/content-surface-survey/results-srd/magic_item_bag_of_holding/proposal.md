# Proposal: Bag of Holding — structural_widening

## Why this unit does not fit

### Gap 1 — No `magic_item` record kind (blocking)

`UnitRecord` is `SpellRecord | ClassFeatureRecord | MasteryRecord`. There is no `MagicItemRecord`. The harness cannot typecheck a magic item JSON against any existing schema, so no Dhall/JSON can be authored honestly.

The v4 taxonomy (`TAXONOMY_atoms_graph.md`) lists `magic_item_root` as a source atom and records all source-root atoms as validated. The taxonomy assumes a `magic_item` kind exists in the surface; the surface has not yet been widened to match.

**Minimum change required:** Add `MagicItemRecord` to `UnitRecord` with a metadata header (rarity, attunement flag, item type) and a `mechanics` field pointing to a new mechanics family union.

---

### Gap 2 — No mechanics family for passive container items

The Bag of Holding's core mechanic is extradimensional storage:

> "This bag has an interior space considerably larger than its outside dimensions — roughly 2 feet square and 4 feet deep on the inside. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 5 pounds, regardless of its contents."

This is a **passive property**, not an activation, an ongoing effect, a triggered reaction, or a mastery rider. The existing spell and class-feature families all require a procedure atom (`activate`, `respond`, `store`) as the root of the mechanics graph. A passive container has no procedure — it is an ambient property of the item when carried.

A `passive_property` family would need to model:
- Storage capacity constraints (weight limit, volume limit)
- Weight override (the bag always weighs 5 lbs regardless of contents)
- Air supply (10 minutes of breathable air, divided by breathing creatures inside)
- Retrieve cost (Utilize action to retrieve an item)

The retrieve cost is the only sub-mechanic that maps to an existing atom (`action_quota`), but it is still a utility operation rather than a combat-facing activation.

**Proposed family:** `passive_container` with fields: `capacityLbs`, `capacityVolumeCuFt`, `carriedWeightOverride`, `airSupplyMinutes`, `retrievalCost`.

---

### Gap 3 — No mechanics family for item-interaction destruction with planar gate

> "Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other. Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane. The gate then closes."

This mechanic:
- Has no casting time (it fires instantly on an inventory interaction)
- Has no activation cost paid by the wielder
- Destroys both involved items (a mutual-destruction trigger)
- Creates a one-way planar gate (a `transport_exile` effect from v4, but applied to all creatures in a sphere, not a targeted creature)
- Is triggered by a world-state condition (item placed inside a named category of item), not by a creature's action

The closest v4 subgraph would be `anchored_trigger`, but Alarm's anchor is planted by a creature on a location/area with a cast-time procedure. The Bag of Holding's interaction trigger is implicit in the item's properties — it fires whenever any creature (not the item's wielder) performs the placement.

**Proposed shape:** A new `item_interaction_trigger` family with:
- `trigger`: condition that fires (e.g., `placed_inside_extradimensional_space`)
- `onFire`: sequence of effects including `destroy_self`, `destroy_host_item`, `open_planar_gate` with area and transport parameters

---

## Relationship to v4 taxonomy

| v4 atom | Applicable? | Note |
|---|---|---|
| `magic_item_root` | yes | Source root exists in v4; surface hasn't caught up |
| `action_quota` | partial | Retrieve via Utilize action uses this, but it's a utility operation |
| `transport_exile` | partial | The gate effect transports creatures to a random plane — this v4 atom covers the destination but not the triggering pattern |
| `create_object` | no | The gate is not an object in the mechanical sense |

No new v4 atoms are needed — `transport_exile` and `action_quota` cover the sub-mechanics. The gap is entirely at the surface level: missing record kind and missing mechanics families.

## Recommended widening tier

This is a **surface widening** once the record kind is added, but because the record kind itself is missing it presents as `structural_widening`. The mechanics gaps (passive_container, item_interaction_trigger) are new mechanics families, not new atoms. If the surface is widened to add `MagicItemRecord` and these two families, the Bag of Holding can be honestly encoded without needing any new v4 atoms.
