# Proposal: Antimagic Field widening gaps

## Classification: `atom_widening`

## What fits

The structural envelope maps cleanly onto the existing surface:

- **Family**: `ongoing_effect`
- **Attachment**: `{ kind: "area", shape: { kind: "emanation", radiusFeet: 10 }, origin: { kind: "self" } }`
- **Duration**: `{ kind: "concentration", upTo: { unit: "hour", amount: 1 } }`
- **Casting time**: `{ kind: "action" }`
- **Level / school**: 8 / abjuration

The teleportation/planar-travel clause maps to `block_travel` with an appropriate scope string. The existing `block_targeting` atom could partially cover external effects being unable to target things inside, though the full breadth is wider than its described use cases.

## What is missing

### 1. `suppress_spellcasting` (new atom)

**Gap**: No atom prevents creatures from casting spells or taking Magic actions. The closest surface elements are additive grants (`grant_extra_action`) or targeted blocks (`block_targeting`). Neither prohibits the act of spellcasting from within an area.

**SRD text**: "No one can cast spells, take Magic actions, or create other magical effects inside the aura"

**Proposed shape**:
```typescript
| {
    readonly kind: "suppress_spellcasting";
    // Optionally scope to specific action types if a future unit demands it.
    // For Antimagic Field: all spellcasting + Magic action + magical effects.
  }
```

**v4 taxonomy position**: Effect atom. Emits a new `suppress` → `spellcasting` edge to the area attachment.

---

### 2. `suppress_magic_item_properties` (new atom)

**Gap**: No atom suppresses the ongoing magical properties of magic items borne by creatures/objects inside an area. `block_targeting` is about what can be targeted, not about passive item properties being nullified.

**SRD text**: "Magical properties of magic items don't work inside the aura or on anything inside it."

**Proposed shape**:
```typescript
| {
    readonly kind: "suppress_magic_item_properties";
  }
```

**v4 taxonomy position**: Effect atom.

---

### 3. `suppress_ongoing_spells` (new atom — semantically distinct from `end_ongoing_spells`)

**Gap**: `end_ongoing_spells` *terminates* matching spells permanently. Antimagic Field *suspends* them: the spell pauses without ending, and its remaining duration continues draining while suppressed. When the creature leaves the aura the spell resumes. This is a fundamentally different operation with different downstream consequences.

**SRD text**: "Ongoing spells, except those cast by an Artifact or a deity, are suppressed in the area. While an effect is suppressed, it doesn't function, but the time it spends suppressed counts against its duration."

**Proposed shape**:
```typescript
| {
    readonly kind: "suppress_ongoing_spells";
    // Exception predicate: Antimagic Field carves out Artifact/deity origins.
    // A closed exception vocabulary matches the SRD's two named exceptions.
    readonly except?: ReadonlyNonEmptyArray<"artifact_origin" | "deity_origin">;
  }
```

**v4 taxonomy position**: Effect atom. The suppression lifecycle belongs to the ongoing_effect's area attachment — while a creature/effect is inside, the suppression is active; when it exits, it lifts.

---

### 4. `block_magic_area_ingress` (new atom)

**Gap**: `block_targeting` addresses creatures/things being targeted by external spells. No atom addresses external magical *areas of effect* being prevented from extending into a protected region. These are different spatial primitives.

**SRD text**: "Areas of effect created by spells or other magic can't extend into the aura"

**Proposed shape**:
```typescript
| {
    readonly kind: "block_magic_area_ingress";
  }
```

**v4 taxonomy position**: Effect atom. Mirrors `block_targeting` but operates on area boundaries rather than targeting chains.

---

## Clauses that could use existing atoms

| Clause | Existing atom | Notes |
|---|---|---|
| "no one can teleport into or out of it or use planar travel" | `block_travel` | `scope: "teleportation_and_planar_travel"` would be honest |
| "can't target or otherwise affect anything inside" | `block_targeting` | `scope` is a free string; covers the targeting half reasonably |
| Portals close temporarily | no atom needed | Transient world-state change; arguably DM-agenda/narrative |
| Dispel Magic has no effect on the aura | `none` sentinel; DM-agenda | This is a meta-rule about the spell's own immunity, not a mechanical effect the spell grants to others |

## Summary

Four new effect atoms are needed before Antimagic Field can be honestly encoded. The most critical is `suppress_ongoing_spells` — using `end_ongoing_spells` instead would be a factual error (ending ≠ suspending with duration countdown). The suppression semantic (pause-not-end, auto-resume on exit) does not exist anywhere in the current atom vocabulary.
