# Surface Widening Proposal: Defender

**Unit**: Defender (magic_item, Legendary, melee weapon)
**Outcome**: `surface_widening`

## What fits cleanly

The base +3 bonus is fully encodable as a `PassiveMechanics` with `condition: { kind: "holding_item" }`:

```json
{
  "kind": "magic_item",
  "id": "magic_item_defender",
  "mechanics": {
    "family": "passive",
    "condition": { "kind": "holding_item" },
    "grants": [
      {
        "kind": "modify_roll_numeric",
        "on": ["attack_roll"],
        "delta": { "kind": "fixed_dice", "dice": 3, "dieSize": 1, "sign": "+" },
        "weaponFilter": { "kind": "specific_item", "itemId": "magic_item_defender" }
      },
      {
        "kind": "modify_damage_numeric",
        "delta": { "kind": "fixed_dice", "dice": 3, "dieSize": 1, "sign": "+" },
        "weaponFilter": { "kind": "specific_item", "itemId": "magic_item_defender" }
      }
    ]
  }
}
```

All atoms used (`modify_roll_numeric`, `modify_damage_numeric`) exist in the v4 taxonomy and the TS surface.

## What does not fit: the bonus-transfer mechanic

The Defender's defining mechanic allows the wielder to redistribute some or all of the +3 weapon bonus from attack/damage to AC on the first weapon attack each turn. The redistributed AC bonus lasts until the start of the wielder's next turn.

This mechanic cannot be encoded honestly for three interconnected reasons:

---

### Gap 1: No per-turn reset cadence

`ActivatedAbilityMechanics` requires a `resource` and `resetCadence`. All existing `RestResetCadence` variants reset on a rest boundary (`short_or_long_rest`, `long_rest`, `short_rest`) or a calendar boundary (`dawn`, `elapsed_days`, `elapsed_hours`, `century`, `never`).

The Defender's transfer resets **every turn**: it is available on each of the wielder's turns, not per rest. There is no `"per_turn"` cadence variant.

**Proposed widening**: Add `RestResetCadence` variant `"per_turn"`:
```typescript
| { readonly kind: "per_turn" }
```
This renders as a `turn_start_window` (reset on wielder's turn start). Semantically it pairs with `UsageLimit.once_per_turn`: the limit caps within a turn; the reset refills between turns.

---

### Gap 2: No "until start of next turn" duration

The transferred AC bonus lasts "until the start of your next turn." `DurationValue.unit` only admits `"round" | "minute" | "hour" | "day"`. A `"round"` approximation is close but semantically wrong: `"1 round"` ends one full initiative cycle later, while "until your next turn starts" ends at the wielder's initiative count in the next round. For a bonus that affects AC (relevant for attacks between the wielder's turns), this distinction matters.

**Proposed widening**: Add `DurationValue.unit` variant `"until_caster_turn_start"`:
```typescript
| "until_caster_turn_start"
```
This is a widely-used SRD duration (many class features, several magic items, mastery riders like Sap already use this phrasing). The tracer renders it as a `turn_start_window` that the activation's effect `persists_until`.

---

### Gap 3: No "on first weapon attack" activation trigger

The SRD text gates the transfer on "the first time you attack with the weapon on each of your turns." This is neither:
- A **free** activation (it is triggered by making an attack, not a standalone action)
- A **replace_attack** (the attack still happens normally — you are not spending the attack to activate, you are making the attack AND choosing the redistribution simultaneously)
- A **reaction** (it happens during your own turn, not in response to an external trigger)

The closest approximation — `activationCost: { kind: "free" }` with `usageLimit: { kind: "once_per_turn" }` — loses the weapon-attack gating. The ability would appear activatable at any point on the wielder's turn rather than only when making a weapon attack.

**Proposed widening**: Add `ClassFeatureActivationCost` variant `"on_weapon_attack"` (or more precisely, add a trigger grammar for weapon-attack-scoped free choices):
```typescript
| { readonly kind: "on_weapon_attack"; readonly weaponFilter?: WeaponFilter }
```
This emits an `on_hit_window`-adjacent window (fires when a weapon attack is initiated, not after a hit) connected to the activation.

---

## Encoding approach once gaps are filled

With the three surface variants above, the Defender encodes as a `CompositeMagicItemMechanics` (passive + activation):

**Part 1 — Passive** (always-on base bonus, `holding_item`):
- `modify_roll_numeric` +3 on `attack_roll` (weapon filter: this item)
- `modify_damage_numeric` +3 (weapon filter: this item)

**Part 2 — Activation** (transfer, once per turn):
- `activationCost: { kind: "on_weapon_attack" }` (or closest new variant)
- `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }`
- `resetCadence: { kind: "per_turn" }` ← Gap 1
- `duration: { kind: "timed", value: { unit: "until_caster_turn_start", amount: 1 } }` ← Gap 2
- `usageLimit: { kind: "once_per_turn" }`
- `phases`: single `direct` phase with `CastTimeEffectModeChoice` (4 named options):
  - **+0 to AC** (no transfer): no effects
  - **+1 to AC**: `modify_roll_numeric -1 attack`, `modify_damage_numeric -1`, `modify_ac +1`
  - **+2 to AC**: `modify_roll_numeric -2 attack`, `modify_damage_numeric -2`, `modify_ac +2`
  - **+3 to AC**: `modify_roll_numeric -3 attack`, `modify_damage_numeric -3`, `modify_ac +3`

The negative deltas on `modify_roll_numeric` and `modify_damage_numeric` partially cancel the passive grants, producing the correct net bonus for each mode. The coupling (sum always = 3) is maintained by authoring convention in the discrete mode set, not enforced by the type.

## v4 atom inventory impact

All effect atoms needed already exist in v4: `modify_roll_numeric`, `modify_damage_numeric`, `modify_ac`. No new atoms are required. The three gaps are entirely in **delivery surface shapes** (reset cadence variant, duration unit variant, activation cost variant).
