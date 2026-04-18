# Proposal: Boon of Combat Prowess

**Outcome:** `atom_widening`

## Unit

*Epic Boon Feat (Prerequisite: Level 19+)*

> **Ability Score Increase.** Increase one ability score of your choice by 1, to a maximum of 30.
>
> **Peerless Aim.** When you miss with an attack roll, you can hit instead. Once you use this benefit, you can't use it again until the start of your next turn.

---

## Gap 1 — Missing reaction trigger: bearer's outgoing miss

**Proposed widening:** new `ReactionTrigger` variant

```typescript
| { readonly kind: "bearer_misses_attack_roll" }
```

Peerless Aim is a once-per-turn activated ability that fires when **the feat holder misses** with an attack roll. The existing `ReactionTrigger` vocabulary covers only inbound events:

- `hit_by_attack_roll` — someone hits the bearer
- `targeted_by_named_spell` — bearer is targeted
- `creature_casts_spell` — some creature casts
- `spell_save_outcome` — bearer finishes a save

None of these represent an outgoing attack by the bearer that resolved as a miss. The new variant names that specific event boundary so the Peerless Aim activation window can be declared.

**Evidence:** "When you miss with an attack roll, you can hit instead."

---

## Gap 2 — Missing effect atom: convert miss to hit

**Proposed widening:** new `EffectAtom` variant

```typescript
| { readonly kind: "convert_miss_to_hit" }
```

The Peerless Aim effect retroactively changes the resolved outcome of the triggering attack roll from miss → hit. This is categorically different from every existing modifier:

- `modify_roll_numeric` — adds a delta before the roll resolves
- `modify_roll_advantage` — changes dice method before the roll
- any reroll idiom — re-executes the roll

Peerless Aim acts **after** the roll has already resolved as a miss and unconditionally flips the binary outcome. The effect has no numeric or probabilistic component; it is a deterministic state override. No existing atom expresses this.

**Evidence:** "When you miss with an attack roll, you can hit instead."

**Mechanics shape:**

```typescript
// Activation family, reaction cost:
{
  family: "activation",
  activationCost: {
    kind: "reaction",
    trigger: { kind: "bearer_misses_attack_roll" }
  },
  resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } },
  resetCadence: { kind: "caster_turn_start" },  // "start of your next turn"
  phases: [
    {
      kind: "direct",
      attachment: { kind: "self" },
      effects: [{ kind: "convert_miss_to_hit" }]
    }
  ]
}
```

Note: `resetCadence` would also need a `caster_turn_start` variant (currently `ResetCadence` covers rest-based and calendar-time cadences, not turn-start). Alternatively this maps to the existing `RiderExpiry.caster_turn_start` expiry shape; the reset surface may need a parallel `turn_start` cadence entry.

---

## Gap 3 — Surface widening: choice-of-ability for modify_ability_score

**Proposed widening:** extend `modify_ability_score.ability` to accept a choice

```typescript
| {
    readonly kind: "modify_ability_score";
    readonly ability: Ability | CastTimeChoice<Ability>;  // was: just Ability
    readonly delta: number;
    readonly minimum?: number;
    readonly maximum?: number;
  }
```

The Ability Score Increase sub-feature grants +1 to **a player-chosen ability score**. The current atom requires a fixed `Ability`. This same pattern recurs across every Epic Boon feat ("Increase one ability score of your choice by 1, to a maximum of 30"), so the widening has broad applicability beyond this unit.

The `CastTimeChoice<Ability>` form parallels the existing `DamageTypeRef = DamageType | CastTimeChoice<DamageType>` pattern.

**Evidence:** "Increase one ability score of your choice by 1, to a maximum of 30."

---

## Why no encoding was authored

The Peerless Aim trigger and effect (Gaps 1 and 2) are both absent from the surface. Authoring a dhall file would require inventing atom kinds that the tracer would reject with `unhandled effect atom` or `unhandled reaction trigger`. No honest placeholder exists.

The ASI sub-feature (Gap 3) is secondary: even if that gap were resolved, the Peerless Aim atom gaps would still block the encoding.
