# Content surface — resume point

## State

- ~150 clean / 583 modelable in `survey-results-srd.jsonl` (pre-re-mine
  baseline). Many `widening` verdicts are stale; 98 candidates with
  this-session-covered widenings are being re-mined now (background
  task). Expect clean count to jump significantly.
- Surface vocabulary current:
  - **Attachment**: `self | target | area | mark | object`
    (object: filter material / heldOrWorn / manufactured / maxSize)
  - **EffectAtom** (last-added): emit_light, block_reanimation,
    create_object (+ CreatedObjectDurability), create_illusion,
    force_drop_item, bond_objects, lock_object, reposition_attachment.
  - **OngoingTrigger**: on_caster_spends_action, on_creature_studies.
  - **OngoingEffect**: attack_roll, ability_check_gate.
  - **DurationEndTrigger**: caster_recasts_spell.
  - **RiderExpiry**: caster_turn_start.
  - `Size` (renamed from StatBlockSize — domain-correct for both
    creatures and objects).

## Next actions

1. **Wait for targeted re-mine** (`bgazefyjd` — 98 slugs). Commit
   verdict shifts when done. Expected ~20-30 flips to clean.
2. **After that: full 432-slug re-mine of all non-clean units**
   (overnight run, ~3-5 h wall-clock at observed pace). Gives the
   honest clean % baseline.
3. **Structural widenings still open** (design only — ship when a
   second SRD unit surfaces each):
   - `object_contact_propagation` (heat_metal's creature-in-contact
     damage).
   - `conditional_or_save_outcome` (save_gate onFail branching).
   - `CastTimeChoice<Attachment>` (Daylight two-mode cast).
   - `on_area_overlap_window` (Daylight dispel-Darkness).
   - `Duration.concentration.upcastRemovesConcentration` (Major Image
     — 1 unit, defer until a second shows up).
4. **Deferred atoms** — `freeze_deadline` (needs Raise-Dead deadline
   system modeled).

## Workflow

- One re-mine at a time (flock). If it stalls: kill, clean lock at
  `scripts/content-surface-survey/run-survey.lock`, retry.
- Full dataset re-mine is slow — use `--slugs-file` with a targeted
  list filtered to non-clean slugs.
- Parallel widening design via sub-agents while re-mine runs; agent
  returns TypeScript + affected slugs; apply sequentially.
- Agent makes obvious calls autonomously; asks only when a choice
  has real design impact.
- Commit feat(surface) + push after each logical widening batch.
- Keep this file a resume point, not a log.

## Related plans

- `CONTENT_SURFACE_SURVEY.md` — historical.
- `CONTENT_SURFACE_LOOP_ACCEPTANCE.md` — loop criteria.
- `CONTENT_SURFACE_DEFERRED.md` — tracked deferred questions.
- `CONTENT_SURFACE_DATA_FLOW_TEMP.md` — pipeline map.
- `CONTENT_SURFACE_PROTOTYPE.md` — original red/green plan.
