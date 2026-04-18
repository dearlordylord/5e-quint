# Proposal: Lay On Hands surface gaps

## Unit

**Lay On Hands** — Paladin class feature, level 1 (`srd-5.2.1 Classes/Paladin#Lay On Hands`)

## What typechecks and traces cleanly

The primary use — Bonus Action touch heal from the pool — encodes cleanly:

- `activation` family + `bonus_action` activation cost
- `charge_pool` resource with `linear_per_level` cap (`base=5, perLevel=5, axis="class"`)
- `long_rest` reset cadence
- `direct` phase → `heal_hp` with `amount: { kind: "resource_spent" }` targeting one creature

The `resource_spent` DiceAmount was explicitly designed for this pattern (the type comment cites Lay on Hands as the pressure case). The `linear_per_level` UseCountCap (type comment also cites Lay on Hands: "5 × your Paladin level") fits without widening. Typecheck passes; tracer runs without error.

## Gap 1 — Shared-pool alternative-mode activation (omitted mechanic)

**RAW text:**
> You can also expend 5 Hit Points from the pool of healing power to remove the Poisoned condition from the creature; those points don't also restore Hit Points to the creature.

**What is needed:**
The Poisoned-removal use is a second bonus-action activation that draws from the **same** charge pool as the heal use, but at a **fixed cost of 5 charges** instead of a variable player-chosen amount. The two uses are alternatives — on any given bonus action, the paladin chooses one.

**Why neither existing pattern works:**

1. **`CompositeClassFeatureMechanics` with two `ActivatedAbilityMechanics`**: Each part declares its own `resource` field, implying two separate pools. Dishonest — RAW is one pool shared across both uses.

2. **`CastTimeEffectModeChoice` inside a `direct` phase**: This lets the player choose between effect bundles at cast time, but all options share the single activation's charge cost. There is no per-option charge-cost field, so "mode A costs variable charges, mode B costs exactly 5" is not representable.

3. **Second `ActivatedAbilityMechanics` that references an existing pool**: No "pool reference" or "shared_pool_id" concept exists in the surface.

**Proposed widening:**

Add a `fixed_charge_cost: number` field to `CastTimeEffectModeChoice` options, or introduce a dedicated `alternative_activation_mode` variant on `ActivatedAbilityMechanics` that names which pool to draw from and at what fixed cost. The simplest minimal fix: allow `CastTimeEffectModeChoice` options to carry an optional `chargeCost: number` override (absent = variable/resource_spent; present = fixed amount deducted from pool). Then both uses can be expressed inside a single `direct` phase with the existing `charge_pool` resource.

**Classification:** `surface_widening` — the atoms (`heal_hp`, `remove_condition`, `charge`) all exist in v4; the missing piece is the charge-cost-per-mode variant.

## Gap 2 — Range field missing from `ActivatedAbilityMechanics`

**RAW text:**
> As a Bonus Action, you can **touch** a creature (which could be yourself)...

**What is needed:**
Lay on Hands has Touch range — the paladin must physically contact the creature. The surface has a `Range` type (`{ kind: "touch" }`) used by spell headers and `TriggeredReactionAbilityMechanics`, but `ActivatedAbilityMechanics` has no `range` field. The tracer hardcodes `range: { kind: "self" }` for all class-feature activations, so the generated trace labels the attachment `range Self` — factually wrong.

**Impact:**
The trace is misleading for any Touch-range class feature. The type system can't catch it because there's nowhere to put the correct range.

**Proposed widening:**
Add an optional `range?: Range` field to `ActivatedAbilityHeader` (which `ActivatedAbilityMechanics` extends). Absent = default "self" (preserving all existing encoded content). Present = override used by the tracer when labeling the attachment node.

Precedent: `TriggeredReactionAbilityMechanics` and `MagicItemSpawnedCreatureMechanics` both carry `range: Range`. `ActivatedAbilityMechanics` is the only activation family without it.

**Classification:** `surface_widening` — no new atom or family; the `Range` type already exists.
