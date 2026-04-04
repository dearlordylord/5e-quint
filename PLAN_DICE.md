# Plan: Damage dice breakdown in 3D dice overlay

## Architectural decisions

- **No Quint spec changes.** Damage stays as a flat integer in the spec.
  Dice decomposition happens in the TS director layer only.
- **No XState/MBT changes.** Events keep their current shape. The director
  reads existing fields (`spellName`, `slotLvl`, `dmgOnFail`) to derive dice.
- **Decomposition is synthetic.** The total is exact (from spec), dice count
  and die size are exact (from spell metadata), individual face values are
  partitioned to sum correctly. This is presentation, not game logic.
- **Spell lookup uses snake_case keys** matching Quint's `preparedSpells`
  format directly — no Title Case conversion needed.
- **Graceful fallback.** When the total is outside the spell's valid dice
  range (Quint nondeterminism), `decomposeDice` returns null and the
  director falls back to the existing d20 roll display.

## Background: current pipeline

```
Quint:    nondet dmg = 1.to(20).oneOf()       -- flat random int
ITF:      { "dmg": 25 }
Bridge:   pickBigInt(picks, "dmg") → 25
XState:   { type: "BATTLE_ATTACK", dmg: 25 }
Director: deriveDiceRoll() -- currently only matches *Roll suffix fields (d20s)
```

Spell cast events carry `spellName` + `slotLvl` + `dmgOnFail`. The TS
features layer has per-spell damage functions (e.g., `fireballDamage(slotLvl)
→ { dice: 8, dieSize: 6 }`), but no unified lookup and three spells from
the battle test suite are missing damage functions entirely.

## Existing infrastructure

### Types (`features/spell-patterns.ts`)

```typescript
interface DiceDamage { readonly dice: number; readonly dieSize: number }
interface DiceDamageWithBonus { readonly dice: number; readonly dieSize: number; readonly flatBonus: number }
```

### Damage functions that exist

| Spell | File | Function | Base dice |
|-------|------|----------|-----------|
| Fireball | `spell-evocation.ts` | `fireballDamage(slotLvl)` | 8d6 @ L3 |
| Spirit Guardians | `spell-conjuration.ts` | `spiritGuardiansDamage(slotLvl)` | 3d8 @ L3 |
| Chromatic Orb | `spell-evocation.ts` | `chromaticOrbDamage(slotLvl)` | 3d8 @ L1 |
| Spiritual Weapon | `spell-evocation.ts` | `spiritualWeaponDamage(slotLvl)` | 1d8 @ L2 |
| Searing Smite | `spell-evocation.ts` | `searingSmiteDamage(slotLvl)` | |
| Moonbeam | `spell-evocation.ts` | `moonbeamDamage(slotLvl)` | |
| Flame Blade | `spell-evocation.ts` | `flameBladeDamage(slotLvl)` | |
| Ice Knife | `spell-conjuration.ts` | `iceKnifeExplosionDamage(slotLvl)` | 2d6 @ L1 |
| Phantasmal Killer | `spell-illusion.ts` | `phantasmalKillerDamage(slotLvl)` | 4d10 @ L4 |
| Vampiric Touch | `spell-necromancy.ts` | `vampiricTouchDamage(slotLvl)` | 3d6 @ L3 |
| Call Lightning | `spell-conjuration.ts` | `callLightningDamage(slotLvl, ...)` | 3d10 @ L3 |
| Disintegrate | `spell-transmutation.ts` | `disintegrateDamage(slotLvl)` | 10d6+40 @ L6 |
| Heat Metal | `spell-transmutation.ts` | `heatMetalDamage(slotLvl)` | 2d8 @ L2 |

### Damage functions that are missing

These appear in `battle.qnt` `CASTER_PREPARED_SPELLS` but have no TS function:

| Spell | SRD dice | Upcasting | SRD reference |
|-------|----------|-----------|---------------|
| Burning Hands | 3d6 @ L1 | +1d6/level | `.references/srd-5.2.1/Spells/B.md` |
| Guiding Bolt | 4d6 @ L1 | +1d6/level | `.references/srd-5.2.1/Spells/G.md` |
| Inflict Wounds | 3d10 @ L1 | +1d10/level | `.references/srd-5.2.1/Spells/I.md` |

Non-damaging prepared spells (no function needed): Hold Person, Bless,
Haste, Counterspell.

---

## Phase 1: `decomposeDice` utility + tests

> Deliver the core algorithm with no UI or director wiring. Demoable via
> unit tests.

### What to build

A pure function `decomposeDice(total, count, dieSize)` that partitions an
integer total into `count` values each in `[1, dieSize]` that sum to
`total`. Returns `null` if impossible.

Algorithm: greedy left-to-right. For die `i`:
- `remaining = total - sumSoFar`
- `minNeeded = (count - i - 1)` (remaining dice roll at least 1)
- `maxNeeded = (count - i - 1) * dieSize`
- `thisRoll = clamp(remaining - maxNeeded, 1, min(dieSize, remaining - minNeeded))`

Deterministic — same inputs always produce same output.

### Files

| File | Action |
|------|--------|
| New: `app/src/features/decompose-dice.ts` | `decomposeDice()` function |
| New: `app/src/features/decompose-dice.test.ts` | Unit tests |

### Acceptance criteria

- [ ] `decomposeDice(25, 8, 6)` returns 8 values in `[1,6]` summing to 25
- [ ] `decomposeDice(8, 8, 6)` returns `[1,1,1,1,1,1,1,1]`
- [ ] `decomposeDice(48, 8, 6)` returns `[6,6,6,6,6,6,6,6]`
- [ ] `decomposeDice(7, 8, 6)` returns `null` (7 < 8, impossible)
- [ ] `decomposeDice(49, 8, 6)` returns `null` (49 > 48, impossible)
- [ ] `decomposeDice(1, 1, 20)` returns `[1]`
- [ ] `decomposeDice(0, 0, 6)` returns `[]` (zero dice edge case)
- [ ] Typecheck passes
- [ ] All values in returned array are integers in `[1, dieSize]`

---

## Phase 2: Missing damage functions + spell dice lookup

> Deliver a unified `getSpellDamageDice(spellName, slotLvl)` lookup.
> Demoable via unit tests.

### What to build

1. Add three missing damage functions (verify against SRD text first).
2. Create a lookup function mapping snake_case spell names to `DiceDamage`.

### Files

| File | Action |
|------|--------|
| `app/src/features/spell-evocation.ts` | Add `burningHandsDamage(slotLvl)`, `guidingBoltDamage(slotLvl)` |
| `app/src/features/spell-necromancy.ts` | Add `inflictWoundsDamage(slotLvl)` |
| New: `app/src/features/spell-dice-lookup.ts` | `getSpellDamageDice(spellName, slotLvl)` |
| New: `app/src/features/spell-dice-lookup.test.ts` | Unit tests |

### Damage function signatures

```typescript
// spell-evocation.ts
export function burningHandsDamage(slotLevel: number): DiceDamage {
  return { dice: 3 + (slotLevel - 1), dieSize: 6 }
}
export function guidingBoltDamage(slotLevel: number): DiceDamage {
  return { dice: 4 + (slotLevel - 1), dieSize: 6 }
}

// spell-necromancy.ts
export function inflictWoundsDamage(slotLevel: number): DiceDamage {
  return { dice: 3 + (slotLevel - 1), dieSize: 10 }
}
```

### Lookup function signature

```typescript
export function getSpellDamageDice(spellName: string, slotLvl: number): DiceDamage | null
```

Implementation: `switch` on `spellName` (snake_case) dispatching to
per-school functions. Initial entries:

```typescript
case "fireball": return fireballDamage(slotLvl)
case "burning_hands": return burningHandsDamage(slotLvl)
case "guiding_bolt": return guidingBoltDamage(slotLvl)
case "inflict_wounds": return inflictWoundsDamage(slotLvl)
case "spirit_guardians": return spiritGuardiansDamage(slotLvl)
```

Non-damaging spells (`"hold_person"`, `"bless"`, `"haste"`, `"counterspell"`)
→ `default: return null`.

### Acceptance criteria

- [ ] `burningHandsDamage(1)` → `{ dice: 3, dieSize: 6 }` (verify SRD)
- [ ] `burningHandsDamage(3)` → `{ dice: 5, dieSize: 6 }` (upcasting)
- [ ] `guidingBoltDamage(1)` → `{ dice: 4, dieSize: 6 }` (verify SRD)
- [ ] `inflictWoundsDamage(1)` → `{ dice: 3, dieSize: 10 }` (verify SRD)
- [ ] `getSpellDamageDice("fireball", 3)` → `{ dice: 8, dieSize: 6 }`
- [ ] `getSpellDamageDice("fireball", 5)` → `{ dice: 10, dieSize: 6 }`
- [ ] `getSpellDamageDice("hold_person", 2)` → `null`
- [ ] `getSpellDamageDice("counterspell", 3)` → `null`
- [ ] `getSpellDamageDice("unknown_spell", 1)` → `null`
- [ ] Guard: `slotLvl < 1` → `null` (ritual / no slot)
- [ ] Typecheck passes

---

## Phase 3: Wire into director + visual result

> Deliver the end-to-end feature: spell cast events show damage dice in
> the 3D overlay. Demoable by stepping through a battle trace.

### What to build

Extend `deriveDiceRoll()` in `director.ts` to check for spell damage dice
before falling back to d20 detection. Add a red damage color.

### Files

| File | Action |
|------|--------|
| `app/src/battle-scene/director.ts` | Extend `deriveDiceRoll` with spell damage path, add `DAMAGE_COLOR`, rename existing d20 logic to `deriveD20Roll` |

### Director logic

```typescript
function deriveDiceRoll(event: BattleEvent): DiceRollCue | null {
  // 1. Spell damage dice (AoE, single-target save spells)
  if (event.type === "BATTLE_CAST_AOE" || event.type === "BATTLE_CAST_SAVE_SPELL") {
    const expr = getSpellDamageDice(event.spellName, event.slotLvl)
    if (expr) {
      const results = decomposeDice(event.dmgOnFail, expr.dice, expr.dieSize)
      if (results) return { sides: expr.dieSize, results, color: DAMAGE_COLOR }
    }
  }

  // 2. Hellish Rebuke (known 2d10, event doesn't carry slotLvl)
  if (event.type === "BATTLE_AFTER_DAMAGE_HELLISH_REBUKE" && event.reactorId) {
    const results = decomposeDice(event.rebukeDmg, 2, 10)
    if (results) return { sides: 10, results, color: DAMAGE_COLOR }
  }

  // 3. Fall back to d20 roll detection
  return deriveD20Roll(event)
}
```

### Edge case behavior

| Scenario | Behavior |
|----------|----------|
| Fireball at L3, `dmgOnFail=25` | 8 red d6 summing to 25 |
| Fireball at L5, `dmgOnFail=30` | 10 red d6 summing to 30 |
| `dmgOnFail=3` for fireball (below 8d6 min of 8) | `decomposeDice` → null → fall back to no dice |
| Hold Person (no damage) | `getSpellDamageDice` → null → show d20 `saveRoll` |
| `BATTLE_RESOLVE_AOE_TARGET` | Has `saveRoll` (d20) but no damage → shows green d20 save |
| `BATTLE_ATTACK` | No spell metadata → shows blue d20 attack roll (unchanged) |
| Ritual cast (`slotLvl=0`) | Guard returns null → fall back to d20 |

### Acceptance criteria

- [ ] `BATTLE_CAST_AOE` with `spellName="fireball"`, `slotLvl=3`, `dmgOnFail=25` → `DiceRollCue { sides: 6, results: [8 values summing to 25], color: DAMAGE_COLOR }`
- [ ] `BATTLE_CAST_SAVE_SPELL` with `spellName="guiding_bolt"`, `slotLvl=1`, `dmgOnFail=15` → 4 red d6
- [ ] `BATTLE_CAST_SAVE_SPELL` with `spellName="hold_person"` → falls back to d20 save roll (green)
- [ ] `BATTLE_ATTACK` → blue d20 (unchanged behavior)
- [ ] `BATTLE_RESOLVE_AOE_TARGET` → green d20 save (unchanged behavior)
- [ ] Impossible decomposition falls back gracefully (no crash, no empty dice)
- [ ] `DAMAGE_COLOR` is visually distinct from `ATTACK_COLOR` (blue) and `SAVE_COLOR` (green)
- [ ] Typecheck passes
- [ ] Existing director tests still pass
- [ ] MBT tests unaffected
- [ ] `/simplify` convergence (2 rounds minimum)

---

## Out of scope (future work)

### Weapon attack dice

`BATTLE_ATTACK` carries `dmg` + `dt` but not weapon die info. Showing
weapon damage dice requires threading metadata through events:
- Add `dieSize`/`diceCount` as nondet fields to Quint `bAttack`
- Or add weapon ID to events, look up in TS stat block registry

Deferred until the spell path proves the visual works.

### Additional spell coverage (done)

`spell-dice-lookup.ts` now covers 18 spells across all schools:
fireball, burning_hands, guiding_bolt, chromatic_orb, spiritual_weapon,
searing_smite, moonbeam, flame_blade, vitriolic_sphere, spirit_guardians,
ice_knife, call_lightning, inflict_wounds, vampiric_touch,
phantasmal_killer, mind_spike, heat_metal, shining_smite.

Not included (special return types): disintegrate (DiceDamageWithBonus
with flatBonus — decomposeDice doesn't handle flat bonus yet).

### Generalize hardcoded spells in battle.qnt

Three spells have spell-specific mechanics baked into the Quint spec
instead of using the generic parameterized framework. These should be
moved to TS features over time.

**Hellish Rebuke** (`bAfterDamageHellishRebuke`, line ~830):
- Hardcodes `2.to(20)` (2d10 range), `Fire` damage type, save-for-half.
- To genericize: add `nondet rebukeSlotLvl` (or `rebukeDiceCount`) to
  the action so the event carries enough info for TS to derive dice.
  Then `spell-dice-lookup.ts` handles it like any other spell.
- Minimal spec change: one new nondet field threaded to the event.

**Shield** (`RShield` reaction, line ~720):
- Hardcodes `targetAc + 5`. Should parameterize the AC bonus so TS
  features supply it (e.g., `nondet shieldAcBonus`).

**Counterspell** (~200 lines, `bSpellStack`, chain/recursion):
- Deeply structural — controls spell resolution flow, slot refund,
  recursive CS-on-CS. Hardest to genericize. The spell stack and
  interrupt chain are fundamental control flow, not just parameters.
- Likely stays in .qnt long-term; the framework *is* Counterspell's
  mechanic. Could parameterize the ability check DC formula.

### Return multiple dice rolls per event (done)

Implemented: `VisualCueState.diceRolls` is `ReadonlyArray<DiceRollCue>`.
`deriveDiceRolls` collects damage + d20 cues. `DiceOverlay` flattens
and renders mixed groups.
