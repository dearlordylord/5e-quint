# Content surface — resume point

## State

- 145 clean / 583 modelable slugs in `survey-results-srd.jsonl` (~25%).
  Many "modelable-widening" verdicts are stale (surface already covers
  them). A full re-mine would likely jump to ~45-50% without any code
  changes.
- Surface supports:
  - Attachments: `self | target | area | mark | object` (object has
    filter: material / heldOrWorn / manufactured / maxSize)
  - EffectAtoms: emit_light, block_reanimation, create_object,
    create_illusion, force_drop_item, bond_objects, lock_object, plus
    the pre-existing ~40 atoms.
  - OngoingTrigger.on_caster_spends_action (recurring caster-action
    gated effect).
  - OngoingEffect.attack_roll (attack-roll resolution inside ongoing).
  - DurationEndTrigger.caster_recasts_spell.
  - RiderExpiry.caster_turn_start.

## Next actions in order

1. **Run a full dataset re-mine** (~2-3 h wall-clock, all 1877 slugs).
   Most leveraged next move: dissolves the stale-proposal backlog and
   gives an honest picture of real remaining work. Launch with
   `run-survey.sh --tier all --force`. Don't block on it — continue
   widening design in parallel.

2. **Pick the next structural widening** from these candidates after
   the re-mine reports. The current top-unresolved families (to be
   re-evaluated post-re-mine): `passive family for ClassFeatureMechanics`,
   `grant_temp_hp`, `multi_mechanics_magic_item`, `composite_magic_item_mechanics`.

3. **Deferred — needs the deadline primitive first**: `pause_deadline`
   for Gentle Repose (no time-of-death / revive-window system modeled
   yet). Ship when Raise Dead family lands.

## Known structural gaps still open

- `object_contact_propagation` — Heat Metal's "damage to creatures in
  physical contact with the object" redirect. Needs either an
  Attachment subtargeting or a new propagation concept.
- `conditional_or_save_outcome` — save_gate onFail branching ("drop,
  and IF it doesn't drop, Disadvantage"). No current shape.
- Illusion disbelief gate — Investigation-vs-spell-DC via Study action
  on illusion targets.
- Mid-duration reposition for persistent conjurations (Silent Image,
  Dancing Lights).
- Daylight's `on_area_overlap_window` (dispel-lower-level-Darkness).
- Daylight / True Strike etc. `CastTimeChoice<Attachment>` for two-
  form casts.

## Workflow notes

- Decision-presentation format (unchanged): show exemplar unit
  proposals → show current type → propose concrete diff → apply →
  typecheck → tracer smoke → re-mine affected slugs → commit.
- Agent makes obvious calls autonomously; asks only when a choice
  has real design impact.
- Domain-language-first: prefer naming that reflects the SRD concept
  (see `CLAUDE.md` "Domain-language reflex").
- Re-mine blocks on a flock; only run one at a time. Use sub-agents
  in parallel to DESIGN widenings while a re-mine runs.

## Related files (don't edit blindly)

- `plans/CONTENT_SURFACE_SURVEY.md` — historical.
- `plans/CONTENT_SURFACE_LOOP_ACCEPTANCE.md` — loop criteria.
- `plans/CONTENT_SURFACE_DEFERRED.md` — tracked deferred questions.
- `plans/CONTENT_SURFACE_DATA_FLOW_TEMP.md` — pipeline map.
- `plans/CONTENT_SURFACE_PROTOTYPE.md` — original red/green plan.
