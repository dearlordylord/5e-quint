# Thaumaturgy Frontier Decision

## Task 24 Implementation Update

Task 24 supersedes the no-matrix decision for Booming Voice only.
`thaumaturgy` is now an authored and catalog-admitted SRD 5.2.1 Spell
Definition with a `profile-subset-supported` Unit claim for
`spell.invocation-self-ability-check-advantage`. Promoted battle-runtime owns
the Booming Voice cantrip invocation, a one-minute self Spell Effect, the
caller-supplied total active Thaumaturgy 1-minute effect count witness that enforces
the three-effect cap, and Charisma (Intimidation) Ability Check/Influence
Advantage projection with normal Advantage/Disadvantage cancellation.

Altered Eyes, Fire Play, Invisible Hand, Phantom Sound, Tremors, and their
presentation/environment consequences remain runtime-detached table
adjudication.

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:848` defines
  Thaumaturgy as a Transmutation cantrip for Clerics.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:852` through
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:855` define Action
  casting time, 30-foot range, Verbal components, and duration up to 1 minute.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:857` makes the spell a
  choice among minor-wonder effects within range and caps multiple casts at
  three active 1-minute effects.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:859` defines Altered Eyes
  as a 1-minute change to the caster's eye appearance.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:861` defines Booming Voice
  as a 1-minute voice-volume effect that gives the caster Advantage on Charisma
  (Intimidation) checks for the duration.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:863` defines Fire Play as
  a 1-minute flame flicker, brightness, dimming, or color change.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:865` defines Invisible
  Hand as instantly opening or slamming shut an unlocked door or window.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:867` defines Phantom Sound
  as an instantaneous sound from a chosen point within range.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:869` defines Tremors as
  harmless ground tremors for 1 minute.
- `.references/srd-5.2.1/Classes/Cleric.md:156` is the level-1 Cleric
  spell-list pressure row.
- `.references/srd-5.2.1/Playing-the-Game.md:71` through
  `.references/srd-5.2.1/Playing-the-Game.md:82` define D20 Tests and Ability
  Checks.
- `.references/srd-5.2.1/Playing-the-Game.md:187` through
  `.references/srd-5.2.1/Playing-the-Game.md:199` define Advantage and
  Disadvantage, including non-stacking and cancellation.
- `.references/srd-5.2.1/Playing-the-Game.md:263` maps Intimidation to
  Charisma, and `.references/srd-5.2.1/Playing-the-Game.md:303` makes
  Intimidation one of the Influence action's Charisma check options.
- `UBIQUITOUS_LANGUAGE.md:7` defines Ability Check, `UBIQUITOUS_LANGUAGE.md:20`
  defines Advantage, and `UBIQUITOUS_LANGUAGE.md:343` through
  `UBIQUITOUS_LANGUAGE.md:345` confirm Advantage applies to Ability Checks and
  passive-check projection.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.

## Historical Generated State Before Task 24

- Unit pressure id: `thaumaturgy`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has one level-1 spell
  pressure row: Cleric spell list Thaumaturgy.
- That row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- The row has `battleReadinessStatus: accepted-no-battle-effect`.
- The row's next action classifies minor wonders, voice-volume Advantage,
  unlocked-door/window movement, harmless tremors, and cosmetic effects as
  noncombat utility effects outside promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `thaumaturgy` Unit
  matrix row.
- `packages/surface/content/thaumaturgy.json` and
  `packages/surface/content/thaumaturgy.dhall` do not exist.
- `packages/surface/content/class_cleric.*` references the spell id only as
  class spell-list source data, not as an authored/admitted Thaumaturgy
  UnitRecord.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `thaumaturgy` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `thaumaturgy`
  under No Matrix SRD Pressure, outside the strict executable denominator.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

The non-Booming Voice effects are runtime-detached utility, presentation, and
environment/object adjudication. No promoted package currently owns cosmetic
eye appearance, mundane flame presentation, unlocked door/window disposition,
point-origin harmless sound, harmless ground tremors, or a concurrent-effect
cap over those unowned presentation states.

Booming Voice is different from the utility effects: it grants Advantage on a
specific Ability Check. That is a temporary Spell Effect over a later
Charisma (Intimidation) Ability Check, not a durable CharacterBuild fact. The
closest existing executable owner is battle-runtime, because battle-runtime
already owns Spell Effects and caller-supplied Ability Check witnesses for
promoted combat procedures. It does not currently admit `thaumaturgy`, store a
Thaumaturgy-specific self effect, expose Intimidation/Influence Ability Check
witnesses, or track the spell's three-active-1-minute-effects cap across
utility effects.

Character Sheet is not the right owner for Task 13. The current
`@dnd/character-sheet-runtime` executable state owns HP, conditions, Hit Dice,
spell slot expenditures, Pact Slot expenditure, promoted sheet resources, ritual
invocation, and Armor Class projection. It does not own temporary spell effects
or Ability Check roll-mode state, and adding a Thaumaturgy-specific sheet
temporary-effect store would duplicate the battle/execution Spell Effect
boundary.

## Effect Classification

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Altered Eyes | Runtime-detached presentation | Eye appearance is cosmetic presentation with no damage, condition, save, attack, movement, illumination, obscurement, or persisted character-sheet consequence. |
| Booming Voice | Future battle-runtime Ability Check witness support | The Advantage applies only to later Charisma (Intimidation) Ability Checks. Modeling it honestly requires an authored/admitted UnitRecord, a self Spell Effect or equivalent runtime fact, and a caller-supplied Intimidation/Influence Ability Check witness that can project Advantage without inventing a social-check subsystem. |
| Fire Play | Runtime-detached environment/presentation | Flame flicker, brightness, dimming, and color are mundane-flame presentation. Existing light profiles own source-created spell emitters, not generic flame appearance or map-light derivation for ordinary flames. |
| Invisible Hand | Runtime-detached environment/object adjudication | Opening or slamming an unlocked door or window changes table-facing object disposition. No current promoted runtime owner stores door/window state or consumes it for battle behavior. |
| Phantom Sound | Runtime-detached sound presentation | A harmless instantaneous sound has no current communication, sound-propagation, stealth, condition, damage, or targeting owner. |
| Tremors | Runtime-detached environment presentation | Harmless tremors persist for 1 minute but have no SRD damage, movement, Prone, concentration, terrain, or save consequence. |
| Three active 1-minute effects | Owner-decision constraint for future support | The cap is meaningful over Altered Eyes, Booming Voice, Fire Play, and Tremors together. Do not add a standalone counter while the utility effects remain unowned; a future Booming Voice implementation must either own all counted Thaumaturgy effects or accept a table-supplied active-effect-count witness at invocation legality. |

## Historical Decision

Keep `thaumaturgy` as no-matrix spell pressure with no runtime profile in Task
13. The existing Strict Level 1 report treatment is correct: the Cleric
spell-list pressure is product readiness accepted/no-battle-effect pressure and
remains outside strict support accounting because no executable Unit matrix row
exists.

Close Altered Eyes, Fire Play, Invisible Hand, Phantom Sound, Tremors, and the
unconsumed side of the three-active-effect cap as runtime-detached utility,
presentation, or environment/object adjudication for the current plan. Do not
create spell-specific object, sound, tremor, flame, appearance, or counter state.

Booming Voice should become a concrete follow-up only if the plan wants
executable support for Thaumaturgy's mechanical Ability Check effect. That
follow-up should be battle/runtime-owned, not Character Sheet-owned: author and
admit `thaumaturgy`, add a self 1-minute non-concentration Spell Effect for
Booming Voice, and expose a caller-supplied Charisma (Intimidation) Ability
Check or Influence witness that projects Advantage. The follow-up must also
make the three-active-1-minute-effects cap executable without duplicating
unowned utility state.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `thaumaturgy` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- battle-runtime explicitly accepts Booming Voice as a spell-owned self effect
  plus Intimidation/Influence Ability Check roll-mode projection, with an
  executable treatment of the three-active-1-minute-effects cap; or
- an environment/object/presentation owner explicitly accepts all 1-minute
  Thaumaturgy effects and their cap as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached utility and
  table adjudication, including Booming Voice's social Ability Check benefit.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Task 24 Follow-Up Task

Add a future implementation atom if Level 1 support wants Booming Voice to be
executable:

`Promote Thaumaturgy Booming Voice Ability Check Advantage`

- author/admit a SRD-provenance `thaumaturgy` Surface UnitRecord;
- add package-local Quint and runtime support for the Action cantrip invocation
  choosing Booming Voice and storing a self 1-minute non-concentration effect;
- add a typed Charisma (Intimidation) Ability Check or Influence witness that
  projects Advantage and respects normal Advantage/Disadvantage cancellation;
- decide the three-active-1-minute-effects cap at the same boundary, either by
  owning all counted 1-minute effects or by requiring a table-supplied active
  Thaumaturgy effect count.

Do not add a Character Sheet temporary-effect task unless the product first
creates a generic sheet temporary-effect owner. A Thaumaturgy-only sheet store
would duplicate execution-owned Spell Effect state.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:848`
  through `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:869`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Cleric.md:156`.
- Ability Check and Advantage RAW checked against
  `.references/srd-5.2.1/Playing-the-Game.md:71` through
  `.references/srd-5.2.1/Playing-the-Game.md:82`,
  `.references/srd-5.2.1/Playing-the-Game.md:187` through
  `.references/srd-5.2.1/Playing-the-Game.md:199`, and
  `.references/srd-5.2.1/Playing-the-Game.md:263`.
- Ubiquitous language checked for Ability Check, Advantage, Magic Action, Spell
  Definition, Spell Access, Spell Invocation, Spell Effect, and Transmutation
  terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
