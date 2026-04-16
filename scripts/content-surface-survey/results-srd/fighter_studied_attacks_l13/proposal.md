# Proposal: Widening for Studied Attacks (fighter L13)

## Outcome: `structural_widening`

---

## Unit

**Name:** Studied Attacks  
**Class / Level:** Fighter, Level 13  
**Provenance:** SRD 5.2.1 — Classes/Fighter#Level 13: Studied Attacks

> You study your opponents and learn from each attack you make. If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn.

---

## Why it cannot be encoded honestly

### Gap 1 — No passive-trigger class feature family (structural)

The surface has exactly one class feature mechanics family: `activation`.  
`ClassFeatureMechanicsHeader` requires three fields:

| Field | What `activation` expects | What Studied Attacks has |
|---|---|---|
| `activationCost` | `free` or `bonus_action` | **nothing** — the effect fires automatically |
| `resource` | `UseCountResource` (use_count + cap) | **none** — fires on every miss, unlimited |
| `resetCadence` | Short rest / long rest / etc. | **irrelevant** — no resource to reset |

Studied Attacks is passive: the fighter does not choose to activate it. It fires automatically whenever an attack roll misses. Forcing it into `activation` would require fabricating a `use_count` with an unlimited cap and a meaningless `resetCadence` — a lie in the trace.

The mastery section has an analogous family for weapon-hit passives (`on_hit_trigger`). Studied Attacks needs an equivalent family for class features, rooted at the `on_miss_window` v4 atom.

### Gap 2 — `modify_roll_advantage` missing from `ClassFeatureEffect`

The effect is advantage on the next attack roll against the same creature. In v4 taxonomy this is `modify_roll_advantage`. That atom exists and is already wired into `MasteryEffect`, but `ClassFeatureEffect` is `GrantExtraActionEffect | HealHpEffect` only. The effect variant needs to be threaded into class feature effects.

---

## Proposed widenings

### 1. New class feature family: `on_miss_trigger`

Modeled after `MasteryMechanics / on_hit_trigger` but rooted at `on_miss_window` instead of `on_hit_window`. Proposed shape (sketch):

```typescript
export type ClassFeatureOnMissTriggerMechanics = {
  readonly family: "on_miss_trigger";
  // No activationCost, resource, or resetCadence — fires passively.
  readonly effect: ClassFeatureOnMissEffect;   // see gap 2
  readonly usageLimit?: MasteryUsageLimit;     // optional once-per-turn fence if needed
};
```

Graph shape:
```
class_feature_root
  → attack_roll (on_miss_window fires)
  → on_miss_window
  → modify_roll_advantage (Advantage on attack_roll)
    → target (same creature as the missed attack)
    → persists_until turn_end_window (attacker's next turn)
```

This is the exact mirror of the mastery `on_hit_trigger` subgraph, substituting `on_miss_window` for `on_hit_window`.

### 2. Extend `ClassFeatureEffect` to include `modify_roll_advantage`

`MasteryEffect` already has `ModifyRollAdvantageRider`. That type (or a compatible projection) should be admitted into `ClassFeatureEffect` so the tracer can emit the correct atom. The expiry shape (`end_of_next_turn`) already exists in `RiderExpiry`.

---

## Atom / relation inventory (if widening lands)

Once both gaps are filled, the trace would use only existing v4 atoms:

| Atom | Category |
|---|---|
| `class_feature_root` | source |
| `attack_roll` | resolution |
| `on_miss_window` | window |
| `modify_roll_advantage` | effect |
| `target` | attachment |
| `turn_end_window` | window |

Relations: `roots`, `opens_window`, `grants`, `attaches_to`, `persists_until` — all existing.

No new atoms or relations are needed; only a new class feature family and an effect-type extension.

---

## Confidence: high

The mechanic is simple and unambiguous. Both gaps are clear. The v4 atom inventory already covers everything needed for the trace once the surface type is extended.
