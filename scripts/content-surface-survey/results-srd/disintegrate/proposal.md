# Proposal: Widening for Disintegrate

**Unit**: Disintegrate (6th-level Transmutation, srd-5.2.1)
**Outcome**: `atom_widening`

---

## What fits

The primary creature-targeting mechanic is fully expressible in the current surface:

- **Family**: `activation`
- **Phase**: `save_gate` — DEX save, `caster_spell_save_dc`
- **onFail**: `damage`, Force type, `linear_per_level` scaling:
  ```
  base: { dice: 10, dieSize: 6, flat: 40 }
  perLevel: { dice: 3 }
  axis: "slot"
  startingAtLevel: 6
  ```
- **onSuccess**: `none`
- **Attachment**: `target`, selection `{ mode: "one" }`
- **Duration**: instantaneous
- **Casting time**: action

All of this typechecks and would produce a clean trace for the save-gate subgraph.

---

## What does not fit

### Gap 1 — No `on_zero_hp_window` atom

Disintegrate's disintegration effect is **not** a save outcome — it is a conditional that fires only when the spell's damage crosses a specific HP threshold:

> "If this damage reduces it to 0 Hit Points, it and everything nonmagical it is wearing and carrying are disintegrated into gray dust."

The current `Effect` union (`DamageEffect | NoneEffect`) is resolved immediately on the save branch. There is no hook for "after damage resolves, if target HP dropped to exactly 0, open a secondary window." The closest v4 atoms (`on_hit_window`, `post_roll_window`) do not express a threshold condition.

**Proposed atom**: `on_zero_hp_window` — a window that opens after a damage effect resolves, gated on the damage having reduced the target to 0 HP. This parallels `on_hit_window` but fires on a different condition. The atom would sit in the `window` category.

### Gap 2 — No `apply_permanent_destruction` effect atom

The disintegration state produced by the `on_zero_hp_window` is mechanically distinct from normal death:

> "The target can be revived only by a True Resurrection or a Wish spell."

This restricts the resurrection spell set available to the party (Revivify, Raise Dead, and Resurrection all fail). Additionally, equipment worn and carried is also destroyed. This is not a condition (no SRD condition called "disintegrated"), not transport or exile (the creature isn't moved), and not `apply_condition` (no matching condition variant exists or would be appropriate).

**Proposed atom**: `apply_permanent_destruction` (effect category) — represents the state of being reduced to ash/dust: no body, no carried items, restricted revival path. The engine needs to track this to correctly gate resurrection spell effectiveness.

### Gap 3 — No object-targeting / auto-effect phase (secondary)

The spell has a separate resolution path for nonmagical objects and magical force constructs:

> "This spell automatically disintegrates a Large or smaller nonmagical object or a creation of magical force. If such a target is Huge or larger, this spell disintegrates a 10-foot-Cube portion of it."

Objects do not make saving throws, so the `save_gate` phase does not apply. The surface has no:
- Attachment variant for `object` targets in spell context
- Phase kind that expresses "unconditional effect, no resolution step"

This would require either a new `ActivationPhase` kind (e.g., `auto_effect`) or a guard on existing phase kinds to allow bypassing resolution for certain target categories.

This gap is secondary to gaps 1–2: an engine could plausibly scope the spell's creature mechanic first and handle object-targeting as a separate authoring concern. But for honest full encoding all three gaps must be closed.

---

## Encoding decision

**Did not produce** `content/disintegrate.dhall`, `content/disintegrate.json`, or `content/disintegrate.trace.md`.

Encoding only the save-gate → Force-damage subgraph would produce a trace indistinguishable from Circle of Death minus the area, or any other damage-on-save spell at level 6. The on-0-HP disintegration is the defining mechanic of this spell; omitting it would be a misleading trace per the protocol guardrails.

---

## Suggested v4 atom additions

| Atom | Category | Justification |
|------|----------|---------------|
| `on_zero_hp_window` | window | HP-threshold conditional window after damage resolution; generalizes to other "if this kills the target" patterns (e.g., Finger of Death's zombie rider) |
| `apply_permanent_destruction` | effect | Special death state with restricted revival and equipment loss; distinct from normal 0-HP death |

The `on_zero_hp_window` + `apply_permanent_destruction` pair would also serve Finger of Death (zombie if humanoid killed), Power Word Kill (no save death), and similar "kill-condition rider" spells — so this is broader than a single-unit pressure case.
