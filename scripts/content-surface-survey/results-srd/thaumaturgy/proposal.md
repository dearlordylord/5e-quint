# Thaumaturgy — Widening Proposal

## Outcome: `structural_widening`

Thaumaturgy cannot be honestly encoded in the current surface. Three distinct gaps block it, one structural and two narrower.

---

## Gap 1 — No "choose-from-menu" spell family (structural_widening)

The spell presents 6 named effects; the caster picks one per cast:

> "You create one of the effects below within range. If you cast this spell multiple times, you can have up to three of its 1-minute effects active at a time."

No existing family represents this shape:

| Family | Why it fails |
|---|---|
| `activation` | `phases: ReadonlyArray<ActivationPhase>` — sequential steps, not a player-chosen menu |
| `ongoing_effect` | Single attachment + single operation; cannot express 6 distinct named options |
| `triggered_reaction` | Reaction-shaped; doesn't apply |
| `anchored_trigger` | Planted trigger; doesn't apply |

A new family (tentatively `effect_menu`) would need to express:
- A named list of effect options with individual durations (1-minute or instantaneous)
- Caster selects one option per cast invocation
- Stacking rule: up to N concurrent instances of duration-bearing effects active at once

---

## Gap 2 — Missing `ability_check` in `RollKind` (surface_widening)

**Booming Voice**: "You have Advantage on Charisma (Intimidation) checks."

`RollKind` currently:
```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

Ability checks are a third distinct resolution type. Adding `"ability_check"` would let this rider use the existing `modify_roll_advantage` effect atom. This is a small standalone widening that would benefit multiple spells granting advantage on skill/ability checks (Guidance, Enhance Ability, etc.).

---

## Gap 3 — Cosmetic/narrative effects (dm_agenda per ARCHITECTURE.md)

Five of the six effects have no deterministic mechanical resolution:

| Effect | Nature | Classification |
|---|---|---|
| Altered Eyes | Cosmetic appearance change | dm_agenda |
| Fire Play | Cosmetic light/color manipulation | dm_agenda |
| Tremors | Cosmetic environmental flavor | dm_agenda |
| Phantom Sound | Narrative sound creation | dm_agenda |
| Invisible Hand | Object-state manipulation (door open ↔ closed) | edge case — see below |

**Invisible Hand edge case**: This deterministically changes the state of an environmental object. The v4 attachment atom `object` exists but there is no effect atom for altering object state. Whether this belongs in core (as `alter_object_state`) or remains dm_agenda (as an environmental interaction the DM adjudicates) is an open design question. The current ruling in ARCHITECTURE.md leans toward dm_agenda for environmental manipulation.

---

## Recommendation

Do not encode Thaumaturgy until Gap 1 (the `effect_menu` family) is resolved.

Gap 2 (`ability_check` in `RollKind`) is a small, independently justified widening — resolve it if other pressure cases appear (Guidance, Enhance Ability, Bane's penalty on ability checks).

Even after all widenings, only Booming Voice would produce a traceable mechanical atom (`modify_roll_advantage` on `ability_check`). The remaining five effects would remain dm_agenda or require a new `alter_object_state` effect atom.
