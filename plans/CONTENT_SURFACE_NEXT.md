# Content surface — next session resume point

**Read this first.** Everything needed to pick up where we left off.

## TL;DR

1. Auto-close-loop overnight session + 55-slug bulk re-mine + `TimeResetCadence` split: **done and merged**.
2. Shipped widenings on master:
   - `039b5922` feat: Attachment.object + ObjectFilter
   - `507b648e` refactor: simplify round 1 (const-array, extract helper)
   - `31364d5a` feat: emit_light EffectAtom
   - `88044326` feat: ObjectFilter.maxSize + DurationEndTrigger.caster_recasts_spell + StatBlockSize→Size rename
3. Clean slugs so far: continual_flame, light (both fully encoded + tracer-verified).
4. Dataset staleness is the recurring cause of phantom "structural_widening" proposals. Re-mine before designing anything against the current dataset.
5. Next up: `create_object` atom (highest payoff remaining — see below).

## Current master state

```
88044326 feat(surface): ObjectFilter.maxSize + DurationEndTrigger.caster_recasts_spell
31364d5a feat(surface): add emit_light EffectAtom
507b648e refactor(surface): simplify round 1 — Attachment.object
b8140008 docs(plan): update CONTENT_SURFACE_NEXT after Attachment.object ships
039b5922 feat(surface): add Attachment.object for existing-object targeting
6bfc37d7 chore(survey): bulk re-mine 55 units across 5 widening families + plan cleanup
```

- `packages/prototype-content-surface/src/surface/types.ts`:
  - `RestResetCadence` (rest-only) + `TimeResetCadence` (calendar; owns `never`) + `ResetCadence` union
  - `Attachment` has 5 kinds: `self | target | area | mark | object`
  - `ObjectFilter` (material / heldOrWorn / manufactured / maxSize)
  - `ObjectMaterial` via `OBJECT_MATERIALS` const-array = `"metal" | "flammable"`
  - `Size` (formerly `StatBlockSize`) = `"tiny" | "small" | "medium" | "large" | "huge" | "gargantuan"`
  - `EffectAtom` includes `emit_light { brightRadiusFeet, dimAdditionalFeet? }`
  - `DurationEndTrigger` includes `caster_recasts_spell`
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

1. **`create_object` atom — next widening** (highest payoff remaining). Covers fabricate, silent_image, dancing_lights, create_food_and_water, instant_fortress, and likely major_image, minor_illusion, secret_chest, plus some wall spells. Already listed in `V4_EFFECT_ATOMS` in atom-whitelist.ts but missing from `EffectAtom` union — this is the gap.

2. **Authoring continues to lag.** The re-mine worker only auto-authors content when the surface is close to clean. For slugs with multiple unresolved widenings (produce_flame, silent_image, daylight, heat_metal, fabricate), we need either (a) the widenings shipped, or (b) manual authoring after a full SRD re-read. Prefer (a).

3. **Narrow atoms to defer** (1-unit each, low leverage):
   - `bond_objects` (sovereign_glue)
   - `lock_object` (arcane_lock)
   - `force_drop_object` (heat_metal)
   - `block_reanimation` / `pause_deadline` (gentle_repose)
   - `move_controlled_object` (talisman)

4. **Decision-presentation format** (unchanged from prior session):
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
