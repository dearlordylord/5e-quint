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

## Quint Impact

High. A canonical condition-consequence mapping would reduce scattered reasoning and make invariants easier to audit when new condition-adjacent features are added.

## Domain Language Impact

Very high. Conditions are core D&D language. One canonical table would tighten terminology and reduce accidental divergence.

## Recommendation

Adopt. This is one of the best candidates for a deliberate architecture/domain-language improvement because it sharpens both the spec and the support code without changing authority.
