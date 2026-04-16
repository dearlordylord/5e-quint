# Proposal: Water Walk widening requirements

## Outcome: `atom_widening`

Water Walk (3rd-level Transmutation) fits the `ongoing_effect` spell family header cleanly:
- Level 3, school `transmutation`, casting time action, range point 30 ft, VSM, duration timed 1 hour (non-concentration).

The spell cannot be honestly encoded because `OngoingOperation` has no variant that expresses a **traversal capability grant**.

---

## Gap 1 — New atom: `grant_traversal_mode` (blocking)

**Classification:** `atom_widening`

`OngoingOperation` is `RollModifierOperation | DamageOnHitOperation`. Water Walk's ongoing operation is neither. It grants creatures the ability to treat liquid surfaces as harmless solid ground.

The v4 atom inventory has:
- `grant_hover` — for flight-mode grants
- `modify_speed` — numeric speed change
- `block_travel` — preventing movement through a surface

None cover "walk over a surface type that would normally require swimming or cause harm." A new atom is needed:

```
grant_traversal_mode:
  surfaceKind: "liquid"
  treatAs: "harmless_solid"
```

This atom would also need a corresponding `OngoingOperation` variant in the surface type:

```typescript
export type GrantTraversalModeOperation = {
  readonly kind: "grant_traversal_mode";
  readonly surfaceKind: "liquid";
  readonly harmless: boolean;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | GrantTraversalModeOperation;
```

**Evidence:** "move across any liquid surface—such as water, acid, mud, snow, quicksand, or lava—as if it were harmless solid ground"

---

## Gap 2 — New subgraph: bonus-action mode-transition gate (secondary)

**Classification:** `atom_widening` (subgraph)

Water Walk has a secondary mechanic that is also unrepresentable: affected targets must spend a Bonus Action to deliberately pass from the liquid surface into the liquid (and vice versa). Falling in bypasses this gate.

This is a **per-target ongoing mode-switch cost** — not an activation cost on the spell, but a recurring resource cost the *affected creature* pays to transition modes. No existing subgraph models this.

The shape needed:
```
grant_traversal_mode → optional_gate(bonus_action) → enter_liquid
```

where the gate is owned by the affected creature, not the caster.

**Evidence:** "An affected target must take a Bonus Action to pass from the liquid's surface into the liquid itself and vice versa, but if the target falls into the liquid, the target passes through the surface into the liquid below."

---

## Gap 3 — Surface widening: `CastingTime.action` missing ritual flag

**Classification:** `surface_widening`

Water Walk is a 1-Action cast with the Ritual tag. Current `CastingTime`:
```typescript
| { readonly kind: "action" }      // no ritual field
| { readonly kind: "minutes"; readonly amount: number; readonly ritual: boolean }
```

There is no way to flag a standard-action spell as also ritually castable. The fix:
```typescript
| { readonly kind: "action"; readonly ritual?: boolean }
```

Note: Alarm (1-minute cast) was correctly encoded as `{ kind: "minutes", amount: 1, ritual: true }` because Alarm's base cast time is a minute. Water Walk's base cast is genuinely 1 Action — a separate flag is required.

---

## Gap 4 — Surface widening: fixed target count in `choose_up_to`

**Classification:** `surface_widening` (minor)

`TargetSelection.choose_up_to.count` is typed as `SlotScaling<number>`, which implies slot-level scaling. Water Walk has a fixed cap of 10 with no slot scaling. A fixed-count mode is needed:

```typescript
export type TargetSelection =
  | { readonly mode: "one" }
  | { readonly mode: "choose_up_to"; readonly count: number | SlotScaling<number> };
```

Or a dedicated fixed variant. Using `{ kind: "linear", base: 10, perSlotAboveBase: 0, baseLevel: 3 }` technically typechecks but is semantically dishonest — it implies a scaling schema exists with 0 scaling.

---

## Summary table

| Gap | Classification | Blocking? |
|-----|---------------|-----------|
| `grant_traversal_mode` atom + `OngoingOperation` variant | `atom_widening` | Yes |
| Bonus-action mode-transition gate subgraph | `atom_widening` | Yes (secondary mechanic) |
| `CastingTime.action` ritual flag | `surface_widening` | No (header gap) |
| Fixed count in `choose_up_to` | `surface_widening` | No (minor) |

The dominant gap is `atom_widening`. Do not author dhall/json until `OngoingOperation` is widened to include traversal grants.
