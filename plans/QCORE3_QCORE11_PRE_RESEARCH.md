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

Every QCORE implementation must define the executable procedure fact shape
before or alongside the QNT procedure. Authored inputs must cross a typed
projection parser that returns either those facts or typed projection issues.
Parser/catalog breadth is tested outside QNT; QNT fixtures instantiate the
executable facts directly. Reducers must consume the same fact shape or the task
must create an explicit parity-bridge follow-up.

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
  Throws, and ends the Unconscious/rest state created by Knock Out.
- `applyKnockOut(...)` turns a qualifying melee drop-to-zero into 1 HP plus
  Unconscious.
- Stable remains a 0 HP creature state with Unconscious; ordinary damage resumes
  the Death Saving Throw lifecycle through QCORE2.

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
- Represent Knock Out as the source/procedure that applies 1 HP plus
  Unconscious and any executable Short Rest/first-aid lifecycle; do not add an
  independent Knock Out status unless the type makes mismatched HP,
  Unconscious, and rest/first-aid combinations unrepresentable.
- Stable 1d4-hour recovery is out of scope unless a production reducer executes
  it; session handoff may record it, but QNT should only prove executable
  reducer procedure facts.

## QCORE4 - Damage Component Adjustments

Production mechanics:

- damage components by type;
- numeric damage modifiers before target damage adjustments;
- Immunity, Resistance, and Vulnerability;
- same-type component aggregation before target adjustment;
- proportional allocation across mixed damage components after applying the
  relevant modifier.

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
- RAW does not define every same-type aggregation or mixed-type allocation
  policy. QCORE4 must either require callers to provide already-partitioned
  damage instances after source-owned allocation or add an `ASSUMPTIONS.md`
  entry before implementation.

## QCORE5 - Attack Roll and Attack Damage Composition

Production mechanics:

- target fact legality, range-band facts, attack roll mode;
- attack roll d20 result 1 misses; d20 result 20 hits and is a Critical Hit;
  Champion procedure fact makes d20 result 19 also a Critical Hit;
- hit/miss branch, damage roll validation, Critical Hit dice doubling;
- melee Knock Out disposition hook from QCORE3;
- damage application through QCORE1-QCORE4;
- Attack action quota spend.

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

- Dash, Disengage, Dodge, Help, Hide, Search, Ready, End Turn;
- ordinary Action Quota and Bonus Action Quota Spend;
- turn refresh, Reaction Quota reset at the start of the creature's next turn,
  start/end turn effect expiry hooks;
- current-actor legality.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Actions, Bonus Actions,
  Reactions, The Order of Combat, Your Turn, Movement and Position, Dropping
  Prone.
- `.references/srd-5.2.1/Rules-Glossary.md`: Dash, Disengage, Dodge, Help,
  Hide, Ready, Search, Prone, Reaction.
- `ASSUMPTIONS.md`: A2 for End Turn as a runtime transition; A6/A16 if
  start/end-turn effect ordering is in implementation scope.

Ubiquitous-language checks:

- Action Lifecycle, Magic Action, Pool/Quota/Spend, Movement, Prone,
  Invisible/Hidden distinctions.

Architecture notes:

- Use existing shared action-economy QNT/TS semantics rather than creating a
  second resource model.
- Hide/Search should take table/caller facts as inputs; no geometry, line of
  sight, or cover derivation in QNT.
- Influence, Study, Utilize, and Magic are SRD action kinds but are not all
  production reducer procedures yet. QCORE6 should either model only the
  currently executable action facts or add a generic action-quota-spend
  procedure with parser consequences for non-executable action kinds.

## QCORE7 - Movement, Spatial Facts, and Grapple

Production mechanics:

- turn Movement budget and caller-supplied Movement cost;
- full Stand from Prone procedure: action legality, Prone removal, and Movement
  cost;
- opportunity-attack trigger facts;
- Grapple, Escape Grapple, release, free hand, size limit, escape DC, Grappled
  Speed becomes 0, Grappled attack-roll disadvantage, Grappled drag/carry extra
  Movement cost fact.

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
- Stand from Prone belongs here, not QCORE6, because its correctness couples
  condition removal to Movement cost.

## QCORE8 - Reactions, Continuations, and Concentration

Production mechanics:

- Reaction Quota Spend and reset;
- Offer/Decline reaction windows, nested reaction windows, Advance
  continuations;
- opportunity attack continuation;
- Readied Movement Response;
- concentration ownership, break/prevent, damage save DC, failed save break.

RAW anchors:

- `.references/srd-5.2.1/Playing-the-Game.md`: Reactions, Opportunity Attacks,
  Ready, Concentration, Damage and Healing.
- `.references/srd-5.2.1/Rules-Glossary.md`: Reaction, Ready, Concentration,
  Opportunity Attacks.
- `ASSUMPTIONS.md`: required before modeling nested/replay ordering, decline
  semantics beyond Ready's "ignore", or any queue/stack policy.

Ubiquitous-language checks:

- Offer, Decline, Advance, Reaction, Concentration.

Architecture notes:

- This is the highest composition-risk cluster. Keep a small standalone
  continuation algebra first, then one shallow integration with attack damage
  and one with Opportunity Attack.
- The continuation algebra is implementation protocol, not a direct RAW rule.
  Keep proof fixtures bounded: fixed maximum continuation depth, finite window
  kinds, branch budget beside each `any`, and separate shallow integrations for
  Opportunity Attack and damage interruption.
- Do not model all possible reaction features here; QCORE9 consumes this
  protocol through feature procedure facts.
- Do not model Readied Spell Response release here. QCORE10 defines Spell
  Invocation and Spell Effect procedure facts first, then adds the readied spell
  integration.

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
- `.references/srd-5.2.1/Classes/Bard.md`: Bardic Inspiration and College of
  Lore: Cutting Words.

Ubiquitous-language checks:

- Rider, Pool, Quota, Spend, Attack Damage Rider, Reaction, Resistance,
  Critical Hit.

Architecture notes:

- QNT models feature procedure profiles, not Unit ids or full Surface feature
  records.
- Non-SRD/PHB-like fixtures must use fake names while preserving mechanics.
- Typed projection parsers own authored-content admission and should replace
  forward references to support gates.

## QCORE10 - Spell Procedure Profiles

Production mechanics:

- Spell Definition procedure profiles for Magic Missile, Ray of Frost, Acid
  Splash, Healing Word, and Mage Armor;
- Spell Invocation from prepared Spell Access spends a Spell Slot; Cantrip
  invocations do not;
- Magic Action or Bonus Action quota spend for Spell Invocation;
- Spell Invocation target allocation, spell attack rolls, save-gated damage;
- persistent Mage Armor Spell Effect and early end;
- Readied Spell Response release integration with QCORE8.

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

- Model Spell Invocation procedure facts, not full Spell Definitions.
- Spell width should be per procedure family: attack spell, save-gate damage,
  direct allocation damage, healing spell, persistent AC effect.
- Do not let spell QNT absorb the whole battle reducer; integrate with QCORE8
  and QCORE4 through shallow checks.

## QCORE11 - Stat-Block Controls

Production mechanics:

- Stat Block attack options;
- Multiattack named dispatch procedure and interleaving;
- Stat Block Bonus Action options;
- Reaction and Legendary Action windows;
- X/Day, Recharge, Recharge after rest, start-turn recharge roll.

RAW anchors:

- `.references/srd-5.2.1/Monsters/Overview.md`: Actions, Multiattack, Bonus
  Action, Reactions, Legendary Actions, Limited Usage.
- `.references/srd-5.2.1/Rules-Glossary.md`: Stat Block, Reaction.
- `ASSUMPTIONS.md`: A18 for Multiattack counter mapping, dispatch identity, and
  any allowed interleaving.

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

## Pre-Review Closeout

RAW, architecture, and ubiquitous-language reviews were applied before adding
QCORE3-QCORE11 to `ACTIVE_PLAN.md`.

Applied review corrections:

- QCORE3: Knock Out is not an independent durable status; it is a procedure/source
  fact over 1 HP plus Unconscious and any executable rest/first-aid lifecycle.
- QCORE4: mixed-type damage allocation/aggregation needs caller-provided
  partitioned damage instances or an `ASSUMPTIONS.md` entry before
  implementation.
- QCORE5: Critical Hit language distinguishes the d20 trigger from the result.
- QCORE6: Stand from Prone moved to QCORE7; End Turn cites `ASSUMPTIONS.md`
  A2, with A6/A16 if start/end-turn ordering enters scope.
- QCORE7: Movement wording distinguishes Speed, turn Movement budget, and
  caller-supplied Movement cost.
- QCORE8: the continuation algebra is an implementation protocol, must be
  bounded, and needs assumptions before nested/replay queue or stack policy is
  modeled. Readied Spell Response integration is deferred to QCORE10.
- QCORE9: Bard/Cutting Words anchors use the concrete local corpus reference.
- QCORE10: spell terminology uses Spell Definition, Spell Access, Spell
  Invocation, and Spell Effect.
- QCORE11: Multiattack mapping/interleaving cites `ASSUMPTIONS.md` A18.
