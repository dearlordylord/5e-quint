# Proposal: Ring of Spell Storing

**Outcome**: `structural_widening`

## Why the unit cannot be honestly encoded

The Ring of Spell Storing is a **dynamic spell reservoir**: its content is determined at runtime by external actors, and its output uses borrowed caster stats. This combination requires three new concepts that are absent from the current surface.

### Gap 1 — No mechanism for spell input by an external caster

The ring accepts spells cast into it by *any* creature, not the attuned wearer. No existing trigger or operation covers "another creature casts a spell while touching this item, which absorbs the spell rather than resolving it." The current `OngoingTrigger` vocabulary (`passive`, `on_caster_attack_hit`, `on_attached_turn_start`, `on_caster_turn_start`, `on_attached_damaged`, `on_creature_moves`, `on_creature_enters_area`) has no entry for this.

**SRD text**: *"Any creature can cast a spell of level 1 through 5 into the ring by touching the ring as the spell is cast."*

### Gap 2 — No dynamic spell identity in `grant_spell_access`

`grant_spell_access` requires a fixed `spellId` string known at authoring time. The ring stores arbitrary spells chosen at runtime; the spell identity is a runtime variable, not a compile-time constant. A `stored_dynamic` mode (or an equivalent mechanism referencing the reservoir's current contents) is needed.

**SRD text**: *"While wearing this ring, you can cast any spell stored in it."*

### Gap 3 — No borrowed-caster-stats semantics

When the wearer releases a stored spell, it resolves using the **original caster's** derived values (slot level, spell save DC, spell attack bonus, spellcasting ability), not the wearer's. No existing `SpellAccessMode` variant or `EffectAtom` captures this. The surface has no mechanism to record that a cast uses another creature's stats.

**SRD text**: *"The spell uses the slot level, spell save DC, spell attack bonus, and spellcasting ability of the original caster but is otherwise treated as if you cast the spell."*

### Gap 4 — Spell-level capacity pool

The 5-level capacity is consumed in variable chunks (1–5 per stored spell). `charge_pool` tracks a flat numeric count; it has no concept of "this charge expenditure corresponds to a particular stored spell with its borrowed caster identity." A spell-level-capacity variant of `ChargePoolResource` is needed.

**SRD text**: *"The ring can store up to 5 levels worth of spells at a time. The level of the slot used to cast the spell determines how much space it uses."*

## Proposed surface widening

A new **`spell_reservoir`** subgraph (or `stored_spell` family of atoms) is needed:

1. **`stored_spell` attachment** — already in the v4 taxonomy but absent from `types.ts`. Represents the ring as a container of spell payloads.
2. **`receive_spell_into_item` operation** — triggered when any creature casts a spell while touching the item. Absorbs the spell (with its slot level and caster identity) into the reservoir rather than resolving it. Emits to `stored_spell` attachment.
3. **`SpellAccessMode.stored_dynamic`** (or equivalent) — a variant of `grant_spell_access` that releases whichever spell is currently in a reservoir slot rather than requiring a fixed `spellId`.
4. **Borrowed-caster-stats field** — added to the release operation to record that the released spell uses the original caster's save DC, attack bonus, and spellcasting ability.
5. **`charge_pool` spell-level variant** — a capacity pool where each stored payload consumes `slotLevel` charges, and each payload carries its own caster identity for borrowed-stats resolution.

## Relationship to existing taxonomy

- The v4 taxonomy lists `stored_spell` as an attachment atom (§3). This proposal realizes that atom in the TS surface and adds the surrounding subgraph it implies.
- All other proposed atoms are new to both the TS surface and the v4 taxonomy.
- The GM-chosen initial reservoir state ("1d6−1 levels of stored spells chosen by the GM") is DM agenda and stays out of core regardless of the widening.
