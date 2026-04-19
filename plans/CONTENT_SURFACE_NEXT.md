# Content surface — resume point

## State

- 168+ clean / 583 modelable in `survey-results-srd.jsonl` (~29%).
  Dataset has known stale widening proposals; the audit agent confirmed
  top-5 unresolved families are all STALE (surface already supports
  them, dataset just hasn't re-mined).
- Surface vocabulary current:
  - **Attachment**: `self | target | area | mark | object`
    (object: filter material / heldOrWorn / manufactured / maxSize)
  - **EffectAtom** (recent): emit_light, block_reanimation,
    create_object (+ CreatedObjectDurability w/ damageResistances),
    create_illusion, force_drop_item, bond_objects, lock_object,
    reposition_attachment, area_is_difficult_terrain.
  - **OngoingTrigger**: on_caster_spends_action,
    on_creature_studies, on_creature_ends_turn_in_area.
  - **OngoingEffect**: attack_roll, ability_check_gate.
  - **DurationEndTrigger**: caster_recasts_spell.
  - **RiderExpiry**: caster_turn_start.
  - **UseCountCap**: unlimited (ChargePoolResource.cap excludes it).
  - **EquipmentPredicate**: not_wielding_shield.
  - `Size` (renamed from StatBlockSize).

## Workflow reset (learned from 2026-04-18)

**Don't run big indiscriminate re-mines.** They burn the Claude usage
budget processing phantom widening proposals and mostly return "same
verdict as before" for slugs we haven't helped. Instead:

1. **Ship a widening** (EffectAtom / trigger / filter field).
2. **Targeted re-mine** of just the slugs that proposed it (e.g., 3-10
   slugs). Fast and cheap.
3. **Commit + push.**
4. **Repeat.**

The dataset will stay noisy for slugs we haven't touched; that's fine.
Real backlog is visible from widening proposals for slugs we've
specifically targeted.

## Infrastructure fixes shipped today

- `worker.sh` uses `--strict-mcp-config` → no MCP child process leak
  (prior OOMs from hundreds of leaked MCP servers).
- `worker.sh` gates the dataset `awk` pre-pass on `should_record=1` →
  refused/invalid verdicts no longer delete the prior row, preventing
  the 397-row dataset regression observed earlier.
- `worker.sh` has `--exclude-dynamic-system-prompt-sections` for
  cross-worker prompt-cache reuse (unclear if actually helping —
  cache_creation still ~115K per call; didn't investigate further).

## Open widenings (speculative — design when a slug surfaces them)

- `object_contact_propagation` (heat_metal creature-in-contact damage).
- `conditional_or_save_outcome` (save_gate onFail branching).
- `CastTimeChoice<Attachment>` (Daylight two-mode cast).
- `on_area_overlap_window` (Daylight dispel-Darkness).
- `Duration.concentration.upcastRemovesConcentration` (Major Image
  — 1 unit, defer until a second shows up).
- `freeze_deadline` / revive-window system (needs Raise Dead family
  modeled first).

## Related plans

- `CONTENT_SURFACE_SURVEY.md` — historical.
- `CONTENT_SURFACE_LOOP_ACCEPTANCE.md` — loop criteria.
- `CONTENT_SURFACE_DEFERRED.md` — tracked deferred questions.
- `CONTENT_SURFACE_DATA_FLOW_TEMP.md` — pipeline map.
- `CONTENT_SURFACE_PROTOTYPE.md` — original red/green plan.
