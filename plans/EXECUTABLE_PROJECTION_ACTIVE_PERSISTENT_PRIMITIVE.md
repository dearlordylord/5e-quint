# Active Projected Persistent Primitive

Reference design for EPT6. Defines the minimal primitive that carries
`ProjectedPersistentRecord` state over time so `Mage Armor` (and future
persistent records) can be hooked end-to-end without parallel registries.

## Problem

EPT5 landed the projected persistent contract (`ProjectedPersistentRecord`,
currently one variant: `PPRSetBaseAc`). EPT6 needs one owned seam that:

1. stores "this projected persistent record is active on this creature", and
2. removes it on its early-end trigger (`target_dons_armor` for Mage Armor).

Two earlier EPT6 attempts were rejected because they duplicated the projection
contract: one derived activation from prepared spells, one used a
spell-id / unit-id-indexed registry. Both bypassed the
`ProjectedPersistentRecord` shape EPT5 already owns.

This doc pins one shape that threads the EPT5 contract directly.

## Shape

### 1. Active record — holds the projected record + runtime identity only

```qnt
type ActiveProjectedPersistent = {
  record: ProjectedPersistentRecord,   // EPT5-owned contract, unchanged
  casterId: str,
  targetId: str,
}
```

Rationale:
- No per-instance duration counter. ASSUMPTIONS A4–A5 track durations in
  rounds; Mage Armor's 8-hour narrative ceiling (~4800 rounds) never
  decrements meaningfully in combat. Long-rest / day boundary events clear
  persistents wholesale; early-end triggers handle in-combat termination.
- No `earlyEndMarker` field on the instance. The record variant declares its
  own triggers (see §3). Per-instance overrides would violate RAW — the spell
  determines its ending, not the cast site.
- `casterId` + `targetId` carry the only runtime-specific facts. Everything
  else is intrinsic to the projected record.

### 2. Creature-state field

```qnt
type CreatureState = {
  // ...existing fields...
  activePersistents: Set[ActiveProjectedPersistent],
}
```

Added alongside `activeEffects: Set[ActiveEffect]`. These are **parallel,
not substitutable**: `ActiveEffect` is the creature.qnt timed-spell primitive
with `turnsRemaining`, `grantedConditions`, concentration linkage, etc.
`ActiveProjectedPersistent` is the projection-contract primitive for
record-driven persistents (no granted conditions, no concentration, no turn
countdown). Future work may collapse them if the projection contract grows
to cover everything `ActiveEffect` does; for the tracer bullet, keep them
separate.

### 3. Early-end trigger vocabulary

```qnt
type ProjectedEarlyEndTrigger =
  | PEETTargetDonsArmor

// Future variants when new record kinds land:
// | PEETCasterLosesConcentration
// | PEETTargetDealtDamage
```

Each projected record variant declares the set of triggers that end it:

```qnt
pure def pRecordEarlyEndTriggers(rec: ProjectedPersistentRecord): Set[ProjectedEarlyEndTrigger] =
  match rec {
    | PPRSetBaseAc(_) => Set(PEETTargetDonsArmor)
  }
```

One record kind ↔ one closed trigger set. Composable across kinds (a new
`PPRConcentration(_)` variant would return
`Set(PEETCasterLosesConcentration, PEETCasterUnconscious)`, etc.).

### 4. Pure helpers

```qnt
pure def pAddActivePersistent(
  ps: Set[ActiveProjectedPersistent],
  p: ActiveProjectedPersistent,
): Set[ActiveProjectedPersistent] =
  ps.union(Set(p))

// Drop instances whose record declares this trigger, restricted to a target
pure def pRemoveActivePersistentsOnTrigger(
  ps: Set[ActiveProjectedPersistent],
  trigger: ProjectedEarlyEndTrigger,
  targetId: str,
): Set[ActiveProjectedPersistent] =
  ps.filter(p =>
    p.targetId != targetId
      or not pRecordEarlyEndTriggers(p.record).contains(trigger)
  )

// Long-rest / day-boundary clear
pure def pClearActivePersistentsOnLongRest(
  ps: Set[ActiveProjectedPersistent],
): Set[ActiveProjectedPersistent] =
  Set()
```

### 5. AC reader (example consumer)

```qnt
pure def pProjectedBaseAcOverride(s: CreatureState): Option[int] =
  val mageArmorHits = s.activePersistents.filter(p =>
    match p.record {
      | PPRSetBaseAc(_) => true
    }
  )
  if (mageArmorHits.size() == 0) None
  else Some(MAGE_ARMOR_BASE_AC + abilityModifier(s, MAGE_ARMOR_ABILITY_MOD))
```

Battle AC computation consults `pProjectedBaseAcOverride(s)` before falling
back to armor-state-based AC.

### 6. Battle event — `DON_ARMOR`

Adds one battle transition that both flips armor state *and* walks active
persistents:

```qnt
action doDonArmor(creatureId: str, armor: Armor) = all {
  // (existing armor-change semantics)
  creatures' = creatures.set(creatureId, c => {
    ...c,
    armorState: WearingArmor(armor),
    activePersistents: pRemoveActivePersistentsOnTrigger(
      c.activePersistents, PEETTargetDonsArmor, creatureId,
    ),
  }),
  ...
}
```

## TypeScript mirror

Straight one-for-one mirror of the Quint types. `ActiveProjectedPersistent`
and `activePersistents` field on the TS creature-state type. Same pure helpers
exported from a new module next to `projected-executable.ts`.

## Out of scope for EPT6

- Casting Mage Armor. EPT6 only hooks the active record; triggering the cast
  (action → active persistent insertion) stays in EPT8's routing.
- Non-combat time advance. Long rest clears; no `per-hour` decrement needed.
- Concentration-based persistents. `PEETCasterLosesConcentration` trigger is
  listed as future, not implemented now.
- Any non-`PPRSetBaseAc` record kind.

## Verification targets

- `pAddActivePersistent` + `pRemoveActivePersistentsOnTrigger` as pure tests
  in `dndTest.qnt` (or the TS equivalent).
- `DON_ARMOR` MBT parity (Quint action ↔ TS reducer).
- End-to-end MBT for the Mage Armor lifecycle is in EPT9/EPT11, not EPT6.
