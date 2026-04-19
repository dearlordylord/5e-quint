# Proposal: `bard_bardic_inspiration`

## Outcome: `atom_widening`

## What fits

The feature's shell is fully representable:

- **Record kind**: `class_feature` ✓
- **Mechanics family**: `activation` ✓  
- **Activation cost**: `{ kind: "bonus_action" }` ✓
- **Resource**: `{ kind: "use_count", cap: { kind: "ability_modifier", ability: "cha" } }` ✓  
  (types.ts §A12 comment cites Bardic Inspiration as the exact pressure case for this cap variant)
- **Reset cadence**: `{ kind: "long_rest" }` ✓
- **Target**: another creature within 60 ft — representable as a `target` attachment

## What doesn't fit

### Missing atom: `grant_die_token`

Bardic Inspiration's core mechanic cannot be expressed as any existing `EffectAtom`.

The SRD says:

> Once within the next hour when the creature fails a D20 Test, the creature can roll the Bardic Inspiration die and add the number rolled to the d20, potentially turning the failure into a success. A Bardic Inspiration die is expended when it's rolled.

This is **not** `modify_roll_numeric`. Key differences:

| Property | `modify_roll_numeric` (Bless) | Bardic Inspiration die token |
|---|---|---|
| Decision point | Before rolling (or at roll time) | **After failing** — player sees the failed result first |
| Trigger | Any qualifying roll | Only after a D20 Test **failure** |
| Cardinality | Applies to all qualifying rolls (or N with `count`) | One token, one use, then gone |
| Held by | N/A (passive rider on the target) | The **target** holds the token as a discrete resource |
| Duration | Lives on the host effect's window | Up to 1 hour, or expended, whichever comes first |

The retroactive nature is mechanically significant: knowing you failed before deciding to spend the die changes expected value calculations and player strategy entirely.

The taxonomy notes (`TAXONOMY_atoms_graph.md §12`) already identify `grant_die_token` as new atom pressure from the survey.

### Proposed atom shape

```typescript
| {
    readonly kind: "grant_die_token";
    readonly die: DiceExpr;             // the die expression granted (e.g. 1d6)
    readonly trigger: "d20_test_failure"; // when the target may spend it
    readonly durationHours: number;     // how long the token persists unspent (1 hour for BI)
    readonly maxHeld: number;           // how many tokens the creature can hold (1 for BI)
  }
```

The token is held by the target, spent reactively after the failure trigger fires, expended on use, and adds the rolled result to the d20 that failed.

### Secondary gap: die size scaling

The Bardic Inspiration die scales by Bard level:

- L1–L4: d6
- L5–L9: d8  
- L10–L14: d10
- L15–L20: d12

Once `grant_die_token` exists, the `die` field would need `ThresholdTiers` scaling by class level. The `threshold_tiers` shape already exists in `DiceAmount` and `UseCountCap`; adapting it to `DiceExpr` for the granted die expression is a natural extension.

## Why `modify_roll_numeric` with `count=1` is not an honest encoding

One might attempt to encode this as:

```json
{
  "kind": "modify_roll_numeric",
  "on": ["attack_roll", "saving_throw", "ability_check"],
  "delta": { "kind": "fixed_dice", "dice": 1, "dieSize": 6, "sign": "+" },
  "count": 1
}
```

This would be dishonest because:

1. `modify_roll_numeric` adds the bonus *before or at roll time* — the player does not know if they will pass or fail when they decide to apply Bless's d4.  
2. Bardic Inspiration is spent *after* failure is known. The creature chooses whether to spend it only after seeing a failed result.
3. The trace would emit `modify_roll_advantage` / `modify_roll_numeric` atoms that misrepresent the actual game mechanic — a future RAW-check would catch the discrepancy.
4. The token as a creature-held resource ("`A creature can have only one Bardic Inspiration die at a time`") has no representation in the passive-bonus shape.

A misleading trace is worse than no trace.
