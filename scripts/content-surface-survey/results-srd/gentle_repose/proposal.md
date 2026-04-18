# Proposal: `freeze_deadline` atom (Gentle Repose widening)

## Unit

Gentle Repose — SRD 5.2.1, Level 2 Necromancy spell.

## What encodes cleanly

| Mechanic | Encoding |
|---|---|
| "can't become Undead" | `block_reanimation` EffectAtom (already in types.ts) |
| Timed 10-day duration | `duration: { kind: "timed", value: { unit: "day", amount: 10 } }` |
| Casting Time: Action or Ritual | `castingTime: { kind: "action", ritual: true }` |
| Target: corpse or remains | `attachment: { kind: "object", count: 1 }` |
| Material component (consumed) | `components.materialConsumed: true` |

"Protected from decay" is DM-agenda narrative (no mechanical atom models physical decay).

## The missing mechanic

> "The spell also effectively extends the time limit on raising the target from the dead, since days spent under the influence of this spell don't count against the time limit of spells such as Raise Dead."

This is a cross-spell deadline interaction: for each day Gentle Repose persists on the corpse, the 10-day window of *Raise Dead* (or similar revival spells) does not advance. In mechanical terms, the spell **freezes the elapsed-time counter** of an adjacent effect.

No existing EffectAtom in v4 models this. The closest candidates fall short:

- `block_reanimation` — prevents the corpse from becoming undead; does not touch Raise Dead's deadline.
- `remove_condition` / `grant_condition_immunity` — condition-scoped; deadlines are not conditions.
- `modify_roll_numeric` / `modify_roll_advantage` — roll modifiers; no deadlines.

## Proposed atom: `freeze_deadline`

```typescript
// Suspends the elapsed-time progress of a named adjacent spell or
// effect while the host spell persists. For each in-game day the host
// persists, the named effect's countdown does not advance by one day.
// Gentle Repose: freezes the Raise Dead (and similar revival spells)
// 10-day resurrection window while the target is under the host spell.
//
// `forSpellFamily` is a closed descriptor naming which deadline(s) are
// frozen. Kept as a string tag rather than a specific spellId so the
// atom generalizes to the SRD resurrection family (Raise Dead,
// Resurrection, True Resurrection, Revivify) without enumerating each.
| {
    readonly kind: "freeze_deadline";
    readonly forSpellFamily: "resurrection_window";
  }
```

### v4 taxonomy fit

This concept does not appear in the v4 atom taxonomy (`TAXONOMY_atoms_graph.md`). It is not a scaling atom, a roll modifier, a condition modifier, or an HP/AC modifier. It is a novel interaction on a **spell-duration timeline**. A potential v4 family home would be in the **Effect Atoms** section as a lifecycle-adjacent effect: "pause the elapsed-time progress of an adjacent spell window."

### Scope

Single-unit pressure so far (Gentle Repose is the only SRD spell with this mechanic). However, the resurrection spell family (Raise Dead, Revivify, Resurrection) all have timed windows that DMs track, and any future "preserve corpse" mechanics would also need this. Worth adding as a first-class atom.

### Alternative: `dm_agenda` treatment

If the project decides that resurrection-window tracking is inherently DM-owned (the deadline is narrated, not enforced by the engine), this mechanic could be classified as DM-agenda and permanently omitted. That would make Gentle Repose a `dm_agenda` outcome on this clause rather than `atom_widening`. The `block_reanimation` encoding would remain valid regardless.
