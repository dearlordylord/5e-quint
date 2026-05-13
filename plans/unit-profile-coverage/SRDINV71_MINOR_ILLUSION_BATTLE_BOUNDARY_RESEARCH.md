# SRDINV71 Minor Illusion Battle Boundary Research

Task 276 reviewed whether Minor Illusion should become promoted
`@dnd/battle-runtime` behavior. No runtime behavior was implemented in this
task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 337-352 for Minor
  Illusion.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 572-576 for Illusions.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 978-990 for Study and
  Investigation's table entry.
- `UBIQUITOUS_LANGUAGE.md` lines 154-160 and 268-270 for Action, Duration, Area
  of Effect, and Illusion terminology.

Relevant RAW facts:

- Minor Illusion creates either a sound or an image of an object within 30 feet
  for 1 minute, and the illusion ends if the caster casts the spell again.
- A creature that takes the Study action to examine the sound or image can
  discern it with a successful Intelligence (Investigation) check against the
  caster's spell save DC; if discerned, the illusion becomes faint to that
  creature.
- Sound illusions can range from a whisper to a scream and can be continuous or
  discrete sounds before the spell ends.
- Image illusions must be no larger than a 5-foot Cube, create no sound, light,
  smell, or other sensory effect, and are revealed by physical interaction
  because things pass through them.
- The Illusions glossary makes spatial illusions insubstantial and weightless
  and leaves the deceived senses or mental faculties to the creating effect.

## Existing Boundary

Surface content already stores Minor Illusion as structured authored input:
`packages/surface/content/minor_illusion.dhall` records the Action casting time,
30-foot point range, 1-minute timed duration, `caster_recasts_spell` early end,
and a cast-time mode choice between Sound and Image. The two modes project to
`create_illusion` atoms with sensory channels `sound` or `visual`.

Those Surface facts are catalog/admission facts, not promoted runtime owner
evidence. The current promoted battle runtime owns concrete battle procedures
such as damage, conditions, attack/save resolution, turn-resource windows,
object-target damage disposition, and source-owned light emitters. It does not
own a general spatial phenomenon store, sensory-channel perception model, Study
action target model, per-creature disbelief or faint-rendering state, physical
interaction with intangible images, or a visibility/cover/concealment graph.

## Boundary Decision

Minor Illusion is closed as Surface-only authored facts plus explicit non-battle
runtime closure for the current promoted boundary.

Do not add a battle-runtime active effect just to record that a Minor Illusion
exists. Without a promoted operation that consumes the illusion, that state
would only duplicate Surface duration/recast facts and create a status marker
with no executable consequence. The recast expiry clause should remain authored
on the Surface spell until a future illusion procedure owns the illusion
lifecycle and has a consumer that needs cleanup.

Do not promote the Sound mode separately. Volume, voice, roar/drum/etc. choice,
continuous playback, and discrete timing are table declaration and sensory
adjudication facts. Current battle owners do not determine who hears a sound,
whether it affects hidden status, or how a creature responds to hearing it.

Do not promote the Image mode separately. The 5-foot Cube maximum, visual-only
channel, lack of light/sound/smell, and pass-through physical interaction are
authored illusion facts. Current battle owners do not track illusion positions,
object-image collision, line of sight through a discerned image, or map
concealment created by a visual fiction.

Do not promote Study reveal or physical-interaction reveal now. Study reveal
requires an Intelligence (Investigation) Ability Check against the caster's
spell save DC and then stores a per-observer faint/discerned result. Physical
interaction reveal requires an interaction event with an insubstantial spatial
phenomenon. Both are valid future boundaries only after the runtime has a typed
illusion/perception procedure to own the target, the observer, and the reveal
result.

Minor Illusion also should not reuse the light-emitter boundary from SRDINV70A.
RAW explicitly says the image creates no light, and the sound mode has no
illumination semantics.

## Future Boundary If Promoted

If a later plan promotes illusion/perception behavior, it should introduce a
shared illusion phenomenon owner rather than a Minor Illusion-specific adapter.
That owner would need to model at least:

- source spell id, caster id, duration, and same-caster recast replacement;
- a sound-vs-image phenomenon variant derived from the existing Surface mode
  choice;
- caller/table-supplied placement and sensory reach facts instead of deriving a
  map perception graph;
- Study action spending plus an Intelligence (Investigation) check against the
  caster's spell save DC;
- per-observer discerned/faint state;
- image-only physical-interaction reveal.

Such a future slice should include Silent Image and Major Image in the design
check, because they share the same Study and physical-interaction reveal
language while adding movement, Concentration, and richer sensory channels.

## Plan Impact

- SRDINV71 can close as research complete.
- SRDINV78 should treat Minor Illusion as already classified
  `catalog-only/dead-for-now` / `unsupported-profile`, not as an implementation
  blocker.
- No new image, sound, Study, or physical-interaction implementation tasks are
  needed in the current level-1 battle-runtime batch.
- A future illusion/perception planning task may be added only if the plan wants
  to promote a general illusion owner across Minor Illusion, Silent Image, Major
  Image, and similar spells.

## Verification

- RAW/source review completed for Minor Illusion, Illusions, Study, and
  `UBIQUITOUS_LANGUAGE.md`.
- Existing Surface content and generated inventory claims were checked for
  `minor_illusion`; no generated matrix or inventory artifact changes were
  needed because the existing unsupported-profile claim already matches this
  decision.
- MBT was not run because this task only adds research documentation and does
  not change Quint or runtime behavior.

## Simplify Check

- Rejected a standalone Minor Illusion active effect. It would duplicate
  Surface duration/recast facts and no promoted battle operation would consume
  it.
- Rejected splitting immediate Sound and Image runtime tasks. The split would
  preserve mode names but still lack a typed sensory/perception boundary.
- Rejected storing per-creature `faint` or `discerned` flags before promoting a
  Study/illusion procedure. Those flags are observer-relative reveal outcomes,
  not source-authored spell facts.
