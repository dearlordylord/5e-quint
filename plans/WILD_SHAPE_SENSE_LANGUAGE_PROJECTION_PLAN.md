# Wild Shape Sense, Language, And Speech Projection Plan

Task: `L3RES-09-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION`

Status: research complete; implementation plan ready.

## RAW And Vocabulary Anchors

- `.references/srd-5.2.1/Classes/Druid.md`, Level 2 Wild Shape:
  while shaped, the druid retains personality, memories, ability to speak,
  creature type, Hit Points, Hit Point Dice, Intelligence, Wisdom, Charisma,
  class features, languages, feats, skill proficiencies, and saving throw
  proficiencies. Other game statistics are replaced by the Beast stat block.
- `.references/srd-5.2.1/Rules-Glossary.md`, Stat Block entries:
  `Senses` lists the monster's special senses and Passive Perception;
  `Languages` lists languages the monster knows.
- `.references/srd-5.2.1/Playing-the-Game.md`, Special Senses:
  the SRD special-sense vocabulary is Blindsight, Darkvision, Tremorsense, and
  Truesight.
- `UBIQUITOUS_LANGUAGE.md`:
  speech blocking is a condition-consequence projection: Incapacitated and
  conditions that imply it block speech. Stat Block and Character Sheet both
  produce creature-level combat facts; shared combat APIs should use Creature
  language, not Stat Block language, for common projections.

## Current Owners

- Character language facts already exist on `CharacterBuild`:
  `originLanguages` and `classFeatureLanguages` in
  `packages/character-creation-runtime/src/types.ts`.
- Character Sheet stores and parses those facts in
  `packages/character-sheet-runtime/src/index.ts`; it validates fixed and
  choice language grants against Surface records instead of reauthoring them.
- Battle initialization for characters is composed in
  `packages/character-battle-runtime/src/battle-character-build-projection.ts`
  and `packages/character-battle-runtime/src/battle-creature-init.ts`.
- Active Wild Shape form ownership already exists in
  `packages/battle-runtime/src/battle-reducer/druid-wild-shape.ts` as an active
  `druidWildShapeForm` effect plus a branded known-form Stat Block. Existing
  D20 statistics, AC, size, speed, and form-resource projections derive from
  that form.
- Stat Block special senses and language entries are authored on
  `StatBlockRecord["statBlock"].senses` and `.languages` in
  `packages/surface/src/surface/schema-spell.ts`.
- Speech-blocking condition logic should use
  `isIncapacitated` from `@dnd/shared-algebras/conditions-algebra`, not a new
  condition list.
- Current battle spatial consumers such as Mirror Image use caller-supplied
  `BattleTargetSpatialFact` values for Blindsight/Truesight rather than deriving
  them from combatants. That should remain a witness boundary until spatial
  range/cover ownership exists.
- Find Familiar already owns source-specific telepathy and shared-senses
  lifecycle. Do not generalize from that profile into Wild Shape-local state.

## Design Decision

Create a shared battle-runtime creature projection owner, not a Wild
Shape-specific data store.

The owner should live in a new small battle reducer helper, for example
`packages/battle-runtime/src/battle-reducer/creature-perception-communication.ts`.
It should derive these projection facts from existing battle state:

- active Wild Shape Beast-form special senses from
  `activeDruidWildShapeForm(combatant)?.statBlock.senses`;
- active Wild Shape passive Perception from the existing
  `combatantSkillModifier(combatant, "perception")` D20 projection, not from a
  stored duplicate;
- retained character languages from character origin language facts threaded
  through battle initialization;
- retained character speech as a character communication projection suppressed
  by `isIncapacitated(combatant.conditions)`;
- ordinary Stat Block special senses and unparsed communication text from
  `combatant.origin.statBlock.statBlock`, including the explicit case where the
  optional Stat Block `languages` entry is absent;
- ordinary character special senses as an explicit empty projection until
  class/species/spell sense-grant owners are promoted.

Do not add `wildShapeSenses`, `wildShapeLanguages`, or `wildShapeCanSpeak`
fields. Those facts are derivable from active form, Character Build language
facts, Stat Block records, and conditions.

## Proposed Types

Add battle-owned projection types whose shape keeps retained character
communication separate from authored Stat Block communication text:

```ts
export type BattleCreatureSpecialSense = NonNullable<
  StatBlockRecord["statBlock"]["senses"]
>[number];

export type BattleStatBlockCommunicationText =
  | {
      readonly kind: "absentStatBlockLanguages";
    }
  | {
      readonly kind: "casterLanguagesReference";
    }
  | {
      readonly kind: "authoredStatBlockLanguageEntries";
      readonly entries: ReadonlyNonEmptyArray<string>;
    };

export type BattleCharacterSpeechProjection = {
  readonly kind: "retainedCharacterSpeech";
  readonly blockedByCondition: boolean;
};

export type BattleCreatureCommunicationProjection =
  | {
      readonly kind: "characterRetainedCommunication";
      readonly knownLanguages: ReadonlyNonEmptyArray<Language>;
      readonly speech: BattleCharacterSpeechProjection;
    }
  | {
      readonly kind: "statBlockCommunicationText";
      readonly languages: BattleStatBlockCommunicationText;
    };

export type BattleCreaturePerceptionCommunicationProjection = {
  readonly specialSenses: readonly BattleCreatureSpecialSense[];
  readonly passivePerception: number;
  readonly communication: BattleCreatureCommunicationProjection;
};
```

`statBlockCommunicationText` must stay authored text until a separate Stat
Block communication parser exists. It must not be coerced into typed
`Language[]` or executable speech booleans, because current SRD Stat Blocks
include entries such as `None` and `Understands ... but can't speak`. The
`absentStatBlockLanguages` variant represents `languages: undefined`; it is not
the same state as an authored `None` entry.

## Implementation Steps

1. Thread existing character language facts into battle initialization.
   Add `knownLanguages: ReadonlyNonEmptyArray<Language>` to
   `CharacterBattleCreatureInit` and the character origin state in
   `BattleCreatureState`. In `@dnd/character-battle-runtime`, derive it from
   `build.originLanguages` plus `build.classFeatureLanguages.map((f) =>
   f.language)`, with uniqueness at the projection boundary. This is a battle
   init projection, not a second Character Build source of truth.
2. Add the shared projection helper in battle-runtime.
   Export `combatantPerceptionCommunicationProjection(combatant)` and smaller
   helpers only if a caller needs them. The helper should branch on
   `combatant.origin.kind` and active Wild Shape form, not on Unit id, feature
   name, form id, or provenance section.
3. Derive Wild Shape form special senses.
   If `activeDruidWildShapeForm(combatant)` returns a form, use
   `form.statBlock.senses ?? []`; otherwise use the origin projection. Do not
   store copied sense arrays in the active effect.
4. Derive Wild Shape retained languages and speech.
   If the combatant origin is character, return
   `characterRetainedCommunication` from origin language facts regardless of
   active form. Its `retainedCharacterSpeech.blockedByCondition` is
   `isIncapacitated(combatant.conditions)`. Do not project speech booleans for
   `statBlockCommunicationText` until an explicit Stat Block communication
   parser owns entries such as `None` and `... can't speak`.
5. Keep spatial adjudication as caller-witnessed.
   Do not wire this projection into Mirror Image or sight-line rules yet.
   Range, cover, line of sight, magical darkness, shared senses, remote sensors,
   and table knowledge remain separate owners.
6. Expose view data only after the battle projection exists.
   MCP/app battle views may display these facts by reading the shared projection
   or a snapshot field derived from it. They must not recompute Wild Shape
   senses/languages locally.

## Focused Tests

- `packages/battle-runtime/src/creature-perception-communication.test.ts`
  should cover:
  - a Stat Block combatant projects authored special senses and
    `authoredStatBlockLanguageEntries`;
  - a Stat Block combatant with no `languages` entry projects
    `absentStatBlockLanguages`;
  - a character combatant projects retained typed languages and
    `retainedCharacterSpeech` when not Incapacitated;
  - an Incapacitated character projects
    `retainedCharacterSpeech.blockedByCondition: true`;
  - an active Wild Shape character projects Beast-form special senses while
    retaining `characterRetainedCommunication`;
  - active Wild Shape does not use the Beast Stat Block `languages` entry or
    parse Beast Stat Block speech prose.
- `packages/character-battle-runtime/src/index.test.ts` should cover Character
  Build to battle-init language threading, including origin plus class-feature
  languages.
- Existing Wild Shape form lifecycle tests should stay focused on active-form
  state. Add assertions there only if the new projection needs an already-built
  active Wild Shape fixture.

## QNT, MBT, And Coverage

This projection is deterministic TypeScript derivation over existing state. A
focused runtime test is sufficient for the first implementation unless a later
task uses the projection in reducer behavior that changes actions, holes, saves,
attacks, or damage.

If the projection becomes a supported runtime claim for `druid_wild_shape`,
update coverage artifacts in the same implementation task:

- add/extend a rules-kernel obligation for
  `BATTLE.FEATURE.WILD_SHAPE_PERCEPTION_COMMUNICATION_PROJECTION` only if the
  projection affects executable battle semantics;
- otherwise keep it as unit-profile evidence attached to the focused runtime
  test;
- run the write/read pair for unit-profile coverage if `UNIT_REPORT.md` or
  generated matrices change;
- run `pnpm check:mbt-driver-closure`;
- do not run battle MBT unless a behavior-consuming reducer path is promoted.

## Verification For Implementation Task

- Re-read the RAW and `UBIQUITOUS_LANGUAGE.md` anchors named above before
  coding.
- Run focused runtime tests for the new projection and character-battle
  threading.
- Run `git diff --check`.
- Run `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check`, and
  `pnpm check:mbt-driver-closure`.
- Run `pnpm quality` before handoff unless broad verification exposes an
  unrelated baseline failure outside the touched ownership surface.
- Reviewer-loop convergence: repeat RAW traceability,
  ubiquitous-language/domain naming, architecture/connascence, and code-review
  passes until no reasonable finding remains. Reject notes only with a concrete
  reason recorded in the implementation handoff.

## Non-Goals

- No parsing of authored Stat Block language prose into typed character
  languages.
- No app/MCP-local Wild Shape projection.
- No Mirror Image, darkness, hiding, or general visibility behavior change.
- No class/species/spell-granted character special-sense support beyond the
  explicit empty character-origin projection.
- No cross-session active Wild Shape persistence; `ASSUMPTIONS.md` A27 remains
  the handoff boundary.
