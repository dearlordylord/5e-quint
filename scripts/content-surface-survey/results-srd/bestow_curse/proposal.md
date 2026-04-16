# Proposal: Bestow Curse — surface_widening

## Why this unit was not encoded

Bestow Curse cannot be encoded honestly in the current surface. The spell's core mechanic is:

> You touch a creature. It makes a WIS save. On failure it becomes cursed — the **caster chooses one of four distinct curse effects** at cast time.

The `choose` v4 procedure atom exists in `TAXONOMY_atoms_graph.md` but is entirely absent from `types.ts` and `tracer.ts`. There is no `ActivationPhase`, `EffectAtom` variant, or composition pattern in the current surface that can represent "pick one of N alternative persistent effect packages at cast time." Encoding a single option and dropping the other three would produce a misleading trace.

---

## Proposed widenings

### 1. Cast-time choice subgraph (`new_subgraph`)

**Atom:** `choose` (v4 procedure atom, already in taxonomy)

The caster picks exactly one curse effect from an authored list when the spell is cast. This is a permanent binding choice, not a runtime branch — the chosen effect is the one that persists for the duration.

Proposed surface shape:

```typescript
export type ChoiceOption = {
  readonly label: string;
  readonly effects: ReadonlyArray<EffectAtom>;
};

export type CastTimeChoice = {
  readonly kind: "cast_time_choice";
  readonly options: ReadonlyArray<ChoiceOption>;
};
```

This would be usable as an `EffectAtom` variant or as a new `ActivationPhase` kind. The tracer would emit a `choose` procedure node with edges to each option's effect cluster.

---

### 2. Ability-scoped roll modifier (`new_variant`)

**Extends:** `modify_roll_advantage` / `modify_roll_numeric`

Option 1 applies disadvantage only to ability checks and saving throws made with a **specific ability the caster designates at cast time**. The current `on: ReadonlyArray<RollKind>` has no ability filter.

Proposed addition to `modify_roll_advantage`:

```typescript
| {
    readonly kind: "modify_roll_advantage";
    readonly mode: "advantage" | "disadvantage";
    readonly on: ReadonlyArray<RollKind>;
    readonly abilityFilter?: Ability;  // if present, restricts to that ability's rolls
  }
```

This is `surface_widening` — `modify_roll_advantage` exists, a new optional field is needed.

---

### 3. Caster-relative attack scope (`new_variant`)

**Extends:** `modify_roll_advantage`

Option 2 imposes disadvantage only on attack rolls **directed at the caster**, not all attack rolls. Current `modify_roll_advantage` has no target-scope restriction.

Proposed addition:

```typescript
readonly targetScope?: "against_caster" | "all";  // default "all"
```

---

### 4. Per-turn repeat save (`new_variant`)

**Atom:** `repeat_save` (v4 Resolution atom, missing from `types.ts`)

Option 3 triggers a WIS save at the start of each of the target's turns. This is a recurring resolution, not a one-shot save. The v4 taxonomy lists `repeat_save` explicitly.

Proposed surface shape (as an `EffectAtom` or standalone `ActivationPhase`):

```typescript
| {
    readonly kind: "repeat_save";
    readonly trigger: "turn_start";
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: EffectAtom;
    readonly onSuccess: EffectAtom;
  }
```

---

### 5. Force-action effect (`new_atom`)

Option 3's save failure compels the target to take the Dodge action on that turn. This is distinct from:
- `apply_condition` — no standard condition mandates Dodge
- `restrict_action_set` — that removes choices; this mandates a specific one
- `grant_extra_action` — that grants an additional action to another creature

No v4 atom covers "compel the target to spend its action on a specific `StandardActionKind`." This is a genuine `atom_widening`.

Proposed:

```typescript
| {
    readonly kind: "force_action";
    readonly action: StandardActionKind;
  }
```

Candidate v4 name: `compel_action` or `force_action` — not currently in the taxonomy.

---

### 6. Slot-conditional duration (`new_variant`)

The spell's duration and concentration status both shift by slot level:

| Slot | Concentration | Duration |
|------|---------------|----------|
| 3    | yes           | 1 min    |
| 4    | yes           | 10 min   |
| 5–6  | no            | 8 hr     |
| 7–8  | no            | 24 hr    |
| 9    | no            | until dispelled |

The current `Duration` type has no slot-conditional shape. A threshold-tiers duration variant is needed where the `kind` (`concentration` vs `timed`) itself can change by slot level.

---

## Summary

| Gap | Kind | v4 coverage |
|-----|------|-------------|
| Cast-time choice from N effects | `new_subgraph` | `choose` atom exists in taxonomy |
| Ability-scoped roll disadvantage | `new_variant` | `modify_roll_advantage` exists |
| Caster-relative attack scope | `new_variant` | `modify_roll_advantage` exists |
| Per-turn repeat save | `new_variant` | `repeat_save` atom exists in taxonomy |
| Force-action effect | `new_atom` | Not in v4 taxonomy |
| Slot-conditional duration kind | `new_variant` | `Duration` type exists, needs tier variant |

Primary classification: **`surface_widening`** — the cast-time choice subgraph (`choose`) is in v4 but absent from the TS surface. The force-action effect is additionally `atom_widening`, but the dominant blocker is the choice mechanism.
