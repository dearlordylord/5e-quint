# Proposal: Spider Climb — surface_widening

## Unit

**Spider Climb** — Level 2 Transmutation spell (SRD 5.2.1, `srd52: true`)

> "Until the spell ends, one willing creature you touch gains the ability to move up, down, and across vertical surfaces and along ceilings, while leaving its hands free. The target also gains a Climb Speed equal to its Speed."
> Using a Higher-Level Spell Slot: You can target one additional creature for each spell slot level above 2.

## What fits

| Component | Surface expression | Status |
|---|---|---|
| Family | `ongoing_effect` | ✓ fits |
| Casting time: Action | `castingTime: { kind: "action" }` | ✓ fits |
| Range: Touch | `range: { kind: "touch" }` | ✓ fits |
| Duration: Concentration, up to 1 hour | `duration: { kind: "concentration", upTo: { unit: "hour", amount: 1 } }` | ✓ fits |
| Components: V, S, M | `components: { v: true, s: true, m: "..." }` | ✓ fits |
| Target: one willing creature | `attachment: { kind: "target", selection: { mode: "one" } }` | ✓ fits (base) |
| Higher-level: +1 creature per slot above 2 | `selection: { mode: "choose_up_to", count: { kind: "linear", base: 1, perSlotAboveBase: 1, baseLevel: 2 } }` | ✓ fits |
| **Operation: grant Climb Speed = Speed** | **No variant in `OngoingOperation`** | ✗ MISSING |

## What is missing

### Gap 1: `OngoingOperation` has no `modify_speed` variant

```typescript
// Current OngoingOperation:
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Spider Climb's operation is neither a roll modifier nor a damage-on-hit rider. It grants a **movement mode** (Climb Speed) to the target for the spell's duration. The v4 atom taxonomy already contains `modify_speed` (§9 Effect Atoms), but `OngoingOperation` has no variant that maps to it.

**Proposed addition:**

```typescript
export type ModifySpeedOperation = {
  readonly kind: "modify_speed";
  readonly speedKind: "climb" | "fly" | "swim" | "burrow";
  readonly value: SpeedValue;
};

export type SpeedValue =
  | { readonly kind: "equal_to_walk" }              // Spider Climb, Fly (in some variants)
  | { readonly kind: "fixed_feet"; readonly feet: number }  // Longstrider (+10 ft)
  | { readonly kind: "plus_feet"; readonly delta: number };

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifySpeedOperation;    // new
```

### Gap 2: `SpeedValue.equal_to_walk` — relative-to-stat speed

Spider Climb's Climb Speed is not a fixed number — it equals the target's walking Speed at runtime. This is a distinct pattern from "add 10 feet" (Longstrider). The surface needs a way to express "speed of this movement type = current walk speed."

Comparator spells that would share this operation:
- **Fly** — grants a Fly Speed of 60 feet (fixed; `SpeedValue: { kind: "fixed_feet", feet: 60 }`)
- **Longstrider** — increases Speed by 10 feet (`plus_feet`)
- **Spider Climb** — grants Climb Speed = Speed (`equal_to_walk`)
- **Water Walk** — grants walk-on-water (movement mode, no speed change; different shape)

## Classification

`surface_widening` — the `ongoing_effect` family is correct; all structural components (concentration, touch, slot-scaled target count) fit existing types. The single missing piece is a new `OngoingOperation` variant and a `SpeedValue` union to express movement-mode grants whose speed is derived from the target's own Speed stat.

## Tracer impact

Once `ModifySpeedOperation` is added, the trace would emit:
- `modify_speed` effect atom (maps to existing v4 atom)
- `scale_target_count` scaling atom (slot axis, +1/slot above 2)
- Standard `ongoing_effect` graph: `activate → concentration_lock`, `concentrate → expire`, `target attachment`

No new v4 atoms are required — only a new surface variant.
