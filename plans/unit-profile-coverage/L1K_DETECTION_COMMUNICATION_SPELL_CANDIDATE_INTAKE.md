# L1K Detection Communication Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 7 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The six seed Spell Definitions split into:

- runtime-detached remote sense and information needs: `clairvoyance`,
  `arcane_eye`
- runtime-detached language and communication need: `tongues`
- runtime-consumed observer-sight witness needs: `see_invisibility`,
  `true_seeing`
- environmental breathing and suffocation capability need: `water_breathing`

No candidate is an exact existing-profile fit. Existing light, obscurement,
Darkvision, Invisible-benefit denial, object outline, and table-spatial witness
profiles are useful precedent, but they do not admit observer-scoped magical
sight grants, remote sensor lifecycle and movement, language understanding, or
underwater breathing.

Remote information stays outside this intake. Future runtime slices should not
let `clairvoyance` or `arcane_eye` satisfy ordinary caster visibility, attack,
or spell-target gates unless a later RAW-backed decision creates an explicit
sensor-origin witness boundary. These spells provide sensory information through
a spell sensor; they do not say the caster can cast spells, draw line of sight,
or attack through that sensor.

`water_breathing` is not a detection or communication spell. It remains in this
artifact because it is a Task 7 seed, but its follow-up owner is environmental
breathing and Suffocation, not sight, language, or movement. It grants no Swim
Speed and does not change Underwater Combat weapon rules by itself.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all six candidates are authored
  SRD spell records with `srd-candidate` catalog-admission disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all six candidates remain not
  in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the six candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.invocation-fog-cloud-obscurement`,
  `spell.invocation-object-light`, `spell.invocation-held-light-emitter`,
  `spell.invocation-dancing-lights-movable-dim-light`, and
  `spell.invocation-attack-roll-advantage-save`.
- `packages/battle-runtime/src/battle-reducer.ts`: `BattleSightObserver`
  admits ordinary sight and Darkvision, not See Invisibility, Truesight,
  Blindsight, or Tremorsense.
- `packages/battle-runtime/src/battle-reducer/attack-roll.ts`: Invisible attack
  benefits can be denied by target/source effects, but there is no
  observer-scoped magical sight witness from a spell sense grant.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Arcane Eye and
  Clairvoyance.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: See Invisibility,
  Tongues, True Seeing, and Water Breathing.
- `.references/srd-5.2.1/Rules-Glossary.md`: Blindsight, Darkvision,
  Invisible, Suffocation, Telepathy, and Truesight.
- `.references/srd-5.2.1/Playing-the-Game.md`: Vision and Light, Special
  Senses, Hiding, Finding Hidden Objects, and Underwater Combat.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect, Duration,
  Vision and Light, Illumination, Obscurement, Darkvision, Blindsight,
  Truesight, Invisible, Blinded, Deafened, Suffocation, Attack Roll,
  Ability Check, and Stat Block.

## Candidate Split

| Candidate | RAW detection/communication shape | Classification | Decision |
| --- | --- | --- | --- |
| `clairvoyance` | 10-minute casting time, 1-mile range, Concentration up to 10 minutes. Creates an Invisible, intangible, invulnerable sensor in a familiar or obvious location. The caster chooses seeing or hearing, can use that sense as if in the sensor's space, and can switch senses as a Bonus Action. A creature that sees the sensor with See Invisibility or Truesight sees a luminous orb. | Runtime-detached remote sense and information need | This is exploration and information state, not a battle reducer profile. Future support needs a source-owned sensor, table-supplied location familiarity or obviousness, active seeing/hearing choice state, Bonus Action switching, and observer facts for seeing the sensor. Do not let the sensor automatically satisfy caster sight, target, or attack gates. |
| `arcane_eye` | Action, 30-foot range, Concentration up to 1 hour. Creates an Invisible, invulnerable hovering eye. The caster receives visual information from the eye, which sees in every direction and has Darkvision 30 feet. As a Bonus Action, the caster moves it up to 30 feet; solid barriers block movement, but 1-inch openings are passable. | Runtime-detached remote sense and information need | This needs a movable sensor lifecycle and table-supplied movement/barrier/opening facts. It may eventually project sensor-origin Darkvision for information gathering, but it should not become ordinary caster vision, spell targeting, or line-of-sight automation. |
| `see_invisibility` | Action, Self, 1-hour duration. The caster sees creatures and objects that have the Invisible condition as if visible and can see into the Ethereal Plane, where creatures and objects appear ghostly. | Runtime-consumed observer-sight witness need | This affects facts the battle runtime already consumes for target visibility and Invisible attack benefits, but it is observer-scoped. It is not Faerie Fire's target-scoped outline and is narrower than full Truesight because it does not grant Darkness, illusion, or transformation clauses. Future support needs a precise observer-sight witness for Invisible and Ethereal facts. |
| `tongues` | Action, Touch, 1-hour duration. The touched creature understands any spoken or signed language it hears or sees. When the target speaks or signs, any creature that knows at least one language can understand it if that creature hears the speech or sees the signing. | Runtime-detached language and communication need | This is communication adjudication, not a promoted battle profile. Future support belongs with language and social/exploration owners, preserving hearing/sight and at-least-one-language gates without modeling conversation content in the reducer. |
| `true_seeing` | Action, Touch, 1-hour duration. A willing creature has Truesight with a range of 120 feet. Truesight covers normal and magical Darkness, Invisible creatures and objects, visual illusions, magical transformations, and the Ethereal Plane within range. | Runtime-consumed observer-sight witness need | This is the broad special-sense version of the See Invisibility boundary. Future support needs observer-scoped Truesight with typed range and distance facts, then per-domain projections for Darkness, Invisible, visual illusion, transformation, and Ethereal facts as those domains exist. |
| `water_breathing` | Action or Ritual, 30-foot range, 24-hour duration. Up to ten willing creatures gain the ability to breathe underwater and retain normal respiration. | Environmental breathing and suffocation capability need | This is not a detection, communication, Speed, or movement-mode spell. Future support should connect the `water_breathing` source fact to Suffocation and underwater environmental adjudication. It should not grant Swim Speed, remove Underwater Combat weapon penalties, or imply any language or sight capability. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps were found:

- `packages/surface/content/clairvoyance.json` records the sensor and remote
  perception, but it stores seeing and hearing as one possible-senses list with
  a switch cost. Future runtime support needs active chosen-sense state, and it
  also needs the luminous-orb visibility clause for observers with See
  Invisibility or Truesight.
- `packages/surface/content/arcane_eye.json` records the sensor, remote visual
  perception, Darkvision 30 feet, and Bonus Action reposition distance, but it
  omits the solid-barrier block and 1-inch-opening movement clauses.
- `packages/surface/content/see_invisibility.json` records the effect as
  `see_invisible_and_ethereal`, a narrow Surface sight override. Runtime
  admission still needs observer-scoped sight witnesses before claiming
  Invisible or Ethereal Plane behavior, and must continue not to claim
  Darkness, visual-illusion, or transformation behavior.
- `packages/surface/content/tongues.json` records spoken-or-signed
  understanding and outward intelligibility to any language-knower. No battle
  runtime profile consumes this atom.
- `packages/surface/content/true_seeing.json` records `grant_sense` Truesight
  120 feet for one touched target, which matches the authored spell shape. The
  blocker is runtime projection, not the structured spell record.
- `packages/surface/content/water_breathing.json` records the up-to-ten target
  attachment and `water_breathing` atom. The blocker is environmental
  Suffocation/runtime ownership, not the structured spell record.

Do not add Unit claims for these candidates until the structured source facts
needed by the chosen runtime profile are executable or explicitly documented as
subset deferrals.

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Add an observer-sight witness boundary that can consume typed table-supplied
   range, distance, cover, sight-line, and plane facts without deriving map
   geometry inside the reducer.
2. Split See Invisibility from full Truesight in the authored source shape or
   support gate so its Invisible and Ethereal facts cannot silently claim
   Darkness, visual-illusion, or transformation support.
3. Add See Invisibility as a self-scoped sight effect that denies Invisible
   target benefits for that observer and exposes Ethereal visibility facts
   through table-supplied plane witnesses.
4. Add True Seeing as a touched-target Truesight effect with range-limited
   projections for Darkness, Invisible, visual illusions, transformations, and
   the Ethereal Plane, adding checker-visible deferrals for domains not yet
   executable.
5. Keep Clairvoyance and Arcane Eye under a remote sensor owner that records
   sensor identity, duration, source, active sense, movement commands where RAW
   allows them, and table-supplied location/barrier/opening facts. Do not use
   remote sensors as automatic caster-origin spell targeting.
6. Keep Tongues under the language/communication owner, preserving hearing,
   sight, signing, speech, and known-language gates while leaving conversation
   content and social outcomes table-owned.
7. Route Water Breathing to an environmental breathing/Suffocation slice that
   consumes the existing `water_breathing` atom and does not add Swim Speed or
   underwater weapon-rule changes.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `see_invisibility` and `true_seeing` from runtime-detached information
  because Invisible and Truesight facts can affect sight-gated targeting,
  attack-roll benefits, and illumination/obscurement projections.
- Kept `clairvoyance` and `arcane_eye` runtime-detached because RAW grants
  sensory information through a sensor, not caster-origin attack or spell
  targeting through that sensor.
- Kept `tongues` runtime-detached because language understanding and outward
  intelligibility are communication adjudication, not a battle state mutation.
- Split `water_breathing` from the detection/communication framing because its
  RAW effect is environmental breathing, not sight, language, Speed, or
  movement.

Round 2 architecture and connascence pass:

- No checker-visible state was added. Candidate ids are repeated only as local
  planning boundaries; generated coverage artifacts remain the source of truth
  for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- The main connascence risk is future runtime projection treating See
  Invisibility as full Truesight. The structured source now uses the narrower
  `see_invisible_and_ethereal` sight override; future support gates must
  preserve that split before claiming observer-visible Invisible or Ethereal
  Plane behavior.
- Strong remaining coupling is local to the candidate table, source findings,
  and follow-up list: if a candidate moves buckets, those sections must change
  together.
- Runtime ownership remains typed source lifecycle plus typed witnesses. Sensor
  location, barrier checks, line of sight, plane presence, language content,
  underwater placement, and map geometry stay table-owned unless a later slice
  creates a narrower executable boundary.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
