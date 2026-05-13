# SRDINV66 Recursive SRD Inventory Planning Review

Task 268 reviewed the closed SRDINV57, SRDINV58A, SRDINV58B, SRDINV60A,
SRDINV60B, SRDINV60C, SRDINV61, SRDINV62, SRDINV63, SRDINV64, and SRDINV65
batch before unlocking the remaining level-1 battle feature and spell queue.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 battle readiness: 282/367, 76.8%
- Level-1 `catalog-installed-owner-evidence-present` rows: 144
- Level-1 `non-runtime` rows: 12
- Spell Unit `catalog-installed-owner-evidence-present` rows: 115
- Spell Unit `catalog-installed-owner-evidence-required` rows: 1
- Spell Unit `needs-surface-widening` rows: 15
- Spell Unit `catalog-only/dead-for-now` rows: 80

Unit matrix metrics from `plans/unit-profile-coverage/unit-matrix.json`:

- Installed collection inventory count: 130 Units
- Authored Surface Unit catalog admission: 129/422, 30.6%
- Authored Surface executable catalog admission: 105/355, 29.6%
- Installed Unit profile classification coverage: 130/130, 100%
- Supported executable Unit coverage: 67/106, 63.2%
- QNT profile modeling coverage: 47/47, 100%
- QNT proof coverage: 46/47, 97.9%
- Runtime mapping coverage: 47/47, 100%
- Runtime parity coverage: 47/47, 100%
- Deterministic admission/projection coverage: 63/67, 94%
- Selected identity MBT coverage: 10/67, 14.9%

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Faerie Fire,
  Hellish Rebuke, Hideous Laughter, Hunter's Mark, and Light.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` for Minor Illusion and
  Produce Flame.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Sanctuary,
  Shillelagh, Sleep, Sorcerous Burst, Spare the Dying, and Starry Wisp.
- `.references/srd-5.2.1/Classes/Bard.md` for Bardic Inspiration.
- `.references/srd-5.2.1/Classes/Monk.md` for Martial Arts.
- `.references/srd-5.2.1/Classes/Ranger.md` for Favored Enemy.
- `.references/srd-5.2.1/Classes/Sorcerer.md` for Innate Sorcery.
- `.references/srd-5.2.1/Classes/Warlock.md` for Eldritch Invocations and
  Pact of the Blade.
- `.references/srd-5.2.1/Equipment.md` for Weapon Mastery, Sap, Cleave, and
  Topple.

`UBIQUITOUS_LANGUAGE.md` was checked for Attack Roll, Saving Throw, Ability
Check, D20 Test, Bonus Action, Reaction, Spell Slot, Spell Effect, Movement,
Difficult Terrain, Prone, Invisible, Dim Light, Bright Light, Object, Weapon
Mastery, and Unarmed Strike.

## Review Findings

- The closed runtime batch has honest subset claims. Grease, Faerie Fire,
  Protection from Evil and Good, Animal Friendship, Hunter's Mark, Chill Touch,
  and Shocking Grasp have promoted evidence for their supported mechanics, and
  their omitted clauses remain explicit rather than hidden behind catalog
  admission.
- Grease's automatic area membership, pathfinding, and grid geometry remain
  outside the promoted battle-runtime boundary. The supported executable
  boundary is caller-supplied ground-area and movement facts; no new Grease
  geometry task is needed in the level-1 battle queue.
- Hunter's Mark finding Advantage remains a caller-supplied Wisdom (Perception
  or Survival) Ability Check modifier boundary. SRDINV63 classified it without
  adding duplicate mark state, so SRDINV66 does not add an implementation task.
- Protection from Evil and Good's remaining active-effect Saving Throw
  Advantage waits for a future effect owner that actually creates a typed
  repeat-save or possession-save hole. SRDINV60C confirmed current fresh spell
  casting saves must stay excluded.
- The remaining measured spell pressure is 15 Surface-widening rows and one
  installed Spell Unit needing owner evidence. The Surface blockers are
  Hideous Laughter, Spare the Dying, Sanctuary, Shillelagh, Fog Cloud, Fire
  Bolt, Sorcerous Burst, and Hex, with duplicate rows from multiple class spell
  lists. The one owner-evidence row is Warlock Hellish Rebuke.
- The next level-1 battle feature work must not treat character-creation owner
  evidence as battle support. Bardic Inspiration, Monk Martial Arts, Weapon
  Mastery Sap, Sorcerer Innate Sorcery, Warlock invocation options, and Ranger
  Favored Enemy all need their own runtime or research slices before SRDINV78
  can claim level-1 battle feature closure.
- Matrix follow-up labels were tightened so stale review ids do not masquerade
  as future work: Produce Flame object hurl now points to SRDINV67, Sleep
  damage and shake-awake cleanup point to SRDINV68A/SRDINV68B, and Starry Wisp
  light/invisible riders point to SRDINV59A/SRDINV59B.

## Batch Disposition

SRDINV66 unblocks the successor tasks whose only dependency was this review:

- `SRDINV58C`: Faerie Fire object outline runtime.
- `SRDINV67`: Produce Flame object hurl runtime.
- `SRDINV68A`: Sleep damage cleanup runtime.
- `SRDINV69A`: Hellish Rebuke Reaction trigger runtime.
- `SRDINV70A`: Light and illumination runtime-boundary research.
- `SRDINV71`: Minor Illusion battle-boundary research.
- `SRDINV72A`: Bardic Inspiration grant runtime.
- `SRDINV73A`: Monk Martial Arts attack projection.
- `SRDINV74A`: Weapon Mastery Sap runtime.
- `SRDINV75A`: Sorcerer Innate Sorcery activation runtime.
- `SRDINV76A`: Warlock level-1 invocation runtime-boundary research.
- `SRDINV77`: Ranger Favored Enemy Hunter's Mark free casts.

Dependent second slices stay blocked behind their explicit first-slice or
research prerequisites: `SRDINV68B`, `SRDINV69B`, `SRDINV70B`, `SRDINV72B`,
`SRDINV73B`, `SRDINV74B`, `SRDINV75B`, and `SRDINV76B`. `SRDINV59A` remains
blocked behind `SRDINV70A`, `SRDINV59B` remains blocked behind `SRDINV59A`, and
`SRDINV78` remains blocked behind the full batch.

## /simplify Convergence

- Round 1: removed stale matrix follow-up ids for Produce Flame, Sleep, and
  Starry Wisp so the generated reports point at concrete successor tasks rather
  than older review or decision tasks.
- Round 2: checked whether the closed review should create more tasks for
  Grease geometry, Hunter's Mark finding Advantage, or Protection from Evil and
  Good active-effect saves. Each is already classified at the owning boundary,
  and adding standalone tasks now would duplicate state or invent runtime
  owners before the relevant source procedure exists.
