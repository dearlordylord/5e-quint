# 05. Condition Effects Lookup Table

## Origin

The pattern comes from **Foundry VTT dnd5e** (`module/config.mjs`). Foundry defines a declarative `conditionEffects` map that links mechanical consequence categories to sets of condition identifiers:

```javascript
DND5E.conditionEffects = {
  noMovement:          new Set(["exhaustion-5", "grappled", "paralyzed", "petrified",
                                "restrained", "unconscious"]),
  halfMovement:        new Set(["exhaustion-2"]),
  attackDisadvantage:  new Set(["poisoned", "exhaustion-3"]),
  // ...
};
```

The system queries these sets during data preparation and roll building. It never asks "what does blinded do?" inline -- it asks "which conditions cause attack disadvantage?" and gets an answer from one place. Condition *definitions* (name, image, implied statuses, riders) live in a separate `conditionTypes` config; this map is purely about *mechanical consequences*.

## Graphical Overview

```
                         Condition Effects Lookup Table
                         (Foundry VTT pattern)

   CONSEQUENCE AXIS                          CONDITION AXIS
   (what happens)                            (what you have)

  ┌──────────────────┐      ┌─────────┬─────────┬──────────┬─────────┬──────┐
  │ noMovement       │ ───> │ grappled│paralyzed│petrified │restrain.│uncon.│
  ├──────────────────┤      ├─────────┼─────────┼──────────┼─────────┼──────┤
  │ halfMovement     │ ───> │ exhaust2│         │          │         │      │
  ├──────────────────┤      ├─────────┼─────────┼──────────┼─────────┼──────┤
  │ attackDisadvant.  │ ───> │ blinded │poisoned │restrain. │exhaust3 │      │
  ├──────────────────┤      ├─────────┼─────────┼──────────┼─────────┼──────┤
  │ defenseAdvantage │ ───> │ blinded │paralyzed│petrified │stunned  │uncon.│
  ├──────────────────┤      ├─────────┼─────────┼──────────┼─────────┼──────┤
  │ saveFail (STR/DEX│ ───> │paralyzed│petrified│stunned   │uncon.   │      │
  │  auto-fail)      │      │         │         │          │         │      │
  ├──────────────────┤      ├─────────┼─────────┼──────────┼─────────┼──────┤
  │ autoCrit (5ft)   │ ───> │paralyzed│uncon.   │          │         │      │
  └──────────────────┘      └─────────┴─────────┴──────────┴─────────┴──────┘

   ONE lookup per consequence       vs.     ONE check per condition (scattered)
   "which conditions cause X?"              "does this condition cause X?"
```

The key insight is **consequence-indexed** rather than **condition-indexed**. When resolving an attack roll, the system doesn't iterate through every condition the creature has and switch on it -- it checks `conditionEffects.attackDisadvantage` once.

## Which Projects Use It

### Foundry VTT dnd5e (Tier A) -- Gold Standard

Cleanest implementation. Declarative Set-based map in `config.mjs`. Consequence categories are the keys; condition identifiers are the values. Handles leveled conditions (exhaustion-2, exhaustion-5) elegantly. Zero redundancy between condition definitions and effect lookups.

See [ARCHITECTURE-foundryvtt-dnd5e.md](./ARCHITECTURE-foundryvtt-dnd5e.md) lines 176-191.

### dnd_engine (Tier A) -- Self-Describing Variant

Each condition is a class with `_apply()` / `remove()` methods that inject typed modifiers into a 4-channel algebra (self/contextual x own/target). On removal, they clean up by UUID. The table is implicit: it's spread across ~14 condition classes in `dnd/conditions.py` (734 LOC). Harder to audit globally, but each condition is self-contained.

See [ARCHITECTURE-dnd_engine.md](./ARCHITECTURE-dnd_engine.md) lines 157-177.

### Anti-Patterns

| Project | Pattern | Problem |
|---------|---------|---------|
| **OpenCombatEngine** | Dual-path: hard-coded `HasCondition(X)` checks AND effects pipeline | Divergence risk -- a condition can be partially modeled in one path, or both, with no verification they agree |
| **libsrd5** | Split: 5 of 19 conditions have Apply/Unapply; rest checked inline | Can't audit whether all mechanical implications are handled |
| **natural_20** | Fully scattered: each condition checked inline wherever relevant | Adding a condition requires finding every relevant code path |

## What We Use Instead

Our project does **not** use a centralized lookup table. Instead, condition mechanical effects are encoded as **explicit pure-function predicates in the Quint spec**, grouped by resolution context:

### Quint spec (authoritative source)

In `creature.qnt`:

| Function | Lines | Purpose |
|----------|-------|---------|
| `pOwnAttackModifiers()` | ~1050 | Attacker's conditions -> advantage/disadvantage on own attacks |
| `pDefenseModifiers()` | ~1061 | Defender's conditions -> advantage granted to attackers |
| `pCheckModifiers()` | ~1075 | Conditions -> ability check modifiers |
| `pSaveModifiers()` | ~1089 | Conditions -> saving throw modifiers (incl. auto-fail) |
| `pComputeEffectiveSpeed()` | ~1326 | Conditions -> speed 0 (grappled, restrained, etc.) |
| `pCanAct()` | ~1105 | Incapacitated sources -> blocks actions/reactions |
| `pApplyCondition()` | ~970 | Condition implication chains (unconscious -> prone + incapacitated) |

Each function reads the creature's condition flags and returns the mechanical effect for that resolution context. The logic is **not scattered** -- it's grouped by consequence type, similar to Foundry's consequence-indexed map, but expressed as guard predicates rather than Set lookups.

### TS mirror (parity-tested via MBT)

| File | Function | Purpose |
|------|----------|---------|
| `battle-machine-actions-attack.ts` | `buildBattleAttackContext()` | Pulls condition flags from battle state into `AttackContext` |
| `machine-combat.ts` | `aggregateAttackMods()` | Translates `AttackContext` -> `FullAttackMods` (adv/disadv/autoCrit) |
| `machine-helpers.ts` | `applyConditionUpdate()` / `removeConditionUpdate()` | State management for condition add/remove with implication chains |
| `types.ts` | `CONDITIONS` array + `Condition` type | 14 conditions as `as const satisfies ReadonlyArray` |

MBT bridge (`battle-machine.mbt.test.ts` / `battle-projection.mbt.test.ts`) ensures the TS layer matches Quint semantics.

### Assessment

Our approach is **closer to Foundry's than it appears**. The Quint functions are consequence-indexed (each function answers "what happens at attack resolution?" not "what does blinded do?"). The main difference is that Quint expresses these as guard predicates within pure functions rather than as a declarative data structure.

The practical gap: when adding a new condition or modifying an existing one, a developer must update multiple `p*Modifiers()` functions -- the same "find every relevant code path" problem that Foundry's lookup table solves. The Quint invariant fuzzer catches mismatches post-hoc, but doesn't prevent them structurally.

The 05 recommendation (Adopt) still holds: a canonical condition-consequence mapping -- even if expressed as a Quint record-of-sets rather than a JS config object -- would make the spec easier to audit and harder to update incorrectly.

## Design: Option A — Parallel TS Constant, MBT-Verified

### Overview

Define a `CONDITION_EFFECTS` table in Quint (authoritative) and a parallel `CONDITION_EFFECTS` constant in TypeScript (operational). MBT parity tests verify they agree. No codegen tooling required.

The table is **condition-indexed** (one row per condition, one column per consequence category). The existing predicate functions in both layers are rewritten to query the table instead of hand-listing conditions.

### Quint Table (creature.qnt)

```quint
/// Unconditional mechanical consequences of having a condition.
/// Context-dependent effects (prone+distance, frightened+LOS, invisible role,
/// grappled non-grappler attacks, charmed charmer targeting, frightened can't-approach)
/// remain as explicit guards in the predicate functions.
type ConditionEffects = {
  ownAttackAdv:       bool,  // advantage on own attacks
  ownAttackDisadv:    bool,  // disadvantage on own attacks
  defenseAdv:         bool,  // attackers get advantage against you
  defenseAutoCrit5ft: bool,  // attacks within 5ft auto-crit
  checkDisadv:        bool,  // disadvantage on ability checks
  saveDisadvDex:      bool,  // disadvantage on DEX saves
  saveAutoFailStrDex: bool,  // auto-fail STR/DEX saves
  speedZero:          bool,  // speed becomes 0
  blocksActions:      bool,  // can't take actions, bonus actions, or reactions (SRD "Inactive")
  blocksSpeech:       bool,  // can't speak (SRD "Speechless")
  breaksConc:         bool,  // concentration broken immediately (SRD "No Concentration")
  initDisadv:         bool,  // disadvantage on initiative rolls (SRD "Surprised")
  allDamageResist:    bool,  // resistance to all damage types
  blocksPoisonApp:    bool,  // blocks application of poisoned
  impliesProne:       bool,  // auto-applies prone on application
  impliesIncap:       bool,  // adds incapacitation source on application
}
```

Full table (SRD 5.2.1 citations in comments):

```quint
val CONDITION_EFFECTS: Condition -> ConditionEffects = Map(
  // SRD 5.2.1 Rules-Glossary citations inline.
  // CE is a zero-valued ConditionEffects record (all false) used as a spread base.

  CBlinded -> { CE with                                // "Blinded [Condition]"
    ownAttackDisadv: true,                             //   "Attacks Affected. You have Disadvantage on attack rolls."
    defenseAdv: true,                                  //   "Attacks Affected. Attack rolls against you have Advantage."
  },
  CCharmed -> { CE with },                             // "Charmed [Condition]" — all effects are source-dependent (contextual)
  CDeafened -> { CE with },                            // "Deafened [Condition]" — auto-fail on hearing checks is contextual
  CFrightened -> { CE with },                          // "Frightened [Condition]" — disadv + can't-approach both depend on source (contextual)
  CGrappled -> { CE with                               // "Grappled [Condition]"
    speedZero: true,                                   //   "Speed 0. Your Speed is 0 and can't increase."
  },                                                   //   attack disadv vs non-grappler is contextual (depends on target identity)
  CIncapacitated -> { CE with                          // "Incapacitated [Condition]"
    blocksActions: true,                               //   "Inactive. You can't take any action, Bonus Action, or Reaction."
    blocksSpeech: true,                                //   "Speechless. You can't speak."
    breaksConc: true,                                  //   "No Concentration. Your Concentration is broken."
    initDisadv: true,                                  //   "Surprised. If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll."
  },
  CInvisible -> { CE with },                           // "Invisible [Condition]" — adv/disadv depends on attacker vs defender role (contextual)
  CParalyzed -> { CE with                              // "Paralyzed [Condition]"
    defenseAdv: true,                                  //   "Attacks Affected. Attack rolls against you have Advantage."
    defenseAutoCrit5ft: true,                          //   "Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you."
    saveAutoFailStrDex: true,                          //   "Saving Throws Affected. You automatically fail Strength and Dexterity saving throws."
    speedZero: true,                                   //   "Speed 0. Your Speed is 0 and can't increase."
    blocksActions: true, blocksSpeech: true,            //   "Incapacitated. You have the Incapacitated condition." (inherits Inactive + Speechless)
    breaksConc: true, initDisadv: true,                //   (inherits No Concentration + Surprised)
    impliesIncap: true,
  },
  CPetrified -> { CE with                              // "Petrified [Condition]"
    defenseAdv: true,                                  //   "Attacks Affected. Attack rolls against you have Advantage."
                                                       //   NOTE: no auto-crit — SRD Petrified does NOT include the "Automatic Critical Hits" clause
    saveAutoFailStrDex: true,                          //   "Saving Throws Affected. You automatically fail Strength and Dexterity saving throws."
    speedZero: true,                                   //   "Speed 0. Your Speed is 0 and can't increase."
    blocksActions: true, blocksSpeech: true,            //   "Incapacitated. You have the Incapacitated condition." (inherits Inactive + Speechless)
    breaksConc: true, initDisadv: true,                //   (inherits No Concentration + Surprised)
    allDamageResist: true,                             //   "Damage Resistance. You have Resistance to all damage."
    blocksPoisonApp: true,                             //   "Poison Immunity. You are immune to the Poisoned condition."
    impliesIncap: true,
  },
  CPoisoned -> { CE with                               // "Poisoned [Condition]"
    ownAttackDisadv: true,                             //   "Attacks Affected. You have Disadvantage on attack rolls."
    checkDisadv: true,                                 //   "Ability Checks Affected. You have Disadvantage on ability checks."
  },
  CProne -> { CE with                                  // "Prone [Condition]"
    ownAttackDisadv: true,                             //   "Attacks Affected. You have Disadvantage on attack rolls."
  },                                                   //   defense adv/disadv depends on attacker distance (contextual)
  CRestrained -> { CE with                             // "Restrained [Condition]"
    ownAttackDisadv: true,                             //   "Attacks Affected. You have Disadvantage on attack rolls."
    defenseAdv: true,                                  //   "Attacks Affected. Attack rolls against you have Advantage."
    saveDisadvDex: true,                               //   "Saving Throws Affected. You have Disadvantage on Dexterity saving throws."
    speedZero: true,                                   //   "Speed 0. Your Speed is 0 and can't increase."
  },
  CStunned -> { CE with                               // "Stunned [Condition]"
    defenseAdv: true,                                  //   "Attacks Affected. Attack rolls against you have Advantage."
    saveAutoFailStrDex: true,                          //   "Saving Throws Affected. You automatically fail Strength and Dexterity saving throws."
    blocksActions: true, blocksSpeech: true,            //   "Incapacitated. You have the Incapacitated condition." (inherits Inactive + Speechless)
    breaksConc: true, initDisadv: true,                //   (inherits No Concentration + Surprised)
    impliesIncap: true,
  },
  CUnconscious -> { CE with                           // "Unconscious [Condition]"
    defenseAdv: true,                                  //   "Attacks Affected. Attack rolls against you have Advantage."
    defenseAutoCrit5ft: true,                          //   "Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you."
    saveAutoFailStrDex: true,                          //   "Saving Throws Affected. You automatically fail Strength and Dexterity saving throws."
    speedZero: true,                                   //   "Speed 0. Your Speed is 0 and can't increase."
    blocksActions: true, blocksSpeech: true,            //   "Inert. You have the Incapacitated and Prone conditions..." (inherits Inactive + Speechless)
    breaksConc: true, initDisadv: true,                //   (inherits No Concentration + Surprised)
    impliesProne: true,                                //   "Inert. ...and Prone conditions, and you drop whatever you're holding."
    impliesIncap: true,
  },
)
```

### Predicate Rewrite (creature.qnt)

Each existing function becomes a table query. Example:

```quint
// BEFORE — hand-listed conditions:
pure def pOwnAttackModifiers(s) =
  val disadv = s.blinded or s.prone or s.restrained or s.poisoned
  val adv = s.invisible
  ...

// AFTER — table-driven:
pure def pOwnAttackModifiers(s) =
  val disadv = activeConditions(s).exists(c => CONDITION_EFFECTS.get(c).ownAttackDisadv)
  val adv = activeConditions(s).exists(c => CONDITION_EFFECTS.get(c).ownAttackAdv)
  // frightened + LOS layered on top (contextual, not in table)
  ...
```

Functions rewritten:

| Function | Table columns read |
|----------|-------------------|
| `pOwnAttackModifiers()` | `ownAttackAdv`, `ownAttackDisadv` + contextual frightened/invisible/grappled-non-grappler guards |
| `pDefenseModifiers()` | `defenseAdv`, `defenseAutoCrit5ft` + contextual prone+distance, invisible guards |
| `pCheckModifiers()` | `checkDisadv` + contextual frightened+LOS, charmed+social, blinded+sight, deafened+hearing |
| `pSaveModifiers()` | `saveDisadvDex`, `saveAutoFailStrDex` |
| `pComputeEffectiveSpeed()` | `speedZero` + contextual frightened can't-approach, prone crawl cost |
| `pCanAct()` | `blocksActions` (via `isIncapacitated`, which reads `incapacitatedSources`) |
| `pCanSpeak()` | `blocksSpeech` (NOTE: current code checks paralyzed/petrified/unconscious but misses incapacitated/stunned — table-driven rewrite fixes this SRD gap) |
| `pApplyCondition()` | `impliesProne`, `impliesIncap`, `blocksPoisonApp` |
| `pTakeDamageAsCreature()` | `allDamageResist` |
| concentration logic | `breaksConc` (currently handled by `isIncapacitated()` check — table makes this explicit) |
| initiative logic | `initDisadv` (not currently modeled — table surfaces the SRD requirement) |

### TS Table (types.ts)

```typescript
interface ConditionEffects {
  readonly ownAttackAdv:       boolean
  readonly ownAttackDisadv:    boolean
  readonly defenseAdv:         boolean
  readonly defenseAutoCrit5ft: boolean
  readonly checkDisadv:        boolean
  readonly saveDisadvDex:      boolean
  readonly saveAutoFailStrDex: boolean
  readonly speedZero:          boolean
  readonly blocksActions:      boolean
  readonly blocksSpeech:       boolean
  readonly breaksConc:         boolean
  readonly initDisadv:         boolean
  readonly allDamageResist:    boolean
  readonly blocksPoisonApp:    boolean
  readonly impliesProne:       boolean
  readonly impliesIncap:       boolean
}

const CE: ConditionEffects = {
  ownAttackAdv: false, ownAttackDisadv: false,
  defenseAdv: false, defenseAutoCrit5ft: false,
  checkDisadv: false, saveDisadvDex: false, saveAutoFailStrDex: false,
  speedZero: false, blocksActions: false, blocksSpeech: false,
  breaksConc: false, initDisadv: false,
  allDamageResist: false, blocksPoisonApp: false,
  impliesProne: false, impliesIncap: false,
}

const CONDITION_EFFECTS: Record<Condition, ConditionEffects> = {
  blinded:       { ...CE, ownAttackDisadv: true, defenseAdv: true },
  charmed:       { ...CE },                            // all effects source-dependent (contextual)
  deafened:      { ...CE },                            // auto-fail on hearing checks is contextual
  frightened:    { ...CE },                            // disadv + can't-approach both depend on source (contextual)
  grappled:      { ...CE, speedZero: true },           // attack disadv vs non-grappler is contextual
  incapacitated: { ...CE, blocksActions: true, blocksSpeech: true,
                   breaksConc: true, initDisadv: true },
  invisible:     { ...CE },                            // adv/disadv depends on attacker vs defender role (contextual)
  paralyzed:     { ...CE, defenseAdv: true, defenseAutoCrit5ft: true,
                   saveAutoFailStrDex: true, speedZero: true,
                   blocksActions: true, blocksSpeech: true,
                   breaksConc: true, initDisadv: true, impliesIncap: true },
  petrified:     { ...CE, defenseAdv: true,            // NOTE: no auto-crit per SRD
                   saveAutoFailStrDex: true, speedZero: true,
                   blocksActions: true, blocksSpeech: true,
                   breaksConc: true, initDisadv: true,
                   allDamageResist: true, blocksPoisonApp: true, impliesIncap: true },
  poisoned:      { ...CE, ownAttackDisadv: true, checkDisadv: true },
  prone:         { ...CE, ownAttackDisadv: true },     // defense adv/disadv depends on distance (contextual)
  restrained:    { ...CE, ownAttackDisadv: true, defenseAdv: true,
                   saveDisadvDex: true, speedZero: true },
  stunned:       { ...CE, defenseAdv: true,
                   saveAutoFailStrDex: true,
                   blocksActions: true, blocksSpeech: true,
                   breaksConc: true, initDisadv: true, impliesIncap: true },
  unconscious:   { ...CE, defenseAdv: true, defenseAutoCrit5ft: true,
                   saveAutoFailStrDex: true, speedZero: true,
                   blocksActions: true, blocksSpeech: true,
                   breaksConc: true, initDisadv: true,
                   impliesProne: true, impliesIncap: true },
} as const satisfies Record<Condition, ConditionEffects>
```

### TS Scattered-Check Rewrite

~109 condition checks across 8 files collapse to ~15 table queries + ~10 contextual guards.

**machine-queries.ts** — 4 functions become table lookups:

```typescript
// ownAttackMods(): 6 checks → 2 queries + 1 contextual guard
const adv  = active.some(c => CONDITION_EFFECTS[c].ownAttackAdv)
const disadv = active.some(c => CONDITION_EFFECTS[c].ownAttackDisadv)
// + frightened+LOS guard (contextual)

// defenseMods(): 8 checks → 2 queries + 2 contextual guards
const adv  = active.some(c => CONDITION_EFFECTS[c].defenseAdv)
const crit = active.some(c => CONDITION_EFFECTS[c].defenseAutoCrit5ft) && within5ft
// + prone+distance guard, invisible guard (contextual)

// checkMods(): 4 checks → 1 query + 2 contextual guards
const disadv = active.some(c => CONDITION_EFFECTS[c].checkDisadv)
// + frightened+LOS, blinded+sight, deafened+hearing (contextual)

// saveMods(): 5 checks → 2 queries
const disadv   = active.some(c => CONDITION_EFFECTS[c].saveDisadvDex) && ability === "dex"
const autoFail = active.some(c => CONDITION_EFFECTS[c].saveAutoFailStrDex) && (ability === "str" || ability === "dex")
```

**machine-combat.ts** — `aggregateAttackMods()` splits into table portion + contextual portion:

```typescript
// Unconditional (from table):
const tgtAdv  = targetActive.some(c => CONDITION_EFFECTS[c].defenseAdv)
const tgtCrit = targetActive.some(c => CONDITION_EFFECTS[c].defenseAutoCrit5ft) && ctx.attackerWithin5ft
const atkDisadv = attackerActive.some(c => CONDITION_EFFECTS[c].ownAttackDisadv)
const atkAdv  = attackerActive.some(c => CONDITION_EFFECTS[c].ownAttackAdv)

// Contextual (stays explicit):
if (ctx.targetProne && ctx.attackerWithin5ft) advSources.push("prone-melee")
if (ctx.targetProne && !ctx.attackerWithin5ft) disadvSources.push("prone-ranged")
if (ctx.attackerFrightened && ctx.frightenedSourceInLOS) disadvSources.push("frightened")
if (ctx.targetDodging && ctx.targetCanSeeAttacker && !isIncap && ctx.targetSpeed > 0) ...
```

**machine-helpers.ts** — `calculateEffectiveSpeed()`:

```typescript
// BEFORE: 5 separate condition checks
if (ctx.grappled || ctx.restrained || ctx.paralyzed || ctx.petrified || ctx.unconscious) return 0

// AFTER: 1 table query
if (activeConditions.some(c => CONDITION_EFFECTS[c].speedZero)) return 0
```

**battle-machine-creature.ts** — `applyCondition()` implication logic:

```typescript
// BEFORE: per-condition switch with hand-coded implications
// AFTER:
const eff = CONDITION_EFFECTS[cond]
let state = setConditionFlag(state, cond, true)
if (eff.impliesProne) state = setConditionFlag(state, "prone", true)
if (eff.impliesIncap) state = addIncapSource(state, toIncapSource(cond))
// blocksPoisonApp checked when applying "poisoned":
if (cond === "poisoned" && activeConditions.some(c => CONDITION_EFFECTS[c].blocksPoisonApp)) return state // no-op
```

### What Stays Outside the Table

Context-dependent effects that cannot be reduced to a boolean per condition. These require additional state (who the source is, how far away the attacker is, what ability a check uses, etc.) to resolve.

| Effect | Why contextual | Where it stays |
|--------|---------------|----------------|
| **Charmed: can't harm charmer** | Depends on who the charmer is — can't attack or target charmer with damaging abilities (SRD "Can't Harm the Charmer") | Attack/targeting validation guards |
| **Charmed: social advantage** | Charmer has advantage on social checks against you (SRD "Social Advantage") | `pCheckModifiers()` explicit guard |
| **Frightened + LOS** | Disadvantage on attacks and ability checks only if source of fear is within line of sight (SRD "Ability Checks and Attacks Affected") | `pOwnAttackModifiers()` / `pCheckModifiers()` explicit guard |
| **Frightened: can't approach** | Can't willingly move closer to the source of fear (SRD "Can't Approach") | Movement validation guard |
| **Grappled: attack disadv vs non-grappler** | Disadvantage on attack rolls against any target other than the grappler (SRD "Attacks Affected") | `pAggregateAttackMods()` / `aggregateAttackMods()` explicit guard |
| **Grappled: drag/carry** | Grappler can drag or carry you, costing 1 extra foot per foot unless Tiny or 2+ sizes smaller (SRD "Movable") | Movement cost calculation |
| **Invisible role** | Advantage on own attacks, disadvantage for attackers — depends on which side (SRD attacker/defender symmetry) | `pOwnAttackModifiers()` / `pDefenseModifiers()` explicit guard |
| **Prone + distance** | Advantage for attackers within 5ft, disadvantage for attackers beyond 5ft (SRD "Attacks Affected") | `pDefenseModifiers()` / `aggregateAttackMods()` explicit guard |
| **Prone: crawl** | Moving while prone costs 1 extra foot per foot (SRD "Crawling"); standing costs half speed | Movement cost calculation |
| **Deafened + hearing** | Auto-fail only if check requires hearing (SRD "Can't Hear") | `pCheckModifiers()` explicit guard |
| **Blinded + sight** | Auto-fail only if check requires sight (SRD "Can't See") | `pCheckModifiers()` explicit guard |
| **Unconscious: drop items** | You drop whatever you're holding (SRD "Inert") | Inventory management on condition application |
| **Unconscious: unaware** | You're unaware of your surroundings (SRD "Unaware") | Perception/awareness checks |
| **Unconscious: remain prone** | When unconscious ends, you remain Prone (SRD "Inert") | `pRemoveCondition()` special case |
| **Grappling speed** | Halved only if target NOT 2+ sizes smaller | `pComputeEffectiveSpeed()` explicit guard |
| **Exhaustion** | Leveled (not boolean), separate integer field | `exhaustionPenalty()` — not a Condition enum member |

### What Changes in battle.qnt

Nothing. Battle.qnt reads condition flags for attack context construction (lines 1192-1204) and calls `isIncapacitated()` (~30 sites). Both patterns are unaffected — the table lives inside the predicate functions that battle.qnt already calls.

### Files Touched

| File | Change |
|------|--------|
| `creature.qnt` | Add `ConditionEffects` type, `CE` zero-record, `CONDITION_EFFECTS` map, `activeConditions()` helper. Rewrite ~7 predicate functions to table queries. |
| `battle.qnt` | None |
| `types.ts` | Add `ConditionEffects` interface, `CE` zero-record, `CONDITION_EFFECTS` constant |
| `machine-queries.ts` | Rewrite `ownAttackMods()`, `defenseMods()`, `checkMods()`, `saveMods()` to table lookups |
| `machine-combat.ts` | Simplify `aggregateAttackMods()` — unconditional portion from table |
| `machine-helpers.ts` | Simplify `calculateEffectiveSpeed()` to one table query |
| `battle-machine-creature.ts` | Simplify `applyCondition()`/`removeCondition()` implication logic via table columns |

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Quint Map iteration cost (14 conditions per resolution) | Negligible vs. evaluator overhead; `activeConditions` is typically 0-3 elements |
| Two tables (Quint + TS) diverge | MBT parity tests catch immediately |
| Context-dependent effects omitted from table | Documented in "What Stays Outside" section (17 entries); contextual guards remain explicit with comments pointing to the table |
| Table row doesn't match SRD | Add Quint `test` block asserting each row against SRD text with citation comments |
| `activeConditions()` helper needs a boolean-flag-to-set projection | Small helper: read each flag, collect into Set. Runs only in predicate functions, not hot path. |

### Existing Code Gaps Surfaced by This Design

Cross-referencing the table against SRD 5.2.1 and current code revealed these gaps. They are pre-existing bugs, not introduced by this design — but the table-driven rewrite is the right time to fix them.

| Gap | SRD says | Current code does | Table fix |
|-----|---------|-------------------|-----------|
| `pCanSpeak` / `canSpeak` misses incapacitated and stunned | Incapacitated: "Speechless. You can't speak." Stunned implies incapacitated. | Only checks paralyzed, petrified, unconscious (creature.qnt ~L1107, machine-queries.ts ~L16) | `blocksSpeech: true` on incapacitated row; stunned inherits via `impliesIncap` |
| `pDefenseModifiers` never gave petrified auto-crit — and shouldn't | Petrified does NOT include "Automatic Critical Hits" clause | Correctly omits it (creature.qnt ~L1061) | Table correctly has `defenseAutoCrit5ft: false` for petrified |
| Initiative disadvantage when incapacitated not modeled | "Surprised. If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll." | Not modeled anywhere | `initDisadv: true` on incapacitated row; inherited by paralyzed/petrified/stunned/unconscious |

### Verification

1. Quint typecheck after adding table + rewriting predicates
2. `quint test --match "inv_"` — invariant scenario tests exercise condition edge cases
3. Tier 1 MBT — battle parity after predicate rewrite
4. `tsc` after TS table + scattered-check rewrite
5. Tier 2 MBT (10 seeds) — Quint-TS parity across rewritten surface
6. `/simplify` x2 — convergence on new table + rewritten functions

## Quint Impact

High. A canonical condition-consequence mapping would reduce scattered reasoning and make invariants easier to audit when new condition-adjacent features are added.

## Domain Language Impact

Very high. Conditions are core D&D language. One canonical table would tighten terminology and reduce accidental divergence.

## Recommendation

Adopt (Option A). Define the table in Quint and a parallel TS constant. MBT parity tests verify agreement. ~109 scattered TS checks collapse to ~15 table queries + ~10 contextual guards. The Quint predicate functions become table-driven, making the spec auditable at a glance.
