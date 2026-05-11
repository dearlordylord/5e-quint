# QCORE2 100 Percent RAW Coverage Research

Date: 2026-05-06

Status: historical pre-QCORE2 research. QCORE2-QCORE11 have since landed, and
the current battle QNT split/connectivity guidance lives in
`plans/BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md`,
`packages/battle-runtime/ARCHITECTURE_GRAPH.md`, and `plans/ACTIVE_PLAN.md`.

## Decision

The long-term target is QNT authority for every production-executable reducer
procedure, not only a repo-owned proof subset. If production TypeScript can
execute Multiattack, Grapple, a spell procedure, a class feature rider, a
monster resource, or an inferred Unit/Surface mechanic, that procedure needs a
Quint authority path.

Surface itself should not be modeled in QNT. QNT fixtures should instantiate the
post-projection executable facts that reducers consume. Typed projection parsers
own the bridge from authored Surface/Unit/StatBlock/Spell facts into those
procedure facts. The new proof chain is:

`rule-core QNT -> focused MBT/parity where useful -> reducers -> reducers used by production`

The rule-core must grow by deep, composable procedure clusters before broad
coverage. Broad battle specs remain selected integration checks, not the primary
composition mechanism.

## Production Mechanics Inventory

Current production behavior requiring QNT authority is visible in
`packages/battle-runtime/src/battle-subjects.ts`,
`packages/battle-runtime/src/battle-reducer.ts`,
`packages/battle-runtime/src/unit-feature-support.ts`,
`packages/shared-algebras/src`, and the promoted battle-runtime tests.

Already modular or partly modular:

- action economy: turn Action, Bonus Action, unit-granted action resources,
  restricted resource spending;
- conditions: Unconscious/Prone/Incapacitated implications;
- Death Saving Throw counters;
- Initiative advancement;
- attack roll hit/critical/natural-1/natural-20 checks;
- QCORE1 positive-Hit-Point damage.

Promoted battle-runtime procedures still needing rule-core decomposition:

- zero-HP lifecycle: damage at 0 HP, critical damage at 0 HP, massive damage,
  Stable, natural-20 recovery, healing out of Unconscious, Knock Out;
- damage adjustment: typed damage components, bonuses/reductions, Immunity,
  Resistance, Vulnerability, proportional reductions across mixed damage;
- attack procedure: target facts, attack roll mode, hit/miss, Critical Hit dice,
  damage roll validation, damage disposition, action spend;
- action/turn procedures: Dash, Disengage, Dodge, Help, Hide, Search, Ready,
  End Turn, Stand from Prone, movement budget;
- spatial fact procedures: range-band facts, opportunity-attack trigger facts,
  Help target facts, Hide prerequisites, Grapple movement-cost facts;
- Grapple and Escape Grapple: free hand, size limit, save/escape outcome,
  link state, release, Grappled attack-roll disadvantage;
- reactions and continuations: reaction resource, interrupt windows, decline,
  nested windows, readied movement/spell release, opportunity attacks;
- concentration: break/prevent effects, damage save DC, failed save lifecycle,
  readied spell concentration ownership;
- stat-block monster controls: Multiattack dispatch resources, Bonus Action
  options, Reaction/Legendary Action windows, X/Day, Recharge, recharge after
  rest;
- class feature procedures: Action Surge, Second Wind, Cunning Action, critical
  range 19, Rage, Reckless Attack, Sneak Attack, Evasion-style save damage
  replacement, Cutting Words, Uncanny Dodge;
- spell procedures currently in production: Magic Missile, Ray of Frost, Acid
  Splash, Healing Word, Mage Armor, prepared slot spending, cantrip non-spend,
  action/bonus-action spell costs, readied spell casting/release.

## Composable Proof Clusters

Use the QCORE0 pattern for every cluster:

- one or more stateless procedure modules with projection-shaped facts;
- one owned proof machine per procedure family;
- shallow integration modules only where adjacent procedures need an executable
  composition check;
- branch budgets recorded near `any`;
- serialized verifier runs;
- no Surface schemas or authored catalog enumeration in QNT.

Recommended order:

1. QCORE2: zero-HP damage plus Death Saving Throw procedure composition.
2. QCORE3: healing, Stable, Knock Out, and positive-HP Unconscious lifecycle.
3. QCORE4: damage component adjustment: reductions, Immunity, Resistance, and
   Vulnerability.
4. QCORE5: attack roll and attack damage composition over QCORE1-QCORE4.
5. QCORE6: action economy integration for Attack, Dash, Disengage, Dodge, Help,
   Hide, Search, Ready, End Turn, and Stand from Prone.
6. QCORE7: movement/spatial-fact procedures, Opportunity Attack trigger, and
   Grapple/Escape Grapple.
7. QCORE8: reaction/continuation protocol and concentration.
8. QCORE9: Unit feature procedure profiles.
9. QCORE10: spell procedure profiles.
10. QCORE11: stat-block Multiattack, limited-use, Recharge, and Legendary
    Action controls.

This order keeps deep invariants near Hit Points and interrupt windows before
trying to widen authored procedure coverage.

## Coverage Rule

A production mechanic is QNT-covered only when all of these are true:

- the executable procedure facts have a stateless QNT contract/procedure;
- any stateful lifecycle has an owned proof machine with bounded state;
- adjacent procedures that must compose have at least one shallow integration
  proof;
- the TypeScript reducer consumes the same procedure shape or has an explicit
  parity bridge task to do so;
- RAW anchors are listed from `.references/srd-5.2.1/` and checked against
  `UBIQUITOUS_LANGUAGE.md`;
- projection/parser breadth is tested outside QNT without multiplying authored
  catalog width into the proof state space.

## Research Findings

`packages/battle-runtime/battle-runtime.qnt` was already broad and
representative rather than a scalable 100-percent composition shape. Its own
comments showed many procedures in one model:
Hit Points, Death Saving Throws, Action Surge, Second Wind, Sneak Attack,
reaction windows, spell procedures, movement, opportunity attacks, Multiattack,
monster resources, Grapple, Hide/Search, and generic actions.

That breadth is exactly why QCORE should not widen first. The scalable path is
to split those procedures into rule-core modules and use battle-level QNT only
for selected verticals where composition risk is high.

At the time, reducer tests in `packages/battle-runtime/src/index.test.ts` were
the best inventory of production behavior. Current inventory and task status
now live in `plans/ACTIVE_PLAN.md` and the unit-profile coverage reports.

Forward docs should stop presenting "support gates" as the desired architecture.
The durable boundary is typed projection parsers: authored content either parses
into an executable procedure fact or fails with a typed projection issue. QNT
then proves procedure facts, not parser internals or authored catalog width.

## Historical Next Step

The original next step was to implement QCORE2 before widening. That work is no
longer pending; use `plans/ACTIVE_PLAN.md` for current task order.
