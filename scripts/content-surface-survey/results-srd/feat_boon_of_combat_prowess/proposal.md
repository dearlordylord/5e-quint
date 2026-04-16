# Proposal: Boon of Combat Prowess

## Outcome: `structural_widening`

The unit cannot be encoded. Two independent blockers prevent honest representation.

---

## Blocker 1 — Missing `FeatRecord` kind (structural)

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `FeatRecord`. The TAXONOMY defines `feat_root` as a source atom, but the surface has no corresponding record kind, mechanics header, or mechanics family. A feat cannot be expressed as any of the three existing kinds without lying about what it is.

### Minimum widening required

A `FeatRecord` needs at minimum:

```typescript
export type FeatRecord = UnitMetadata & {
  readonly kind: "feat";
  readonly mechanics: FeatMechanics;
};
```

`FeatMechanics` must cover at least:
- An optional ASI benefit (shared by most feats).
- An optional active rider (Peerless Aim shape: on-miss trigger → once-per-turn gated effect).
- Possibly a passive modifier (Alert-style initiative bonus, etc.).

The family shape is not settled — several feats have multiple orthogonal benefits (ASI + active rider + passive modifier). Whether `FeatMechanics` should be a union of single-benefit families or a compound struct with optional fields is an open design question.

---

## Blocker 2 — Missing `force_hit` atom (atom widening)

**Peerless Aim:** "When you miss with an attack roll, you can hit instead."

This mechanic triggers on an `on_miss_window` (the miss outcome of an attack roll) and converts the outcome from miss to hit. The conversion does not reroll and does not add a numeric bonus — it overrides the resolved outcome.

No existing v4 effect atom covers this:

| Atom | What it does | Why it doesn't fit |
|---|---|---|
| `modify_roll_numeric` | Adds die/flat to the roll value | Operates on roll value pre-resolution, not on miss outcome |
| `modify_roll_reroll` | Rerolls keeping higher/lower | Result is still random; this is deterministic |
| `modify_roll_substitute` | Replaces roll with a fixed value | Substitutes the *number rolled*, not the *hit/miss outcome* |
| `modify_roll_advantage` | Grants adv/disadv on the roll | Pre-resolution; adds no certainty of hitting |

A new atom is needed — tentatively `force_hit` or a new variant of `modify_roll_outcome`:

```
force_hit — On an on_miss_window, override the attack resolution outcome to hit.
             Attaches to the primary target. Gated by a use_count (once per turn).
```

**Subgraph shape (if atom existed):**

```
feat_root → on_miss_window → [gated by use_count once-per-turn] → force_hit → target
```

The `on_miss_window` atom already exists. The `use_count` with `turn_start_window` reset already exists (used by mastery `once_per_turn`). Only `force_hit` is new.

**Comparable pressure:** Rogue L20 Stroke of Luck ("If you miss with an attack roll, you can turn the miss into a hit") exercises exactly the same mechanic. Both need the same atom.

---

## Blocker 3 — Deferred `modify_ability_score` atom (atom widening, known)

**Ability Score Increase:** "Increase one ability score of your choice by 1, to a maximum of 30."

TAXONOMY §12 already records `modify_ability_score` as a known deferred atom:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state — currently treated as out-of-scope.

This is a pre-existing known gap, not a new finding. Every feat with an ASI benefit will hit the same wall. Resolving it requires a policy decision on whether ability score modification is a core-mechanics atom or character-progression metadata.

---

## Summary of proposed widenings

| Kind | Name | Urgency |
|---|---|---|
| `new_subgraph` | `FeatRecord` + `FeatMechanics` family | Blocks all feat encoding |
| `new_atom` | `force_hit` (or `modify_roll_outcome: miss_to_hit`) | Blocks Peerless Aim, Stroke of Luck |
| `new_atom` | `modify_ability_score` | Blocks all ASI-bearing feats (known deferred) |
