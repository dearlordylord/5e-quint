# Proposal: Vicious Mockery surface widening

## Unit

**Vicious Mockery** — Enchantment cantrip (SRD 5.2.1)

## Fit diagnosis

The unit maps cleanly to the `activation` family with a single `save_gate` phase:

- Casting time: `action`
- Range: `point` (60 ft)
- Components: V only
- Duration: `instantaneous`
- Phase: `save_gate`, ability `wis`, DC `caster_spell_save_dc`
- Scaling: `threshold_tiers`, axis `character`, dice-count growth (1d6 → 4d6 at levels 1/5/11/17)

Two surface gaps prevent honest encoding:

---

## Gap 1 — `Effect` missing a `modify_roll_advantage` variant

**Current state:** `Effect = DamageEffect | NoneEffect`

**What is needed:** A third variant that applies a roll-advantage modifier as an instantaneous spell effect (not a mastery rider, not an ongoing-spell operation — a direct on-save-fail effect).

```typescript
export type ModifyRollAdvantageEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly count: number;
  readonly expiresOn: RiderExpiry;
};

export type Effect = DamageEffect | ModifyRollAdvantageEffect | NoneEffect;
```

**Evidence:** _"have Disadvantage on the next attack roll it makes before the end of its next turn"_

The `modify_roll_advantage` atom already exists in v4 and is already traceable from mastery riders. This widening surfaces the same atom as a spell Effect branch outcome. `RiderExpiry` is already defined in `types.ts` and the `end_of_next_turn` variant covers Vicious Mockery's expiry window.

---

## Gap 2 — `onFail`/`onSuccess` cannot carry multiple simultaneous effects

**Current state:** `save_gate` phase has `onFail: Effect` — a single slot.

**What is needed:** Both damage and the disadvantage rider fire simultaneously on fail. A single `Effect` slot cannot express both.

**Proposed fix (preferred):** Change the `save_gate` phase fields to arrays:

```typescript
| {
    readonly kind: "save_gate";
    readonly attachment: Attachment;
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: ReadonlyArray<Effect>;
    readonly onSuccess: ReadonlyArray<Effect>;
  }
```

**Alternative fix:** Add a `composite` Effect variant wrapping a list of primitive effects. This is more explicit but adds a nesting layer that may be unnecessary given Vicious Mockery is the first case.

The array approach is consistent with `phases: ReadonlyArray<ActivationPhase>` already used at the top level.

---

## Atoms required (all already in v4)

| Atom | Category | Source |
|------|----------|--------|
| `spell_root` | source | existing |
| `activate` | procedure | existing |
| `action_quota` | resource | existing |
| `target` | attachment | existing |
| `save_gate` | resolution | existing |
| `damage` | effect | existing |
| `modify_roll_advantage` | effect | existing |
| `scale_die_count` | scaling | existing (v4 typed split) |

No new atoms are needed. This is a pure surface widening.

---

## Tracer impact

Once `Effect` includes `ModifyRollAdvantageEffect` and `onFail`/`onSuccess` become arrays, the tracer's `traceSaveBranch` function will need to iterate over the array and emit one effect node per entry. The `traceEffect` function already handles `modify_roll_advantage` via the mastery path but would need to be lifted into the shared Effect dispatcher. No new `atomKind` strings are required.
