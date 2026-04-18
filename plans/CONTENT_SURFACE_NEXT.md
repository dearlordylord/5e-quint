# Content surface — next session resume point

**Read this first.** Everything needed to pick up where we left off.

## TL;DR

1. Auto-close-loop overnight session + 55-slug bulk re-mine + `TimeResetCadence` split: **done and merged on master**.
2. `Attachment.object` widening (was the one confirmed real gap from the prior audit): **done and merged** (commit `039b5922`).
3. Dataset staleness is the recurring cause of phantom "structural_widening" proposals. Re-mine before designing anything against the current dataset.
4. New follow-up widenings surfaced by the Attachment.object re-mine — see below.

## Current master state

```
039b5922 feat(surface): add Attachment.object for existing-object targeting
6bfc37d7 chore(survey): bulk re-mine 55 units across 5 widening families + plan cleanup
f89a74c0 refactor(surface): split RestResetCadence / TimeResetCadence by domain
3bda25a2 merge: auto-close-loop overnight session
```

- `packages/prototype-content-surface/src/surface/types.ts`:
  - `RestResetCadence` (rest-only) + `TimeResetCadence` (calendar; owns `never`) + `ResetCadence` union
  - `Attachment` has 5 kinds: `self | target | area | mark | object`
  - `ObjectFilter` (material / heldOrWorn / manufactured) + `ObjectMaterial` = `"metal" | "flammable"`
- `CLAUDE.md` has the "Domain-language reflex" note — read it before designing any new type.

## Follow-up widenings surfaced by the Attachment.object re-mine

The 10-slug re-mine (arcane_lock, continual_flame, daylight, fabricate, gentle_repose, heat_metal, light, magic_item_instant_fortress, magic_item_sovereign_glue, magic_item_talisman_of_the_sphere) dispatched on 2026-04-18. Eight recorded verdicts, two were `invalid` (missing authored content JSON):

**New `EffectAtom` proposals (verify duplicates before adding):**

| Proposed atom | Source slug | SRD evidence |
|---|---|---|
| `emit_light` / `grant_light` | continual_flame, light | "sheds Bright Light in a N-foot radius and Dim Light..." |
| `bond_objects` | magic_item_sovereign_glue | "form a permanent adhesive bond between any two objects" |
| `lock_object` | arcane_lock | "magically lock it for the duration; can't be unlocked by nonmagical means" |
| `create_object` | fabricate | "convert raw materials into products of the same material" |
| `force_drop_object` | heat_metal | "must succeed on a Con save or drop the object if it can" |
| `block_reanimation` | gentle_repose | "protected from decay and can't become Undead" |
| `pause_deadline` | gentle_repose | "days spent under this spell don't count against the time limit of Raise Dead" |
| `move_controlled_object` | magic_item_talisman_of_the_sphere | "move the Sphere 10 + 10×INT feet" |

**Extensions to the new `Attachment.object` / `ObjectFilter` shape:**

| Extension | Source slug | Rationale |
|---|---|---|
| `ObjectFilter.closeable_element` (door/window/gate/container/hatch) | arcane_lock | current filter can't express "closeable architectural element" |
| `ObjectFilter.maxSize` | light | "Large or smaller object" — size filter missing |
| `ObjectFilter.material = "raw"` (or similar) | fabricate | raw unprocessed stock vs. manufactured |

**Other proposed widenings (unrelated to Attachment.object):**

- `OngoingTrigger.on_caster_bonus_action` — heat_metal's recurring BA damage repeat
- `Attachment target: creatures_in_contact_with_object` — heat_metal (redirect attached-object effect to touching creatures)
- `RiderExpiry.start_of_caster_next_turn` — heat_metal disadvantage rider
- `DurationEndTrigger.caster_recasts_this_spell` — light cantrip self-cancel
- `DiceAmount.affine_ability_modifier` — `10 + 10×INT` shape (talisman)
- `modify_roll_advantage.useContextFilter` — advantage restricted to a specific use-context (talisman's "control a Sphere of Annihilation")
- `ActivatedAbilityHeader.activationDelay` — sovereign_glue's 1-minute set time after Utilize

## Recommended next steps

1. **Authoring gap is blocking verification.** Two re-mines returned `invalid` because `content/<slug>.json` doesn't exist. Before more re-mines, author one content file for a representative object-attachment spell (heat_metal is the richest) to close the loop tracer-side. This proves the new `Attachment.object` arm renders correctly end-to-end.

2. **Pick the next widening** only after re-mining affected clusters. Candidates ranked by ubiquity:
   - `emit_light` atom — covers continual_flame + light + daylight (and likely dancing_lights, faerie_fire's light payload). Highest payoff.
   - `create_object` atom + mechanics family — covers fabricate + instant_fortress + create_food_and_water. Separate from attachment; needs its own design session.
   - `lock_object` atom — narrow, single spell (arcane_lock). Defer.

3. **Decision-presentation format** (unchanged from prior session):
   1. Show 1–2 exemplar unit proposals.
   2. Show current type definition being widened.
   3. Propose concrete diff.
   4. User approves (or agent makes obvious calls autonomously per user's 2026-04-18 instruction).
   5. Apply + typecheck + tracer smoke on one exemplar.
   6. Re-mine affected slugs via `scripts/content-surface-survey/run-survey.sh --slugs-file PATH --force`.
   7. Commit.

## Context: why staleness happens

- Dataset is append-only per-slug; each re-encode replaces the slug's row. But re-encoding only happens when the loop picks that slug's cluster.
- When the loop lands a surface change, it re-mines only the batched 2 slugs for that cluster — not all units.
- So a slug last mined in week N has its verdict frozen against the surface-of-week-N; it won't reflect surface evolution until re-mined.
- `cube_of_force` had a `structural_widening` verdict citing "MagicItemRecord doesn't exist" when it had been added weeks ago. Re-mine flipped it to `clean`.

## Related plans (cross-reference, not to edit)

- `CONTENT_SURFACE_SURVEY.md` — historical; A vs B decided (B won).
- `CONTENT_SURFACE_LOOP_ACCEPTANCE.md` — acceptance criteria for the overnight loop.
- `CONTENT_SURFACE_DEFERRED.md` — tracked deferred modeling questions. **Live.** When a widening ships, remove its matching entry.
- `CONTENT_SURFACE_DATA_FLOW_TEMP.md` — pipeline map.
- `CONTENT_SURFACE_PROTOTYPE.md` — original red/green prototype plan.

## What NOT to do

- **Don't** present widening decisions based on the current dataset without a fresh re-mine.
- **Don't** design a widening in a worktree sub-agent without committing from the sub-agent — worktrees auto-clean.
- **Don't** restart the auto-close-loop for more mining without a clear target cluster.
- **Don't** touch `CONTENT_SURFACE_DEFERRED.md` blindly — it's the single source of truth for tracked modeling questions.
