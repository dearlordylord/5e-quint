# Core → Non-Core Extraction Plan

**Goal:** Remove class-specific mechanics from `dnd.qnt` (core spec) that violate the boundary rule: "if a mechanic is specific to a class, spell, species, or subclass, it belongs in non-core."

## Boundary Rule (from PLAN.md)

> If a mechanic is specific to a class, spell, species, or subclass, it belongs in PLAN_NONCORE.md.
> If it's a generic rule that multiple features compose (d20 resolution, conditions, action economy, damage modifiers, etc.), it belongs here [core].

**Clarification (decided during implementation):** Classes themselves are core — hit die tables, multiclass prerequisites, and the class/species/subclass type system are part of the generic framework. Only class *features* (abilities, level-specific mechanics) are non-core.

---

## Completed Extractions

### E2: Uncanny Dodge → Non-Core ✓

**What:** `hasUncannyDodge` in `CharConfig`, `pUncannyDodgeDamage()`, `pCanUncannyDodge()` removed from spec.
**Destination:** `app/src/features/class-rogue.ts` (`uncannyDodgeDamage`, `canUncannyDodge`).

### E3: Channel Divinity Framework → Non-Core ✓

**What:** 5 functions removed from spec (`pClericChannelDivinityMax`, `pPaladinChannelDivinityMax`, `pChannelDivinityMax`, `pExpendChannelDivinity`, `pRestoreChannelDivinityShort`).
**Destination:** `app/src/features/class-paladin.ts` + `app/src/features/class-cleric.ts`.

### E4: Evasion → Non-Core ✓

**What:** `hasEvasion` in `CharConfig`, `pEvasionDamage()` removed from spec.
**Destination:** `app/src/features/class-rogue.ts` (`evasionDamage`).

---

## Kept in Core (decided to retain)

### E1: Class Lookup Tables — STAYS IN CORE

**What:** `pClassHitDie`, `pMeetsMulticlassPrereq`, `pCanMulticlass`
**Why kept:** Classes are core concepts, not class features. Hit dice and multiclass prerequisites define the class system itself, which the spec legitimately owns. TypeScript duplicates exist in `class-tables.ts` as a convenience.

### E2: Uncanny Dodge → Non-Core

**What:** `hasUncannyDodge` in `CharConfig`, `pUncannyDodgeDamage()`, `pCanUncannyDodge()` in spec.
**Why:** Single-class feature (Rogue 5). Already implemented as pure function in `class-rogue.ts`. Violates boundary rule cleanly.
**Impact:** Medium — remove from CharConfig + MBT bridge. Caller applies damage halving before sending TAKE_DAMAGE.
**Destination:** Already in `class-rogue.ts`. Caller computes halved damage, passes result to machine.
**Note:** The spec's `pCanUncannyDodge` checks `hasUncannyDodge AND reactionAvailable AND not incapacitated AND attackerVisible` — the reaction/incap checks are generic, but the feature gate is class-specific.

---

## Deferred (reassess later)

### E5: Fighting Style Functions → Non-Core (lean yes, but complex)

**What:** `pArcheryAttackBonus`, `pDefenseACBonus`, `pGWFDamageDie`, `pTWFOffHandDamageStyled` + `hasFightingStyleFeature`, `fightingStyles` in CharConfig.
**Why:** 3-class feature (Fighter, Paladin, Ranger). The functions are feature implementations.
**Impact:** High — TWF off-hand damage is integrated into TWF resolution path. GWF die reroll affects core damage computation. Extracting means spec loses ability to verify TWF/GWF correctness in random walks.
**Decision:** Defer. Reassess after E2-E4 pattern is validated.

---

## Keep in Core (high confidence)

| Item | Why Keep |
|------|----------|
| Class tables (`pClassHitDie`, `pMeetsMulticlassPrereq`, `pCanMulticlass`) | Classes are core concepts; hit dice and prereqs define the class system |
| Extra Attack (FExtraAttack variants) | 5+ classes, deeply integrated into action economy (extraAttacksRemaining in TurnState) |
| Unarmored Defense (BarbarianUD, MonkUD) | Modifies generic AC formula, only 2 variants, integrated into `calculateAC` |
| TWF mechanics | Generic combat rule (SRD "Two-Weapon Fighting"), not class-specific |
| `ClassName`/`Species`/`SubclassName` enums | Type safety in formal model; removing loses enum exhaustiveness checks |

---

## Not Moving to Core (confirmed non-core)

| Item | Why Stay Non-Core |
|------|-------------------|
| Resource Pool pattern | SRD doesn't define generic "resource pool"; would be an invented abstraction |
| Per-turn usage flags | Class-specific tracking; core already has generic `attackActionUsed`/`bonusActionUsed` |
| Damage bonus composition | Core already has `flatModifier` in `applyDamageModifiers`; features compute, caller passes |
| Temporary condition immunity | Class-specific exemptions; core provides apply/remove, features decide when |
