# 10. First-Class Resource Consumption

## Idea

Model resource consumption as an explicit typed concept rather than as incidental event handling.

## Current Fit In This Repo

- `battle.qnt` and `creature.qnt` already have many spending helpers: actions, reactions, movement, slots, charges, legendary actions, daily uses.
- `packages/core/src/available-actions.ts` exposes costs, but the vocabulary is still fairly shallow.
- many TS feature bridges encode resource spending implicitly in event sequences.

## Application To Our Code

This is one of the strongest improvement ideas.

The repo already models spending everywhere, but not yet as one domain concept with a shared language. A typed consumption model could unify:

- action economy spending
- slot spending
- charge spending
- per-turn quotas
- immediate spend-then-refund cases
- ready-action upfront spending

This would help the spec because one-slot-per-turn and reaction/action spending are already correctness-critical.

## Quint Impact

High. Explicit consumption vocabulary would clarify several subtle rules:

- spend versus reserve
- spend versus refund
- per-turn quota versus resource pool
- immediate versus deferred consumption

## Domain Language Impact

Very high. Terms like `consume`, `refund`, `reserve`, `quota`, and `cost target` would make current spell and feature rules easier to state precisely.

## Recommendation

Adopt. A first-class consumption model is one of the best ways to improve the battle and creature specs while also simplifying action tokens, feature bridges, and MBT explanations.

---

## Design: Applying First-Class Consumption To This Codebase

### Origin

The clearest external implementation is **foundryvtt-dnd5e** (Tier A). Its `ConsumptionTargetsField` (781 LOC) models resource consumption as a composable, typed, scalable data structure: an activity can consume multiple heterogeneous resources (spell slots + material components + item charges) in one operation, with scaling formulas per target and a `refund()` method for undo. Other competitors range from partial separation (`rpg-toolkit`'s two-level action/capacity model, `dnd_engine`'s `_apply_costs()` pipeline step) to fully ad-hoc (natural_20, libsrd5).

### Current State

The codebase already has strong per-resource mechanics:

- **30+ `pUse*`/`pExpend*` pure functions** in `creature.qnt` (quota and pool spends)
- **Battle-level wrappers** in `battle.qnt` (`expendSlot`, `refundSlot`, `spendReaction`, `spendLR`)
- **Parallel TS functions** in `battle-machine-creature.ts` (`spendAction`, `expendSlot`, etc.) — MBT-proven against Quint
- **Centralized guards** in `machine-guards.ts` (`hasAction`, `hasBonusAction`, `canActionSurge`, `legalPreparedSpellSlotLevels`, etc.)
- **A `ResourceCost` type** in `available-actions.ts` already exposed on every action token

What's missing: a **shared vocabulary** that names the *kinds* of resources and *shapes* of consumption so the existing helpers, guards, and MBT fields group into a coherent domain concept.

### The Taxonomy

#### Resource Kinds

Every consumable resource in the system falls into one of four kinds:

| Kind | Definition | Restoration | Examples |
|---|---|---|---|
| **Pool** | Counted stock depleted over a rest cycle | Rest boundaries | Spell slots, rage charges, focus points, lay-on-hands pool, action surge charges, LR charges, bardic inspiration, channel divinity |
| **Quota** | Per-turn allowance, auto-refills at turn start | Turn start | Actions (usually 1), bonus action (bool), reaction (bool), extra attacks (granted by Attack action), free object interaction, sneak attack (once/turn), movement feet |
| **Lock** | Exclusive-hold resource, only one holder at a time; taking a lock displaces the previous holder. Note: the lock *primitive* (`startConcentration`/`breakConcentration`) only sets/clears the field; the displacement cascade (removing effects, fizzling readied spells) lives in battle-level callers like `breakConcentrationAndPropagate`. Readied spell is not a separate lock — it is reserve state (`readiedSpellParams`) coupled to the concentration lock. | Explicit release or break | Concentration (one spell) |
| **Timer** | Countdown that ticks each turn/round | Self-expiring | Rage turns remaining, effect durations, legendary actions (refill each round) |

#### Consumption Shapes

Every consumption operation is one of four shapes:

| Shape | Definition | Examples |
|---|---|---|
| **Spend** | Decrement and gone | "Cast Fireball" → spend 1 action (quota) + spend 1 L3 slot (pool) |
| **Grant** | Spending one resource creates another | "Attack action" → spend 1 action (quota) → unlock extra attacks (quota). "Action Surge" → spend 1 charge (pool) → grant 1 action (quota). "Dash" → spend 1 action (quota) → grant speed feet of movement (quota) |
| **Reserve** | Pay now, deliver later; forfeit if interrupted | "Ready Spell" → spend 1 action + 1 slot NOW → lock concentration → release later with reaction, OR forfeit if concentration breaks |
| **Refund** | Conditional restore after a spend; the resource returns but any associated quota does NOT | "Counterspell succeeds" → refund the countered spell's slot (pool) but `slotExpendedThisTurn` stays true (quota persists) |

### Mapping Existing Helpers Into The Taxonomy

#### Quint creature.qnt — Quota spends

| Helper | Shape | Fields touched |
|---|---|---|
| `pUseAction` | Spend+Grant | `actionsRemaining -= 1`; sets action-type flags (`attackActionUsed`, `dodging`, `movementRemaining` for Dash, `readiedAction`) |
| `pUseBonusAction` | Spend | `bonusActionUsed = true` |
| `pUseReaction` | Spend | `reactionAvailable = false` |
| `pUseMovement` | Spend | `movementRemaining -= feet * cost` |
| `pUseBonusMovement` | Spend | `bonusMovementRemaining -= feet` |
| `pUseObjectInteraction` | Spend | `freeInteractionUsed = true` |
| `pUseExtraAttack` | Spend | `extraAttacksRemaining -= 1` |
| `pUseSneakAttack` | Spend | `sneakAttackUsedThisTurn = true` |
| `pUseDivineSmiteFree` | Spend | `smiteFreeUsed = true` (resets on long rest, but per-turn gate in practice) |
| `pCunningStrike` | Spend | `cunningStrikeUsesThisTurn += 1` |

#### Quint creature.qnt — Quota spends (bonus action variants)

| Helper | Shape | Fields touched |
|---|---|---|
| `pBonusActionDash` | Spend+Grant | `bonusActionUsed = true`; `movementRemaining += effectiveSpeed` |
| `pBonusActionDisengage` | Spend | `bonusActionUsed = true`; `disengaged = true` |
| `pBonusActionHide` | Spend | `bonusActionUsed = true` |

#### Quint creature.qnt — Pool spends

| Helper | Shape | Fields touched |
|---|---|---|
| `pExpendSlot` | Spend | `slotsCurrent[level] -= 1` |
| `pExpendPactSlot` | Spend | `pactSlotsCurrent -= 1` |
| `pExpendFocus` | Spend | `focusPoints -= cost` |
| `pUseLayOnHands` | Spend | `layOnHandsPool -= amount` |
| `pUsePaladinChannelDivinity` | Spend | `channelDivinityCharges -= 1` |
| `pUseClericChannelDivinity` | Spend | `channelDivinityCharges -= 1` |
| `pUseSecondWind` | Spend (+ heal side effect) | `secondWindCharges -= 1` |
| `pUseIndomitable` | Spend | `indomitableCharges -= 1` |
| `pUseWholenessOfBody` | Spend | `wholenessCharges -= 1` |
| `pFlurryOfBlows` | Spend | `focusPoints -= 1` (delegates to `pExpendFocus`) |
| `pPatientDefenseFocus` | Spend | `focusPoints -= 1` (delegates to `pExpendFocus`) |
| `pStepOfTheWindFocus` | Spend | `focusPoints -= 1` (delegates to `pExpendFocus`) |
| `pStunningStrike` | Spend + Quota mark | `focusPoints -= 1`; `stunningStrikeUsedThisTurn = true` |
| `pUseMetamagic` | Spend | `sorceryPoints -= cost`; `metamagicUsedThisCast += option` |
| `pUseInnateSorcery` | Spend + Timer start | `innateSorceryCharges -= 1`; starts duration timer |

#### Quint creature.qnt — Refunds and grants

| Helper | Shape | Fields touched |
|---|---|---|
| `pRestoreSlot` | Refund | `slotsCurrent[level] += 1` (capped at max) |
| `pRestorePactSlots` | Rest reset (not mid-action) | All pact slots restored |
| `pRestoreAllSlots` | Rest reset (not mid-action) | All slots restored |
| `pUseActionSurge` | Pool→Quota grant | `actionSurgeCharges -= 1` (pool); `actionsRemaining += 1` (quota) |
| `pGrantBonusMovement` | Grant | `bonusMovementRemaining = effectiveSpeed / 2`; `bonusMovementOAFree = oaFree` |
| `pUncannyMetabolism` | Pool restore + Quota mark | `focusPoints = focusMax` (full restore); `uncannyMetabolismUsed = true` |

#### Quint battle.qnt — Battle-level wrappers

| Helper | Shape | Notes |
|---|---|---|
| `expendSlot` | Spend | Maps creature, calls `pExpendSlot` + sets `slotExpendedThisTurn` |
| `refundSlot` | Refund | Maps creature, calls `pRestoreSlot` — `slotExpendedThisTurn` persists |
| `spendReaction` | Spend | Maps creature, calls `pUseReaction` |
| `spendLR` | Spend | `legendaryResistancesRemaining -= 1` |
| `spendBardicInspirationCharge` | Spend | `bardicInspirationCharges -= 1` |

#### TypeScript — exact parallels (MBT-proven, no divergence)

| TS Function | Quint Parallel | Same semantics? |
|---|---|---|
| `spendAction` | `pUseAction` | Yes |
| `spendReaction` | `pUseReaction` | Yes |
| `spendMovement` | `pUseMovement` | Yes |
| `spendExtraAttack` | `pUseExtraAttack` | Yes |
| `expendSlot` | `pExpendSlot` | Yes |
| `battleExpendSlot` | `expendSlot` (battle.qnt) | Yes — slot + quota flag |
| `breakConcentration` | Lock release | Yes |
| `startConcentration` | Lock acquire | Yes |

### SRD Rules The Taxonomy Clarifies

**One Spell Slot Per Turn (SRD 5.2.1):** `slotExpendedThisTurn` is a *quota* (per-turn flag), not a pool counter. `expendSlot` sets it. `refundSlot` does NOT clear it. If Fireball is countered and the slot is refunded (pool restore), the creature still cannot cast another slotted spell this turn (quota spent). The taxonomy names this: "Refund restores the pool but not the quota."

**Action Surge:** Shape is Pool→Quota grant. Spend 1 `actionSurgeCharges` (pool), grant 1 `actionsRemaining` (quota). Side effect: `actionSurgeActionPending = true` blocks the Magic action type. The taxonomy names this: "A pool spend that grants a quota."

**Ready Spell:** Shape is Reserve. Step 1 (now): spend 1 action (quota) + spend 1 slot (pool) + acquire concentration (lock). Step 2 (later): spend 1 reaction (quota) to release. Forfeit: if concentration breaks before release, slot is lost (no refund). The taxonomy names this: "A reserve that forfeits on lock-break." Note: this is distinct from longer casting-time spells (1 min+), where the SRD says if concentration breaks during casting, the spell fails and the slot is NOT expended. Ready Spell always expends the slot up front.

**Extra Attack:** Shape is Quota→Quota grant (embedded in `pUseAction`). When `pUseAction(_, _, AAttack)` is called, it spends 1 action (quota) and sets `attackActionUsed = true`, which unlocks `extraAttacksRemaining`. The grant is not explicit — it's a flag that enables spending from a pre-filled counter (set at turn start from creature level). The taxonomy names this: "A quota spend whose side effect unlocks another quota."

**Concentration as Lock:** `startConcentration` acquires the lock by setting `concentrationSpellId`. `breakConcentration` releases the lock by clearing the field. The cascade behavior (removing effects from all creatures, fizzling readied spells) lives in the battle-level caller `breakConcentrationAndPropagate`, not in the primitive. The taxonomy names this: "A lock with cascade-on-release" — but the cascade is a battle concern, not a creature concern.

### What Changes

#### Changes — Quint layer (naming + comments only, no code change)

Group existing helpers into named sections and add one-line cost annotations:

```quint
// ── Quota spends ──────────────────────────────
/// Quota spend+grant. Decrements actionsRemaining; grants action-type effect.
pure def pUseAction(...)
/// Quota spend. Sets bonusActionUsed = true.
pure def pUseBonusAction(...)
...

// ── Pool spends ───────────────────────────────
/// Pool spend. Decrements slotsCurrent[level].
pure def pExpendSlot(...)
...

// ── Pool refunds ──────────────────────────────
/// Pool refund. Increments slotsCurrent[level] (capped at max).
pure def pRestoreSlot(...)
...

// ── Pool→Quota grants ─────────────────────────
/// Pool→Quota grant. Spends surge charge (pool), grants actionsRemaining (quota).
pure def pUseActionSurge(...)
```

Each `battle.qnt` action body gets a cost annotation comment:

```quint
/// Cost: 1 action (quota) + 1 spell slot at slotLvl (pool) + slotExpendedThisTurn quota.
/// Shape: spend (action) + spend (slot). Ritual variant skips slot cost.
/// Refundable: slot is refunded if countered; quota persists.
action bCastSaveSpell = {
```

#### Changes — TS `ResourceCost` type

Replace the current shallow type:

```typescript
// Current:
export type ResourceCost = {
  readonly action?: true;
  readonly bonusAction?: true;
  readonly reaction?: true;
  readonly movement?: number;
  readonly charge?: string;  // opaque string like "actionSurge", "spellSlot"
};
```

With a typed discriminated union. **Scope:** `ResourceCost` represents *immediate up-front costs* that the UI needs to display ("this action costs X"). Lock side effects (concentration displacement) and Timer consequences (rage expiry) are modeled separately in the action handlers — they are *consequences*, not *costs* the player chooses to pay.

```typescript
// Proposed:
type QuotaCost =
  | { readonly kind: "quota"; readonly resource: "action" }
  | { readonly kind: "quota"; readonly resource: "bonusAction" }
  | { readonly kind: "quota"; readonly resource: "reaction" }
  | { readonly kind: "quota"; readonly resource: "movement"; readonly feet: number }
  | { readonly kind: "quota"; readonly resource: "extraAttack" }
  | { readonly kind: "quota"; readonly resource: "freeObjectInteraction" }
  | { readonly kind: "quota"; readonly resource: "sneakAttack" };

type PoolCost =
  | { readonly kind: "pool"; readonly resource: "spellSlot"; readonly level: SpellSlotLevelValue }
  | { readonly kind: "pool"; readonly resource: "pactSlot" }
  | { readonly kind: "pool"; readonly resource: "focusPoints"; readonly amount: number }
  | { readonly kind: "pool"; readonly resource: "sorceryPoints"; readonly amount: number }
  | { readonly kind: "pool"; readonly resource: "rageCharge" }
  | { readonly kind: "pool"; readonly resource: "actionSurge" }
  | { readonly kind: "pool"; readonly resource: "secondWind" }
  | { readonly kind: "pool"; readonly resource: "indomitable" }
  | { readonly kind: "pool"; readonly resource: "legendaryResistance" }
  | { readonly kind: "pool"; readonly resource: "channelDivinity" }
  | { readonly kind: "pool"; readonly resource: "layOnHands"; readonly amount: number }
  | { readonly kind: "pool"; readonly resource: "bardicInspiration" }
  | { readonly kind: "pool"; readonly resource: "divineSmiteFree" }
  | { readonly kind: "pool"; readonly resource: "wildShape" };

type ResourceCost = ReadonlyArray<QuotaCost | PoolCost>;
```

This makes costs composable (array of typed items) and self-describing (UI can render "Costs: 1 action + 1 level-3 spell slot" from data, not from string matching). Lock and Timer kinds are intentionally excluded — they are consequences of actions, not up-front costs the player selects.

#### Changes — available-actions.ts token builders

Each token builder's `cost` value becomes richer:

```typescript
// Current:
cost: { action: true, charge: "spellSlot" }

// Proposed:
cost: [
  { kind: "quota", resource: "action" },
  { kind: "pool", resource: "spellSlot", level: slotLvl },
]
```

#### Changes — UBIQUITOUS_LANGUAGE.md / battle/DOMAIN.md

Add a "Resource Consumption" section defining Pool, Quota, Lock, Timer, Spend, Grant, Reserve, Refund as canonical terms.

### What NOT To Change

**No generic consumption engine.** FoundryVTT's 781 LOC `ConsumptionTargetsField` is a runtime framework for composing, validating, and refunding arbitrary costs. We don't need that. Our costs are statically known — each action's cost is hardcoded in the Quint spec. A runtime cost interpreter would add complexity without adding correctness (the Quint spec already proves each action's cost is correct via MBT).

**No `Cost` record type in Quint.** Quint actions express costs as inline guard+spend sequences. Wrapping them in a `Cost { quotas: ..., pools: ... }` record would obscure the actual state transitions and make MBT traces harder to read. The taxonomy lives in comments and naming, not in new Quint types.

**No generic `consume()` function.** The `pUse*` helpers are specific because each resource has specific semantics: `pUseAction` sets action-type flags, `pExpendSlot` indexes into a level-keyed map, `pUseMovement` takes a cost multiplier. A generic function would need so many parameters it would be less readable than the specialized versions.

**No MBT bridge changes.** The bridge already tracks every resource field. The taxonomy doesn't add new fields — it classifies existing ones.

### Implementation Steps

| Step | Layer | What changes | Size | Risk |
|---|---|---|---|---|
| 1 | Doc | Add Pool/Quota/Lock/Timer + Spend/Grant/Reserve/Refund definitions to `UBIQUITOUS_LANGUAGE.md` and `battle/DOMAIN.md` | ~30 lines | None |
| 2 | Quint | Add section headers + one-line cost annotations to `creature.qnt` helper groups and `battle.qnt` action bodies | Comments only | None (no code change) |
| 3 | TS types | Replace `ResourceCost` with typed `QuotaCost \| PoolCost` discriminated union in `available-actions.ts` | ~50 lines in types | Low — see blast radius below |
| 4 | TS tokens | Update each token builder in `available-actions.ts` to emit the new typed costs | ~100 lines changed (value changes, not logic) | Low — tokens are already tested |
| 5 | TS consumers | Update all UI components, serialization, and tests that read `ResourceCost` (React panels that display costs, any snapshot tests) | Variable — grep for `ResourceCost` and `.cost` on action tokens | Low-medium — compiler will find all sites |
| 6 | Doc | Update this file and `03-resolve-commit.md` to mark as "adopted" | ~10 lines | None |

**Prerequisites for steps 3-5:**
- The helper inventory in this doc must be complete before shipping the TS type — otherwise the union will have obvious gaps. (The mapping tables above now cover all known helpers.)
- The scope decision (ResourceCost = immediate up-front costs only; Lock/Timer consequences excluded) must be agreed before implementation.

Steps 1-2 are pure documentation with zero risk. Steps 3-5 are a typed refactor that the TS compiler will enforce exhaustively. No Quint behavioral changes. No MBT bridge changes. No new invariants needed — the existing 52 invariants already prove resource correctness; the taxonomy just names what they prove.
