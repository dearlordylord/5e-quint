# Proposal: Greater Restoration — Surface Widening

## Unit

- **Name**: Greater Restoration
- **Slug**: `greater_restoration`
- **Kind**: spell / Level 5 Abjuration
- **Casting**: Action, Touch, Instantaneous, V/S/M (consumed)

## Why the Unit Does Not Fit

Greater Restoration is an unconditional removal spell. The caster touches a creature and immediately removes one of five named effects. There is no attack roll, no saving throw, and no ongoing component.

### Gap 1: No unconditional ActivationPhase variant

The `activation` family is the only candidate for an instantaneous, one-shot spell with an action casting time. However, `ActivationPhase` is a closed union of `attack_roll | save_gate` — both of which require a dice-resolution gate. Greater Restoration delivers its effect unconditionally on touch. Encoding it with a fake `save_gate` (e.g., DC 0 CON save) would be dishonest and produce a misleading trace.

**Proposed**: Add `{ kind: "unconditional" }` as a new `ActivationPhase` variant with an `onApply: Effect` field. This covers a meaningful class of spells (restoration, utility, instant-buff) that have no roll.

### Gap 2: `Effect` union contains only `damage | none`

Greater Restoration's outcomes require four removal effect shapes, none of which exist in the `Effect` union:

| Effect | v4 atom | In surface? |
|--------|---------|-------------|
| Remove Charmed / Petrified | `remove_condition` | No |
| Remove 1 Exhaustion level | `remove_condition` (exhaustion as condition) | No |
| Restore HP max reduction | `modify_max_hp` | No |
| Remove a curse | (no v4 atom — see below) | No |
| Restore ability score reduction | (deferred in v4 §12) | No |

**Proposed**: Add `remove_condition`, `restore_max_hp` (or `modify_max_hp`) variants to `Effect`. These map to v4 atoms that already exist in the taxonomy but are not wired into the surface type.

### Gap 3: `Condition` type needs expansion

The current `Condition` type is `"prone"` only. Greater Restoration names `charmed`, `petrified`, and `exhaustion` (level-indexed). The `remove_condition` effect variant cannot be expressed without expanding this closed enum.

**Proposed**: Add `"charmed" | "petrified" | "exhaustion"` to `Condition`. Exhaustion is level-graded; a `remove_condition` for exhaustion would need a `levels: number` parameter (e.g., `{ condition: "exhaustion", levels: 1 }`).

### Gap 4 (atom): `remove_curse` — no v4 atom

Curse removal, including breaking attunement to a cursed magic item, is not covered by `remove_condition` (curses are not SRD 5.2.1 conditions). There is no `remove_curse` atom in v4. This is a new atom pressure from this spell (and from Remove Curse, which will appear in the survey).

**Proposed**: Promote `remove_curse` as a new v4 effect atom. It is mechanically distinct from condition removal: it targets a spell-applied curse or a cursed item's attunement binding.

### Gap 5 (atom): `restore_ability_score` — v4 deferred

v4 §12 explicitly defers `modify_ability_score` as out-of-scope ("modify_ability_score as a runtime effect versus as pre-runtime character state"). Greater Restoration's "any reduction to one of the target's ability scores" is direct pressure to define a bounded runtime form of this atom.

This is the only effect in the list that requires a truly new atom (not just surface wiring). The others (`remove_condition`, `modify_max_hp`) already exist in v4 and only need to be exposed in `types.ts`.

## Classification

`surface_widening` — primary gaps are missing variants of existing surface types (`ActivationPhase`, `Effect`, `Condition`). Secondary gaps (`remove_curse`, `restore_ability_score`) are atom-level, but they block only 2 of the 5 removal branches; the other 3 are unblocked by surface widening alone.

## Minimum Surface Additions to Encode Partial Coverage

If only the surface gaps are addressed (not the atom gaps), it would be honest to encode Greater Restoration with the 3 expressible effects and leave `remove_curse` and `restore_ability_score` as acknowledged omissions. Full coverage requires all five widenings.
