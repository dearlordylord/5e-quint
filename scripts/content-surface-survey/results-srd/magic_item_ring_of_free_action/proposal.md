# Proposal: atom_widening for Ring of Free Action

## Unit

**Ring of Free Action** — `magic_item`, Rare, requires attunement.

> While you wear this ring, Difficult Terrain doesn't cost you extra movement. In addition, magic can neither reduce any of your Speeds nor cause you to have the Paralyzed or Restrained condition.

## Family fit

The record shape fits cleanly: `magic_item` / `PassiveMechanics` / `requiresAttunement: true` / `rarity: "rare"`. The structural envelope is not the problem. Three atom-level gaps block honest encoding.

---

## Gap 1 — `ignore_difficult_terrain` (new atom)

**Kind:** `new_atom`

**SRD text:** "Difficult Terrain doesn't cost you extra movement."

**Why no existing atom fits:**
Difficult Terrain is a movement-economy rule: each foot of movement in difficult terrain costs 2 feet of Speed. Ignoring this is categorically different from having more Speed (`modify_speed`) or a different Speed (`set_speed`/`set_speed_ratio`). It is not representable as any additive or multiplicative Speed modifier — the exemption applies to a specific movement-cost calculation rule, not to the Speed stat itself.

The TAXONOMY survey (section 12) already flagged `difficult_terrain` as genuinely new atom pressure with 2 hits. This unit is a third hit from a different unit kind (magic item vs. spell/feat).

**Proposed atom:**
```typescript
| {
    readonly kind: "ignore_difficult_terrain";
  }
```

No parameters needed: the SRD grants blanket difficult terrain immunity (no distance cap, no terrain type filter).

---

## Gap 2 — `block_speed_reduction` (new atom)

**Kind:** `new_atom`

**SRD text:** "magic can neither reduce any of your Speeds"

**Why no existing atom fits:**
`block_max_hp_reduction` exists as the HP analogue: it prevents `modify_max_hp` with `direction: "decrease"` from landing. No parallel atom exists for Speeds. Additionally, this protection is *source-gated* (magic only) — a mundane Slow effect (if one existed non-magically) would not be blocked. No existing speed atom carries a source filter.

**Proposed atom:**
```typescript
| {
    readonly kind: "block_speed_reduction";
    readonly source: "magic";  // closed enum; widen if non-magic source appears
  }
```

The `source` field is required (not optional) so authors don't accidentally author unconditional speed-reduction immunity when the rule says magic-only.

---

## Gap 3 — `grant_condition_immunity` needs a `sourceFilter` variant

**Kind:** `new_variant`

**SRD text:** "magic can neither... cause you to have the Paralyzed or Restrained condition"

**Why the existing atom doesn't fit:**
```typescript
| {
    readonly kind: "grant_condition_immunity";
    readonly condition: Condition;
  }
```
This is unconditional immunity. The ring only blocks *magically-imposed* Paralyzed and Restrained. A creature could still be physically grappled (imposing Restrained via the grapple rules), and that grapple does not originate from magic. Using the unconditional atom would be dishonest — it over-states the protection.

**Proposed variant:**
```typescript
| {
    readonly kind: "grant_condition_immunity";
    readonly condition: Condition | ReadonlyNonEmptyArray<Condition>;
    readonly sourceFilter?: "magic";  // absent = unconditional (existing behavior)
  }
```

Adding an optional `sourceFilter` field preserves backward compatibility (absent = unconditional, as today) while expressing the ring's scoped protection.

---

## Design note: unified "magic-source protection" pattern

Gaps 2 and 3 are both "magic cannot impose X" shapes. This suggests a shared design pattern worth considering before individual atoms are added:

**Option A:** Add `sourceFilter?: "magic"` to multiple existing atoms (`grant_condition_immunity`, and any future speed-blocking atom). Simple extension, low disruption.

**Option B:** Add a new `block_magic_imposition` atom that takes a list of what magic cannot do:
```typescript
| {
    readonly kind: "block_magic_imposition";
    readonly blocks: ReadonlyNonEmptyArray<
      | { readonly kind: "condition"; readonly condition: Condition }
      | { readonly kind: "speed_reduction" }
    >;
  }
```

Option B would let the ring's three protections (conditions + speed) read as a single coherent "magic immunity" bundle in the trace, which matches how the SRD authors the rule ("magic can neither... nor..."). Option A is more composable with existing atoms.

---

## Summary

| Gap | Classification | Priority |
|-----|---------------|----------|
| `ignore_difficult_terrain` | new atom | medium (3rd survey hit) |
| `block_speed_reduction` (magic) | new atom | medium |
| `grant_condition_immunity` sourceFilter | new variant | medium |

None of these require a new payload family. The unit is otherwise a clean `magic_item` / `passive` record.
