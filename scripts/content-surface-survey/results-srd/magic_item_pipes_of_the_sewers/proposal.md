# Proposal: Pipes of the Sewers — Structural Widening

## Outcome: `structural_widening`

The unit cannot be encoded. The primary blocker is that `UnitRecord` has no `magic_item` kind. Secondary blockers would remain even if that gap were closed.

---

## Gap 1 — No `MagicItemRecord` type (primary blocker)

```typescript
// Current types.ts:
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
// Missing:
// | MagicItemRecord
```

The v4 taxonomy defines `magic_item_root` as a source atom, but `types.ts` has no corresponding record type or mechanics family. Every magic item is structurally blocked here. The tracer's `traceUnit()` switch has no `"magic_item"` case.

**Required widening:** A `MagicItemRecord` type (parallel to `SpellRecord`) and at least one magic-item mechanics family. Attunement, charges, and item-specific reset cadences are the minimum surface additions needed.

---

## Gap 2 — `RestResetCadence` has no time-based variant

The pipes regain `1d3` charges **daily at dawn** — a wall-clock recharge, not tied to short or long rests.

Current `RestResetCadence` variants: `short_or_long_rest | long_rest | short_rest | partial_short_full_long`.

**Required widening:** A `daily_at_dawn` (or general `time_of_day`) variant. Recharge amount being a dice roll (`1d3`) is also novel — current `UseCountCap` is integer-only.

---

## Gap 3 — Compound activation cost (Magic action + Bonus Action)

Playing the pipes costs a **Magic action** to play, then a separate **Bonus Action** to expend charges. These are sequential, both required.

Current `ClassFeatureActivationCost` only covers `free | bonus_action`. No compound or sequenced cost exists.

**Required widening:** A compound cost variant, or a two-phase activation shape where the first phase (Magic action) gates the second (Bonus Action charge spend).

---

## Gap 4 — Per-charge companion summoning with GM-availability gate

Expending 1–3 charges summons one Swarm of Rats per charge, **conditioned on enough rats existing within half a mile (GM-determined)**. If insufficient rats exist, the charge is wasted.

The v4 atom `create_companion` exists, but no surface mechanics family covers:
- Per-charge companion creation (N companions from N resources)
- GM-adjudicated availability precondition (the "if enough rats" gate)
- Summoned-but-uncontrolled companion state (called swarms move toward music but aren't controlled)

**Required widening:** A companion-summoning family for magic items, with a GM-gated availability predicate and per-resource multiplicity.

---

## Gap 5 — Proximity-triggered save gate for companion attitude/control

When an **uncontrolled** Swarm of Rats enters 30 ft while the pipes are being played:

- **DC 15 Wis save**
- On **fail**: swarm becomes Friendly, obeys commands, for as long as the pipe player takes a Magic action each round and the swarm stays ≤30 ft
- On **success**: unswayed, immune for 24 hours
- Control **breaks** if swarm starts its turn >30 ft away (and then it's immune for 24 hours)

This shape requires:
1. A proximity/range trigger (creature enters N-ft radius)
2. A save gate with compound success/fail branches producing companion attitude state
3. Ongoing control maintenance conditions (per-round action cost + proximity check)
4. A 24-hour immunity window (not a rest window)

No surface family exists for any of these sub-shapes. The `save_gate` activation phase exists for spells but is not wired to companion control state changes, proximity triggers, or per-round maintenance costs.

**Required widening:** A proximity-triggered companion-control subgraph, likely its own mechanics family or a substantial extension of an existing one.

---

## Gap 6 — Passive creature-attitude effect (likely `dm_agenda`)

While the pipes are on the character's person, ordinary rats and giant rats are **Indifferent** toward the character and won't attack unless provoked.

Per `ARCHITECTURE.md`, NPC attitude and social stance are caller-owned facts — not core-mechanics atoms. This passive benefit is likely `dm_agenda` in isolation. It does not drive a widening by itself, but it would need to be noted in any `MagicItemRecord` design as an unencoded passive property.

---

## Summary of required widenings

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `MagicItemRecord` + mechanics family | **Yes** (primary) |
| 2 | `new_variant` | `RestResetCadence.daily_at_dawn` + dice recharge amount | Yes |
| 3 | `new_variant` | Compound activation cost (Magic action + Bonus Action) | Yes |
| 4 | `new_subgraph` | Per-charge companion summoning with GM-availability gate | Yes |
| 5 | `new_subgraph` | Proximity-triggered save gate for companion control state | Yes |
| 6 | `dm_agenda` | Passive creature-attitude effect | No (out-of-core) |

All five mechanically-blocking gaps are independent — closing any one does not close the others.
