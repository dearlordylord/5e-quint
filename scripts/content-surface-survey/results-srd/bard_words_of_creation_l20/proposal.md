# Proposal: Words of Creation (Bard L20) — atom_widening

## Unit

**Class feature** — Bard level 20, SRD 5.2.1, section `Classes/Bard#Words of Creation`.

## What encodes cleanly

Two `grant_spell_access` atoms with `mode: "prepared"` in a `passive` mechanics family cover the always-prepared clause:

```json
{ "kind": "grant_spell_access", "spellId": "power_word_heal", "mode": "prepared" }
{ "kind": "grant_spell_access", "spellId": "power_word_kill", "mode": "prepared" }
```

Typecheck passes. Tracer emits a valid graph.

## What does not encode

> "When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target."

This clause adds a **second eligible target** whenever the bard casts either named spell through this feature. The second target must be within 10 feet of the primary target.

### Why no existing atom fits

- **`grant_spell_access.targetRestriction`** — restricts or re-anchors the target of a granted spell access path. It cannot *extend* the target count or *add* a proximity-bounded second target.
- **`scale_target_count`** — scales target count with spell slot level (e.g. Bless at higher slot). Not applicable here; neither spell has a variable target count in its base definition, and this feature is not a slot-scaling modifier.
- **`modify_roll_numeric` / `modify_roll_advantage`** — wrong domain entirely (d20 rolls, not targeting).
- No v4 effect atom models "when you cast spell X (by any means), you may choose an additional creature within N feet of the primary target."

### Shape of the missing concept

The missing surface extension is a modifier that scopes to a specific spell cast event and widens the target set by one, bounded by proximity to the primary target. Two candidate shapes:

**Option A — new field on `grant_spell_access`:**

```typescript
{
  readonly kind: "grant_spell_access";
  readonly spellId: string;
  readonly mode: SpellAccessMode;
  // ... existing fields ...
  readonly additionalTargets?: {
    readonly count: number;
    readonly maxFeetFromPrimary: number;
  };
}
```

This would express "when casting through this access grant, up to N additional creatures within X feet of the primary target may also be targeted."

**Option B — new effect atom `extend_cast_target_count`:**

```typescript
| {
    readonly kind: "extend_cast_target_count";
    readonly spellId: string;
    readonly additionalCount: number;
    readonly maxFeetFromPrimary: number;
  }
```

A passive grant that modifies the targeting of a named spell whenever cast (regardless of which access path is used). This is slightly broader than Option A — the SRD text says "when you cast either spell," not "when you cast it via this prepared grant," so Option B may be more faithful.

### Precedent

The warlock Contact Patron (L9) follows the same partial-encoding pattern: the always-prepared + once-per-long-rest grants encode cleanly; the "auto-succeed on the spell's saving throw" rider does not fit and is recorded as a widening. The same approach is applied here.

## Classification

`atom_widening` — the mechanics family (`passive`), kind (`class_feature`), and existing atoms (`grant_spell_access`) are all present in the surface. The gap is a missing atom or field for proximity-bounded target-count extension of a named spell cast.
