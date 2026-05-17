# L1K Counter Dispel Spell Candidate Intake

Date: 2026-05-17

## Decision

Task 8 is an intake decision, not a runtime promotion. Do not add Unit claims,
catalog admission, QNT behavior, battle reducer behavior, or MBT evidence from
this task.

The four seed Spell Definitions split into:

- spell-cast interruption need: `counterspell`
- targeted ongoing-spell removal need: `dispel_magic`
- antimagic suppression and prevention need: `antimagic_field`
- exploration stasis and anti-detection need: `sequester`

No candidate is an exact existing-profile fit. Existing Reaction profiles
(`spell.reaction-shield`, `spell.reaction-hellish-rebuke`,
`spell.invocation-feather-fall-mitigation`, and
`spell.readied-action-time-spell`) prove useful interruption and reaction-window
precedent, but they do not negate an in-progress spell cast, preserve the
triggering spell slot, or waste the triggering action resource. Existing
ongoing Spell Effect profiles prove source-owned duration and Concentration
cleanup, but they do not carry a uniform dispel-comparison level,
dispellability, suppression state, or targetable magical-effect identity.

Future runtime work should model interruption, ending, and suppression as
separate domains. `counterspell` interrupts a Spell Invocation before the
triggering spell takes effect. `dispel_magic` ends selected ongoing spells on a
creature, object, or magical effect. `antimagic_field` suppresses ongoing magic
inside a self-origin Emanation and prevents spellcasting, Magic actions,
magical targeting, magic item properties, teleportation, planar travel, and
area extension there. `sequester` creates long-duration stasis and
anti-detection state; its Invisible and Unconscious clauses are not enough to
admit it as an ordinary condition spell.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: all four candidates are
  authored SRD spell records with `srd-candidate` catalog-admission
  disposition.
- `plans/unit-profile-coverage/unit-matrix.json`: all four candidates remain
  not in the installed Unit catalog.
- `plans/unit-profile-coverage/unit-claims.jsonl`: none of the four candidates
  has a supported or unsupported Unit claim.
- `plans/unit-profile-coverage/profiles.jsonl`: relevant existing promoted
  profiles include `spell.reaction-shield`,
  `spell.reaction-hellish-rebuke`,
  `spell.invocation-feather-fall-mitigation`,
  `spell.readied-action-time-spell`,
  `spell.invocation-sleep-repeat-save-lifecycle`,
  `spell.invocation-condition-save`,
  `spell.invocation-fog-cloud-obscurement`, and
  `spell.invocation-grease-ground-hazard`.
- `packages/battle-runtime/src/battle-reducer.ts`: `BattleActiveEffect`
  carries spell source and expiration facts, but current active effects do not
  have a uniform dispel-comparison level, dispellability marker, suppression
  state, artifact/deity exception source, or targetable magical-effect
  identity.
- `packages/battle-runtime/README.md`: Reaction windows use `interruptStack`
  and resume interrupted continuations, but current documented spell reactions
  cover attack, damage, falling, readied-spell, and after-hit windows rather
  than a general spell-cast interruption window.

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Antimagic Field,
  Counterspell, and Dispel Magic.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Sequester.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: Casting Time,
  Reaction and Bonus Action Triggers, Range, Components, Duration, Effects,
  Targets, and Saving Throws.
- `.references/srd-5.2.1/Rules-Glossary.md`: Area of Effect, Concentration,
  Emanation, Magic Action, Magical Effect, Reaction, Spell, Target, and
  Teleportation.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect, Spell Slot,
  Spell Component, Concentration, Duration, Magic Action, Reaction, Saving
  Throw, Ability Check, Invisible, and Unconscious.

RAW Rules Glossary terms checked separately:

- Area of Effect, Emanation, Magical Effect, Target, and Teleportation.

## Candidate Split

| Candidate | RAW counter/dispel shape | Classification | Decision |
| --- | --- | --- | --- |
| `counterspell` | Reaction when the caster sees a creature within 60 feet casting a spell with Verbal, Somatic, or Material components. The triggering creature makes a Constitution Saving Throw. On failure, the triggering spell dissipates with no effect, the action, Bonus Action, or Reaction used to cast it is wasted, and the triggering Spell Slot is not expended. A higher-level slot can automatically end an eligible spell in the interruption boundary. | Spell-cast interruption need | This needs a spell-cast Reaction window that carries the triggering Spell Invocation, visible caster/component/range witnesses, triggering spell level, triggering action resource, and staged Spell Slot spend. The runtime must be able to negate the spell effect while wasting the trigger action resource and preserving the trigger Spell Slot. Do not route this through Shield, Hellish Rebuke, or generic save-gated damage; those profiles resume a host procedure after adding or preventing effects, while Counterspell can stop the host spell entirely. |
| `dispel_magic` | Action, one creature, object, or magical effect within 120 feet. Any ongoing spell of level 3 or lower on the target ends. Each higher-level ongoing spell on the target requires an Ability Check using the caster's spellcasting ability against DC 10 plus that spell's level; success ends that spell. A higher-level slot automatically ends spells whose level is equal to or below the slot level used. | Targeted ongoing-spell removal need | This needs a targetable ongoing-spell occurrence model across creature attachments, object attachments, and area or magical-effect identities. Future support must expose the dispel-comparison level, source spell identity, target association, and per-spell check outcome without deleting unrelated conditions or nonspell magical effects. Do not admit this until Wall of Force, Antimagic Field, permanent Wall of Stone, and similar explicit dispel immunities or exceptions are representable. |
| `antimagic_field` | Action, Self, Concentration up to 1 hour, 10-foot Emanation. Inside the aura, no one can cast spells, take Magic actions, or create other magical effects; magic cannot target or otherwise affect anything inside; magic item properties do not work; magical areas cannot extend into the aura; teleportation and planar travel are blocked; portals close temporarily; ongoing spells other than Artifact/deity spells are suppressed while time still counts against duration; Dispel Magic has no effect on the aura; multiple auras do not nullify each other. | Antimagic suppression and prevention need | This is a cross-cutting suppression field, not a spell-removal effect. Future support needs self-origin Emanation membership witnesses, prevention hooks for casting, Magic actions, magical targeting, magical area extension, magic item projections, teleportation, planar travel, and portal state, plus latent suppressed ongoing spells whose duration clocks keep running. Do not implement this as deleting active effects, and do not collapse it into Dispel Magic. |
| `sequester` | Action, Touch, consumed 5,000 GP material, Until Dispelled. The target is an object or willing creature. For the duration it has Invisible; it cannot be targeted by Divination spells, detected by magic, or viewed remotely with magic. A creature target also has Unconscious, does not age, and needs no food, water, or air. The caster can set an arbitrary early-end condition that must occur or be visible within 1 mile of the target; the spell also ends if the target takes damage. | Exploration stasis and anti-detection need | This is primarily long-duration exploration and information-state ownership. The Invisible and Unconscious clauses can matter in battle, but admitting only those conditions would drop the anti-Divination, magic-detection, remote-viewing, suspended-animation, no-substance, arbitrary early-end, damage-end, object-target, willingness, costly consumed material, and Until Dispelled semantics. Keep this out of ordinary condition-save profiles unless a later task makes an explicit supported subset decision. |

## Structured Source Findings

The local SRD text is the authority for the decisions above. While checking the
structured Surface records, the following candidate-source gaps were found:

- `packages/surface/content/counterspell.json` records the spell-cast Reaction,
  Somatic component, Constitution save, interruption marker, and triggering
  component set. Future runtime support still needs explicit visibility,
  reaction eligibility, triggering spell level, staged action resource, and
  staged Spell Slot facts so the failed-save outcome can waste the action while
  preserving the triggering slot.
- `packages/surface/content/dispel_magic.json` records the direct ending atom
  and one ability-check gate, but the check is encoded with `ability = "int"`
  and `dc = 10`. RAW requires the caster's spellcasting ability and DC 10 plus
  the contested spell's level. The comments leave per-spell iteration to the
  caller; runtime admission should make that iteration and per-spell outcome
  executable at the boundary that owns ongoing Spell Effects.
- `packages/surface/content/antimagic_field.json` records the self-origin
  Emanation, Concentration duration, magic action/casting prevention, magical
  targeting and area blocking, teleport/planar blocking, magic item
  suppression, ongoing-spell suppression, artifact/deity exceptions, and
  duration-counting suppression. The Dhall source explicitly marks temporary
  portal closure and Dispel Magic immunity as partial, and the generated JSON
  has no executable fact for multiple Antimagic Field auras not nullifying each
  other.
- `packages/surface/content/sequester.json` records Until Dispelled-style
  permanent duration with dispel and damage ending markers and a paired
  Invisible/Unconscious condition payload. The Dhall source documents that
  object target behavior, anti-Divination/magic-detection/remote-viewing,
  no-aging/subsistence/air, and arbitrary caster-defined early-end conditions
  are not executable source facts. Runtime admission should not apply
  Unconscious to object targets.

Do not add Unit claims for these candidates until the structured source facts
needed by the chosen runtime profile are executable or explicitly documented as
subset deferrals.

## Follow-Up Shape

Recommended future slices, in increasing runtime scope:

1. Add a shared ongoing Spell Effect occurrence boundary with source spell,
   source caster, attachment target or magical-effect identity,
   dispel-comparison level, dispellability or immunity, duration clock, and
   Concentration ownership. Keep object and area identities caller/table
   supplied where geometry or inventory is not runtime-owned.
2. Add a spell-cast interruption frame for `counterspell` that opens from a
   visible component spell-cast trigger, stages triggering action and Spell Slot
   consequences, resolves the countering Constitution save, supports nested
   Counterspell chains, and resumes or cancels the interrupted Spell Invocation
   atomically.
3. Add `dispel_magic` through targeted ongoing-spell removal over the shared
   occurrence boundary, including creature, object, and magical-effect targets,
   automatic lower-level ending, per-higher-level Ability Checks, explicit
   immunity handling, and typed outcomes for every affected spell.
4. Add `antimagic_field` only after spellcasting prevention, Magic Action
   prevention, magical target/area witnesses, magic item property suppression,
   teleport/planar travel blocking, portal closure, and ongoing-spell
   suppression can compose without deleting latent effects or stopping their
   duration clocks.
5. Keep `sequester` under a long-duration exploration stasis and anti-detection
   owner. If a later battle slice admits a subset, it must name the supported
   subset explicitly and preserve object-vs-creature targeting, willingness,
   damage ending, dispel ending, and anti-detection deferrals as typed
   unsupported facts.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Split `counterspell` from existing Reaction profiles because it interrupts a
  Spell Invocation before effect resolution and has asymmetric resource
  consequences for the trigger.
- Split `dispel_magic` from condition cleanup and Concentration breakage
  because RAW targets ongoing spells by level and target association, not every
  effect on a creature.
- Split `antimagic_field` from Dispel Magic because RAW suppresses and prevents
  magic inside an Emanation rather than ending spells.
- Kept `sequester` out of ordinary condition profiles because its long-duration
  stasis and anti-detection semantics are core SRD mechanics, not flavor around
  Invisible and Unconscious.

Round 2 architecture and connascence pass:

- No checker-visible state was added. Candidate ids are repeated only as local
  planning boundaries; generated coverage artifacts remain the source of truth
  for catalog and claim state.
- Existing profile ids are cited from `profiles.jsonl`; this artifact does not
  create parallel support metadata or duplicate runtime gates.
- The main connascence risk is future dispel/suppression support: source spell,
  invocation slot level or dispel-comparison level, attachment target,
  duration, Concentration, dispel immunity, and suppressed/active state must
  change together. A future slice should colocate those facts in one Spell
  Effect occurrence model rather than scattering them across active effects,
  target state, and special-case spell ids.
- Strong remaining coupling is local to the candidate table, source findings,
  and follow-up list: if a candidate moves buckets, those sections must change
  together.
- Runtime ownership remains typed Spell Invocation and Spell Effect lifecycle
  plus typed table witnesses. Map geometry, area membership, line of sight,
  portal placement, object inventory placement, Divination adjudication, and
  arbitrary Sequester ending predicates stay table-owned unless a later slice
  creates a narrower executable boundary.

## Verification For This Intake

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required because this task changes only a planning artifact and does
not modify QNT, runtime behavior, catalog admission, Unit claims, or evidence.
