# Proposal: Calm Emotions — atom_widening

## Unit

- Slug: `calm_emotions`
- Kind: spell, level 2 enchantment
- Provenance: srd-5.2.1

## Outcome

`atom_widening` — two v4 atoms are missing that the spell's primary mechanic requires.  
Additional surface gaps (creature type filter, per-target caster choice, `Condition` widening) must also be resolved before this unit can be cleanly encoded.

## Why the unit cannot be honestly encoded

### 1. Missing atom: `grant_condition_immunity` (atom_widening)

The spell grants immunity to the Charmed and Frightened conditions for its duration.

> "The creature has Immunity to the Charmed and Frightened conditions until the spell ends."

No v4 atom covers this.  
- `grant_resistance` exists but is damage-type only.  
- `apply_condition` and `remove_condition` exist but neither expresses immunity.  
- v4 taxonomy has no `grant_condition_immunity` entry.

A new effect atom `grant_condition_immunity` is required, taking a set of conditions and a duration scope.

### 2. Missing atom: `suppress_condition` (atom_widening)

The spell suppresses already-active conditions — it does not remove them. They return when the spell ends.

> "If the creature was already Charmed or Frightened, those conditions are suppressed for the duration."

The v4 `suppress` procedure atom exists but it is a procedure, not an Effect atom applicable to a condition on a target. The surface's `Effect` union (and the tracer's `traceEffect`) has no variant for suspending a condition while leaving it on the creature's sheet for post-duration reinstatement.

A new effect atom `suppress_condition` is required, distinct from `remove_condition`.

### 3. Condition type widening needed: `charmed`, `frightened` (surface_widening)

The surface `Condition` closed enum currently contains only `"prone"`. Encoding immunity-to and suppression-of conditions for this spell requires adding `"charmed"` and `"frightened"`.

### 4. Missing surface variant: creature type filter on area Attachment (surface_widening)

The spell affects only Humanoids within the sphere:

> "Each Humanoid in a 20-foot-radius Sphere..."

The `area` Attachment has no filter predicate for creature type. Without it, the trace would incorrectly imply the spell affects all creature types.

A `creatureTypeFilter` field on `Attachment` (or a new attachment variant) would be needed.

### 5. Missing subgraph: per-target caster choice on save_gate (surface_widening)

On a failed save, the caster chooses **per creature** which of two effects applies:

> "must succeed on a Charisma saving throw or be affected by one of the following effects (choose for each creature)"

The existing `save_gate` phase has a single `onFail: Effect`. There is no structure for a caster-chooses-per-target branching within the same resolution. This would require either a new `onFail` shape (e.g., `{ kind: "caster_choice"; options: Effect[] }`) or a new phase subgraph.

### 6. Secondary effect: Indifferent attitude (dm_agenda sub-effect)

> "The creature becomes Indifferent about creatures of your choice that it's Hostile toward."

NPC attitude (Hostile/Indifferent/Friendly) is DM-adjudicated social state. It has behavioral consequences (the creature may stop attacking) but the resolution is narrative, not deterministic. This sub-effect is `dm_agenda` and should not be modeled in core mechanics. Even if all atom and surface gaps were filled, this sub-effect would be noted as out-of-scope for the engine.

## Proposed widening summary

| Kind | Name | Priority |
|---|---|---|
| `new_atom` | `grant_condition_immunity` | Required |
| `new_atom` | `suppress_condition` | Required |
| `new_variant` | `Condition: charmed \| frightened` | Required (unblocks atom encoding) |
| `new_variant` | `creature_type_filter` on area Attachment | Required for correct scope |
| `new_subgraph` | `per_target_caster_choice` on save_gate | Required for per-creature branching |
| dm_agenda | Indifferent attitude effect | Out-of-scope for core |
