# Proposal: Gentle Repose — atom_widening

## Outcome

`atom_widening` — the spell's core mechanics cannot be honestly expressed in the current surface. No Dhall or JSON was authored.

## What the spell does

Gentle Repose (Necromancy 2, Action, Touch, 10 days timed, ritual-eligible) touches a corpse or remains and produces three distinct effects for the duration:

1. **Prevent decay** — the corpse does not physically deteriorate.
2. **Block undead transformation** — the corpse cannot become Undead.
3. **Pause resurrection timer** — days spent under the spell don't count against the time limit of Raise Dead and similar spells.

## Why it doesn't fit the current surface

### Gap 1 — No v4 atom for blocking a state transition

"Can't become Undead" is a deterministic mechanical block on a creature-type state transition. The v4 taxonomy has no atom for this. The closest candidates:

- `apply_condition` — applies SRD conditions (Prone, etc.); creature-type changes are not conditions.
- `block_targeting` — prevents a spell or effect from targeting the creature; orthogonal.
- `remove_condition` — removes conditions; doesn't block transformations.

A new atom is needed. Working name: **`block_state_transition`**, parameterised by what transition is blocked (e.g., `undead_reanimation`). This is a new effect atom, not in v4.

### Gap 2 — No `object` attachment variant in `types.ts`

The v4 taxonomy lists `object` as an attachment atom, but `types.ts` `Attachment` union only has `self | target | area | mark`. The spell targets a corpse (an object), not a living creature. Using `target` would be dishonest: the `TargetSelection` grammar assumes a creature context (attack rolls, saving throws, conditions).

**Fix:** Add `{ readonly kind: "object"; readonly description: string }` to the `Attachment` union, or promote `object` from the v4 taxonomy to `types.ts`.

### Gap 3 — `OngoingOperation` is closed and has no matching variant

`OngoingOperation = roll_modifier | damage_on_hit`. The effects above require a third operation variant (something like `apply_passive_effect` or `grant_persistent_block`). This is a `surface_widening` of `OngoingOperation` that goes alongside the atom gap.

## What is legitimately DM-agenda

The "pause resurrection timer" mechanic ("days don't count against Raise Dead's time limit") is cross-spell bookkeeping. There is no combat-engine evaluation, no deterministic outcome gate, and no runtime state that the engine owns. Per `ARCHITECTURE.md`, this is the caller's (DM/narrative layer) responsibility. It should be noted in the spell's description but does not require a new atom.

## Proposed widenings

| Kind | Name | Justification |
|---|---|---|
| `new_atom` | `block_state_transition` | Block undead transformation is a deterministic mechanical effect with no v4 atom |
| `new_variant` | `Attachment: object` | Corpse/remains is an object, not a creature; `target` is an honest mismatch |
| `new_variant` | `OngoingOperation: apply_passive_effect` (or similar) | `ongoing_effect` family needs an operation variant for passive protective effects |

## Recommendation

Once `object` attachment and `block_state_transition` are added (with appropriate `OngoingOperation` widening), Gentle Repose can be encoded as `ongoing_effect` with:

- `attachment: { kind: "object", description: "corpse_or_remains" }`
- `operation: { kind: "apply_passive_effect", effects: ["block_state_transition:undead_reanimation"] }`
- Duration: `timed { unit: "day", amount: 10 }`
- The resurrection-timer clause stays in `description` only (DM-agenda).
