# Proposal: Jump — surface_widening

## Unit

- **Slug:** jump
- **Name:** Jump
- **Kind:** spell
- **Source:** srd-5.2.1 (`srd52: true`)
- **School:** Transmutation

## Outcome

`surface_widening`

## What fits

Jump maps structurally to the `ongoing_effect` spell family:

| Field | Value | Fits? |
|---|---|---|
| Casting time | Bonus Action | ✓ `bonus_action` |
| Range | Touch | ✓ `{ kind: "touch" }` |
| Duration | 1 minute (not concentration) | ✓ `{ kind: "timed", value: { unit: "minute", amount: 1 } }` |
| Attachment | one target (or more via slot) | ✓ `choose_up_to` with `SlotScaling<number>` base=1, perSlotAboveBase=1, baseLevel=1 |
| Slot scaling | +1 target per slot above 1 | ✓ same shape as Bless |
| Family | persistent rider on target | ✓ `ongoing_effect` |

## What is missing

The core mechanic — "can jump up to 30 feet by spending 10 feet of movement" — is a movement enhancement, not a roll modifier and not damage on hit.

`OngoingOperation` is currently:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant is an honest encoding:
- `roll_modifier` adds dice to attack rolls or saving throws. Jump does not touch rolls.
- `damage_on_hit` deals typed damage when the caster hits a creature. Jump deals no damage.

## Proposed widening

Add a new `OngoingOperation` variant for movement modification:

```typescript
export type ModifyMovementOperation = {
  readonly kind: "modify_movement";
  readonly mode: "jump";
  // Maximum jump distance the target may cover in one jump
  readonly maxDistanceFeet: number;
  // Movement budget the target spends to perform that jump
  readonly movementCostFeet: number;
};
```

Or, if a broader `modify_movement` is premature, a narrower `grant_jump` variant:

```typescript
export type GrantJumpOperation = {
  readonly kind: "grant_jump";
  readonly maxDistanceFeet: number;
  readonly movementCostFeet: number;
};
```

### Tracer atom

The v4 atom `modify_speed` (Effect Atoms, §9) exists and is the closest match. However, jump distance is mechanically distinct from walking/flying/swimming speed in SRD 5.2.1 — it describes how the creature converts movement into distance jumped, not the creature's speed stat. If `modify_speed` is broadened to cover jump distance, no new atom is needed; the widening is purely a new `OngoingOperation` variant in the surface. If jump distance is treated as a separate concept, a new atom `modify_jump_distance` would be needed (atom_widening).

Conservative read: `modify_speed` is sufficient; the widening is `surface_widening` only.

## Confidence

High. The `ongoing_effect` structural fit is unambiguous. The gap is exactly one missing `OngoingOperation` variant. No other surface shape in the current types.ts can honestly encode a persistent movement-enhancement rider.
