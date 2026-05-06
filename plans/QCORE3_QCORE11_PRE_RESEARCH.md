# QCORE3-QCORE11 Pre-Research

Date: 2026-05-06

This file pre-researches the full-coverage QCORE queue after QCORE1 and QCORE2.
It is intentionally task-shaped: each QCORE names the production mechanics,
local RAW anchors, ubiquitous-language checks, architecture constraints, and the
review posture needed before implementation.

## Shared Architecture

QNT is the first authority for production-executable reducer procedures. Surface
and DLC authored content are not modeled in QNT. Typed projection parsers turn
authored content into executable procedure facts; rule-core QNT proves those
facts; TypeScript reducers mirror the QNT procedure shape; selective MBT/parity
is used where it adds cross-boundary value.

Use the QCORE0 composition pattern for every task:

- stateless procedure modules for reusable rules;
- owned stateful proof machines for bounded lifecycles;
- shallow integration modules for adjacent procedure composition;
- no Surface schema imports in QNT;
- no authored catalog enumeration in QNT;
- branch budgets beside `any`;
- serialized Apalache verification.

## QCORE3 - Healing, Stable, and Knock Out Lifecycle

Production mechanics:

- `applyHpHealing(...)` heals up to Hit Point Maximum, ignores terminal death,
  removes Unconscious when a zero-HP character regains HP, resets Death Saving
  Throws, and ends positive-HP Knock Out.
- `applyKnockOut(...)` turns a qualifying melee drop-to-zero into 1 HP plus
  Unconscious.
- Stable remains at 0 HP and Unconscious; ordinary damage resumes the Death
  Saving Throw lifecycle through QCORE2.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Healing, Knocking Out a
  Creature, Dropping to 0 Hit Points, Falling Unconscious, Stable.
- `.references/srd-5.2.1/Rules-Glossary.md`: Healing, Hit Points, Stable,
  Unconscious.
- `ASSUMPTIONS.md`: zero-HP state naming and monster-vs-character zero-HP
  policy.

Ubiquitous-language checks:

- Hit Points, Hit Point Maximum, Death Saving Throw, Stable, Instant Death,
  Knock Out, Unconscious, Resolve/Apply.

Architecture notes:

- Extend QCORE1/QCORE2, do not duplicate Hit Point or Death Saving Throw state.
- Keep `dead` canonical in `CreatureVitals`.
- Stable 1d4-hour recovery is out of scope unless a production reducer executes
  it; session handoff may record it, but QNT should only prove executable
  reducer procedure facts.

## QCORE4 - Damage Component Adjustments

Production mechanics:

- damage components by type;
- numeric bonuses/reductions before target damage adjustments;
- Immunity, Resistance, and Vulnerability;
- same-type component aggregation before target adjustment;
- scalar/proportional reductions across mixed damage entries.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Damage Rolls, Damage Types,
  Resistance and Vulnerability, No Stacking, Order of Application, Immunity.
- `.references/srd-5.2.1/Rules-Glossary.md`: Damage Roll, Immunity,
  Resistance, Vulnerability.
- `.references/srd-5.2.1/Monsters/Overview.md`: Resistances and
  Vulnerabilities, Immunities, Damage Notation.

Ubiquitous-language checks:

- Damage Type, Resistance, Vulnerability, Immunity, Damage, Rider.

Architecture notes:

- This should be a pure procedure cluster before attack/spell composition.
- QNT fixtures should use small fake damage-type sets plus SRD-like examples
  where legal.
- Do not model monster catalog breadth; projection parsers and catalog tests own
  authored breadth.

## QCORE5 - Attack Roll and Attack Damage Composition

Production mechanics:

- target fact legality, range-band facts, attack roll mode;
- natural 1 miss, natural 20 hit/critical, critical threshold 19;
- hit/miss branch, damage roll validation, Critical Hit dice doubling;
- melee Knock Out disposition hook from QCORE3;
- damage application through QCORE1-QCORE4;
- Attack action resource spend.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Attack Rolls, Rolling 20 or 1,
  Making an Attack, Ranged Attacks, Melee Attacks, Critical Hits, Damage Rolls,
  Knocking Out a Creature.
- `.references/srd-5.2.1/Rules-Glossary.md`: Attack Roll, Critical Hit,
  Weapon Attack, Unarmed Strike.
- `.references/srd-5.2.1/Classes/Fighter.md`: Champion Improved Critical for
  weapon and Unarmed Strike critical range 19.

Ubiquitous-language checks:

- Attack Roll, Critical Hit, Armor Class, Damage Roll, Knock Out, Weapon Attack,
  Unarmed Strike, Magic Action where spell attacks intersect.

Architecture notes:

- Attack QNT should consume executable attack facts, not Surface weapons or stat
  blocks.
- Critical range 19 is a procedure fact produced by projection parsers; QNT
  proves the fact, not the authored feature parser.
- Keep action spend as a shallow imported/procedure fact so attack proof does
  not absorb all action economy state.

## QCORE6 - Action and Turn Procedures

Production mechanics:

- Dash, Disengage, Dodge, Help, Hide, Search, Ready, End Turn, Stand from
  Prone;
- ordinary Action/Bonus Action resource consumption;
- turn refresh, reaction refresh, start/end turn effect expiry hooks;
- current-actor legality.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Actions, Bonus Actions,
  Reactions, The Order of Combat, Your Turn, Movement and Position, Dropping
  Prone.
- `.references/srd-5.2.1/Rules-Glossary.md`: Dash, Disengage, Dodge, Help,
  Hide, Ready, Search, Prone, Reaction.

Ubiquitous-language checks:

- Action Lifecycle, Magic Action, Resource Consumption, Movement, Prone,
  Invisible/Hidden distinctions.

Architecture notes:

- Use existing shared action-economy QNT/TS semantics rather than creating a
  second resource model.
- Hide/Search should take table/caller facts as inputs; no geometry, line of
  sight, or cover derivation in QNT.

## QCORE7 - Movement, Spatial Facts, and Grapple

Production mechanics:

- movement budget and caller-supplied movement cost;
- stand-from-Prone movement cost;
- opportunity-attack trigger facts;
- Grapple, Escape Grapple, release, free hand, size limit, escape DC,
  Grappled attack-roll disadvantage, drag-cost fact.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Movement and Position,
  Difficult Terrain, Breaking Up Your Move, Dropping Prone, Creature Size,
  Opportunity Attacks.
- `.references/srd-5.2.1/Rules-Glossary.md`: Grappled, Grappling, Opportunity
  Attacks, Speed, Unarmed Strike, Prone, Size.

Ubiquitous-language checks:

- Speed vs Movement, Difficult Terrain, Size, Grapple, Free Hand, Opportunity
  Attack.

Architecture notes:

- Spatial facts remain table/caller/session facts. QNT proves what reducer does
  with supplied facts, not pathfinding, adjacency, cover, or line of sight.
- Grapple should be a bounded state machine with a shallow attack-roll
  disadvantage integration proof.

## QCORE8 - Reactions, Continuations, and Concentration

Production mechanics:

- reaction resource spend/refresh;
- interrupt windows, decline, nested windows, replay continuations;
- opportunity attack continuation;
- readied movement/spell release;
- concentration ownership, break/prevent, damage save DC, failed save break.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Reactions, Opportunity Attacks,
  Ready, Concentration, Damage and Healing.
- `.references/srd-5.2.1/Rules-Glossary.md`: Reaction, Ready, Concentration,
  Opportunity Attacks.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: Concentration and
  Ready spell casting.

Ubiquitous-language checks:

- Offer, Decline, Advance, Reaction, Concentration, Spell Invocation, Spell
  Effect.

Architecture notes:

- This is the highest composition-risk cluster. Keep a small standalone
  continuation algebra first, then one shallow integration with attack damage
  and one with readied spell release.
- Do not model all possible reaction features here; QCORE9 consumes this
  protocol through feature procedure facts.

## QCORE9 - Unit Feature Procedure Profiles

Production mechanics:

- Action Surge, Second Wind, Cunning Action, critical range 19;
- Rage, Reckless Attack;
- Sneak Attack;
- Evasion-style save damage replacement;
- Cutting Words, Uncanny Dodge.

RAW anchors:

- `.references/srd-5.2.1/Classes/Fighter.md`: Action Surge, Second Wind,
  Champion Improved Critical.
- `.references/srd-5.2.1/Classes/Rogue.md`: Cunning Action, Sneak Attack,
  Evasion, Uncanny Dodge.
- `.references/srd-5.2.1/Classes/Barbarian.md`: Rage, Reckless Attack.
- `.references/srd-5.2.1/Classes/Bard.md`: Bardic Inspiration/Cutting Words
  where available in the local corpus.

Ubiquitous-language checks:

- Rider, Resource Consumption, Attack Damage Rider, Reaction, Resistance,
  Critical Hit.

Architecture notes:

- QNT models feature procedure profiles, not Unit ids or full Surface feature
  records.
- Non-SRD/PHB-like fixtures must use fake names while preserving mechanics.
- Typed projection parsers own authored-content admission and should replace
  forward references to support gates.

## QCORE10 - Spell Procedure Profiles

Production mechanics:

- Magic Missile, Ray of Frost, Acid Splash, Healing Word, Mage Armor;
- prepared slot spend, cantrip non-spend, action/bonus-action spell costs;
- spell target allocation, spell attack rolls, save-gate damage;
- persistent Mage Armor effect and early end;
- readied spell cast/release integration with QCORE8.

RAW anchors:

- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: casting time,
  spell slots, cantrips, spell attacks, Concentration, Ready spell casting.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Acid Splash.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Mage Armor, Magic
  Missile.
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`: Ray of Frost.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Healing Word.

Ubiquitous-language checks:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect, Spell Slot,
  Cantrip, Concentration, Magic Action.

Architecture notes:

- Model spell invocation procedure facts, not full spell definitions.
- Spell width should be per procedure family: attack spell, save-gate damage,
  direct allocation damage, healing spell, persistent AC effect.
- Do not let spell QNT absorb the whole battle reducer; integrate with QCORE8
  and QCORE4 through shallow checks.

## QCORE11 - Stat-Block Controls

Production mechanics:

- Stat Block attack options;
- Multiattack dispatch resources and interleaving;
- Stat Block Bonus Action options;
- Reaction and Legendary Action windows;
- X/Day, Recharge, Recharge after rest, start-turn recharge roll.

RAW anchors:

- `.references/srd-5.2.1/Monsters/Overview.md`: Actions, Multiattack, Bonus
  Action, Reactions, Legendary Actions, Limited Usage.
- `.references/srd-5.2.1/Rules-Glossary.md`: Stat Block, Reaction.

Ubiquitous-language checks:

- Stat Block, Monster, Action Lifecycle, Pool/Quota/Spend, Reaction.

Architecture notes:

- QNT models monster-control procedure facts after StatBlock projection.
- Catalog breadth remains Surface/StatBlock contract tests.
- Multiattack must remain a named dispatch procedure, not a competing authored
  execution language.

## Reviewer Checklist

Each QCORE must pass these checks before implementation closeout:

- RAW: every modeled rule traces to local SRD text or a named `ASSUMPTIONS.md`
  entry.
- Ubiquitous language: terms match `UBIQUITOUS_LANGUAGE.md`, especially HP,
  death, action lifecycle, spell ownership, movement/spatial, and riders.
- Architecture: QNT remains procedure-first and Surface-free; projection parsers
  own authored-content admission; state spaces stay bounded and composable.
