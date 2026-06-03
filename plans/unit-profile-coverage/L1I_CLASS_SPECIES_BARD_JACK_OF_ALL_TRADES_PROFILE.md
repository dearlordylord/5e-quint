# L1I Bard Jack Of All Trades Profile Decision

Task 12 keeps `bard_jack_of_all_trades` unsupported and decides the smallest
future supported-profile owner. No runtime behavior, Surface schema, Unit
catalog admission, or generic roll-modifier support changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Bard.md:99-103`: Jack of All Trades is a
  Bard level 2 feature that adds half Proficiency Bonus, rounded down, only
  when the Ability Check uses a skill proficiency the Bard lacks and otherwise
  does not use Proficiency Bonus.
- `.references/srd-5.2.1/Playing-the-Game.md:99-101`: an Ability Check adds
  Proficiency Bonus when the GM determines that a relevant skill or tool
  proficiency applies and the character has that proficiency.
- `.references/srd-5.2.1/Playing-the-Game.md:232-242`: Proficiency Bonus does
  not stack; it may be halved or doubled; skill proficiency contributes
  Proficiency Bonus to Ability Checks involving that skill.
- `.references/srd-5.2.1/Rules-Glossary.md:45-47,798-802,900-902`: Ability
  Check, Proficiency, and Skill define the roll and proficiency relationship.
- `UBIQUITOUS_LANGUAGE.md:7`: Ability Check is the canonical roll term; "skill
  check" is imprecise.
- `UBIQUITOUS_LANGUAGE.md:57-68`: Proficiency Bonus, Proficiency Level,
  Expertise, Ability, and Skill are the relevant durable Character Sheet
  terms.

## Surface Record Read

- `packages/surface/content/bard_jack_of_all_trades.dhall`
- `packages/surface/content/bard_jack_of_all_trades.json`

## Existing Owners Read

- `packages/character-creation-runtime/src/types.ts:969-1040` already stores
  CharacterBuild skill proficiencies, Expertise, and selected feature facts.
- `packages/character-creation-runtime/src/finalization.ts:1639-1722` projects
  current fixed skill/ability Ability Check bonuses for class-feature options,
  but only for fixed skill filters and ability-modifier bonuses.
- `packages/character-sheet-runtime/src/index.ts:3736-3764` can parse stored
  CharacterBuild Ability Check bonus features, but it does not resolve Ability
  Checks or compute Proficiency Bonus contribution.
- `packages/character-battle-runtime/src/battle-creature-init.ts:216-266`
  reads CharacterBuild proficiencies only for weapon proficiency handoff; it
  does not thread Skill proficiency into battle Ability Check witnesses.
- focused package-local battle-runtime QNT and
  `packages/battle-runtime/src/battle-reducer/*` model some battle Ability
  Check roll-mode/effect witnesses, but those witnesses do not own durable
  Character Sheet skill and Expertise state.

## Current State

`bard_jack_of_all_trades` was already authored as an SRD Surface record and
already had an `unsupported-profile` Unit claim. Its `modify_roll_numeric`
payload can express a half-Proficiency-Bonus delta on Ability Checks, but that
shape can also represent invalid Jack of All Trades states because it cannot
require:

- a concrete Ability Check using a named Skill;
- the Bard lacking that Skill proficiency;
- no other Proficiency Bonus contribution already applying to the same check.

Task 12 updates the record description to the SRD 5.2.1 gate and leaves the
mechanics as unsupported pressure rather than promoting the generic
`modify_roll_numeric` shape.

## Decision

The smallest future supported profile should be:

`character-sheet.ability-check-proficiency-bonus`

That profile should live at the Character Sheet Ability Check projection
boundary, with a small shared algebra if battle Ability Check witnesses need to
consume the same computation. Character Creation should only retain the Bard
level 2 feature identity and existing skill/Expertise proficiency facts on the
CharacterBuild. Battle runtime should not duplicate Skill proficiency state; a
future character-battle bridge can pass the Character Sheet projection into
battle Ability Check witnesses when a battle procedure needs it.

A supported Jack of All Trades claim is valid only when the owner can execute
all of these facts together:

- the character has the `bard_jack_of_all_trades` feature from Bard level 2;
- the Ability Check witness names a Skill;
- the CharacterBuild does not have proficiency or Expertise in that Skill;
- no tool proficiency, skill proficiency, Expertise, or other rule already
  contributes Proficiency Bonus to that check;
- the bonus is half the character's Proficiency Bonus, rounded down.

Until that boundary exists, keep `bard_jack_of_all_trades` as
`unsupported-profile`.

## Follow-Up

Add a future Character Sheet profile task only when later-level Bard feature
retention is in scope. That task should model Ability Check proficiency
contribution from existing CharacterBuild proficiency facts, then admit Jack of
All Trades as a specific feature case. It should not widen
`modify_roll_numeric` generically or add parallel Skill proficiency state.

Task 19's condition-scoped Ability Check roll-mode work can stay separate. If
both tasks eventually need the same Ability Check witness type, they should
share that witness/algebra rather than creating one Jack-specific and one
condition-specific shape.

## Review Notes

- RAW and ubiquitous-language pass: checked Bard Jack of All Trades, Ability
  Check, Proficiency Bonus, Skill, and Expertise against the local SRD corpus
  and project vocabulary.
- Architecture/domain pass: the owner is Character Sheet because the gating
  facts are durable character proficiency facts plus a concrete Ability Check
  witness. Battle runtime remains a consumer only for battle-owned checks.
- Connascence pass: the repeated Unit id is localized to the claim row, this
  decision artifact, and generated coverage output. The future profile name is
  intentionally not added to `profiles.jsonl` until executable support exists.
- Code-review pass: no executable parser, reducer, support gate, or runtime
  behavior changed.
- Round 1: rejected promoting generic `modify_roll_numeric`; it cannot encode
  the missing-skill and no-other-Proficiency-Bonus gates.
- Round 2: rechecked that the claim remains `unsupported-profile` after
  generated coverage refresh.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes authored text and coverage/decision metadata, with
  no promoted battle runtime behavior.
