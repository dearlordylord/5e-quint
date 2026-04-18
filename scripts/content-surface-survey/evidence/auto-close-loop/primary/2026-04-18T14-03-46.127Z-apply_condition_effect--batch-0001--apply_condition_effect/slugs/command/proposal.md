# Proposal: Command (surface_widening)

## Unit

**Command** — Level 1 Enchantment spell (SRD 5.2.1)

## What fits

The spell maps cleanly onto `activation` family with a `save_gate` phase:

- Casting time: `action`
- Range: `point`, 60 ft
- Duration: `instantaneous`
- Phase: WIS save, DC = caster spell save DC, target selection fits `choose_up_to` with slot-scaling (Bless pattern)
- On success: `none`

The multi-target upcasting (+1 target per slot above 1) fits `SlotScaling<number>` exactly as Bless uses it.

## What doesn't fit

### Gap 1: `apply_condition` absent from spell `Effect`

The mastery surface has `apply_condition` in `SaveGateRiderResult`, but the spell surface `Effect` union only allows:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

Grovel requires `{ kind: "apply_condition"; condition: "prone" }` on a failed save. This cannot typecheck.

**Widening needed:** Add `apply_condition` to spell `Effect` (same shape as in mastery `SaveGateRiderResult`).

### Gap 2: `force_move` absent from spell `Effect`

Approach and Flee impose directed movement on the target. The v4 atom `force_move` covers this semantically, but it is not present in the surface `Effect` union.

**Widening needed:** Add a `force_move` variant to spell `Effect`. Minimally:
```typescript
{ kind: "force_move"; direction: "toward_caster" | "away_from_caster"; stopWithin?: number }
```

### Gap 3: No `restrict_turn_on_target` in spell `Effect`

Halt suppresses the target's movement, action, and bonus action on its turn. The existing `restrict_action_set` atom targets the *caster's* extra action grant (Action Surge pattern) — it does not model restricting another creature's own turn.

**Widening needed:** Either a new `restrict_turn` variant in `Effect`, or a generalized `restrict_action_set` with a `target` field distinguishing self vs. creature. Possibly:
```typescript
{ kind: "restrict_turn"; noMove: boolean; noAction: boolean; noBonusAction: boolean }
```

### Gap 4: No `drop_held_items` effect

Drop forces the target to release held items. Nothing in v4 atoms or the surface covers "force release of a held item." This may be a new atom (`drop_held_item`) or could be expressed as a constrained variant of `alter_item_kind`, but neither currently exists in the surface.

**Widening needed:** New effect variant. This is narrow — single-spell pressure — so it may warrant deferral, but it is unrepresentable today.

### Gap 5: Cast-time command choice has no surface representation

Command's five options are chosen by the caster **before the save resolves**, not as a post-save branch. The current surface has no mechanism for "choose one of N discrete effect variants at cast time." This is distinct from:
- Slot-level scaling (linear parameter, not discrete branching)
- Save branches (post-resolution, not caster choice)
- Phase sequencing (sequential, not optioned)

**Widening needed:** A `cast_time_choice` mechanism on `ActivationMechanics` — or alternatively, each command is treated as a separate authored unit sharing the same spell header. The latter is the simpler surface path but loses the SRD unity.

## Suggested minimal path to `clean`

1. Add `apply_condition` to spell `Effect` (enables Grovel, also unblocks other condition spells like Blindness/Deafness)
2. Add `force_move` to spell `Effect` (enables Approach + Flee)
3. Decide on Halt encoding (restrict_turn vs. new atom)
4. Decide on Drop encoding (new atom or deferred)
5. Choose between: (a) model Command as 5 separate authored units sharing a header, or (b) add a `cast_time_choice` Effect variant

Option (a) avoids Gap 5 at the cost of authoring 5 records. Option (b) adds a new surface shape but captures the SRD structure faithfully.

## Classification

`surface_widening` — the `activation`/`save_gate` family exists; the blocking gap is the `Effect` union being too narrow.
