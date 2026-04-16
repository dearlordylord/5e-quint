# Proposal: Contagion — Surface and Atom Widenings

**Outcome:** `atom_widening`  
**Unit:** Contagion (level 5, Necromancy, SRD 5.2.1)

---

## Why the unit cannot be encoded honestly

Contagion exercises four mechanics that have no honest encoding in the current surface. Three expose missing variants of existing surface types (all backed by v4 atoms already). One requires a new atom with no v4 counterpart.

---

## Gap 1 — `apply_condition` absent from spell `Effect`

**Type:** `surface_widening`

The initial save gate on fail applies both 11d8 Necrotic damage and the Poisoned condition. The `Effect` union used in `ActivationPhase.onFail`/`onSuccess` supports only `damage` and `none`:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

The v4 atom `apply_condition` exists (§9 Effect Atoms) and is already surface-reachable via `SaveGateRiderResult` in masteries. It is not reachable from `ActivationPhase`. Adding a variant to `Effect`:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
export type Effect = DamageEffect | ApplyConditionEffect | NoneEffect;
```

would close this gap, though `Condition` currently only lists `"prone"` and would need `"poisoned"` added.

**Evidence:** *"the target must succeed on a Constitution saving throw or take 11d8 Necrotic damage and have the Poisoned condition"*

---

## Gap 2 — `repeat_save` absent from `ActivationPhase`

**Type:** `surface_widening`

The spell requires the target to make repeated end-of-turn CON saves, accumulating independent success/failure counters with different resolution outcomes at threshold (3 of either). This is structurally distinct from the one-shot `save_gate` phase: it has state (counters), per-counter-threshold effects, and two asymmetric terminal branches.

The v4 taxonomy includes `repeat_save` as a Resolution Atom (§5). It is not represented in `ActivationPhase`. A new variant is needed:

```typescript
| {
    readonly kind: "repeat_save";
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly successThreshold: number;
    readonly failureThreshold: number;
    readonly onSuccessThresholdReached: Effect;  // spell ends
    readonly onFailureThresholdReached: Effect;  // spell persists full duration
  }
```

**Evidence:** *"The target must repeat the saving throw at the end of each of its turns until it gets three successes or failures. If the target succeeds on three of these saves, the spell ends on the target. If the target fails three of the saves, the spell lasts for 7 days on it."*

---

## Gap 3 — `modify_roll_advantage` with condition-gate and cast-time ability parameter

**Type:** `surface_widening`

While the target has the Poisoned condition, it has Disadvantage on saving throws made with ONE ability chosen at cast time. Two sub-gaps:

**3a. Condition-gate on a persistent effect.** The Disadvantage only applies while the target holds the Poisoned condition. The current surface has no mechanism for a persistent modifier gated on an active condition. `OngoingOperation.roll_modifier` and `MasteryEffect.modify_roll_advantage` have no `prerequisiteCondition` field.

**3b. Cast-time ability selector.** The affected ability is not a fixed parameter — it is chosen by the caster at cast time. The surface has no mechanism for a caster-choice that parameterizes a downstream effect at cast time (analogous to `MarkTransfer`'s `chosenAtCast: true` on filters, but for effect parameters).

**Evidence:** *"choose one ability when you cast the spell. While Poisoned, the target has Disadvantage on saving throws made with the chosen ability"*

---

## Gap 4 — Condition-persistence gate (new atom, no v4 counterpart)

**Type:** `atom_widening`

Contagion adds a new kind of protection to the Poisoned condition: whenever any effect would remove Poisoned from the target, the target must first succeed on a CON save. On a success the removal goes through; on a failure, Poisoned stays.

This is not any existing v4 atom:

| Candidate | Why it fails |
|---|---|
| `block_targeting` | Blocks targeting of the creature, not condition-removal events |
| `negate_named_effect` | Negates a specific named spell, not a class of effects (remove_condition) |
| `condition_progression` | Models conditions worsening over time; does not intercept incoming removals |
| `repeat_save` | Models repeated save chains; does not intercept effect events |
| `remove_condition` | Is itself the effect being intercepted/blocked, not the interceptor |

The needed atom would intercept incoming `remove_condition` events targeted at a specific condition on a specific creature, gate the removal behind a save, and conditionally suppress it on failure. Proposed name: **`condition_persistence_gate`**.

**Evidence:** *"Whenever the Poisoned target receives an effect that would end the Poisoned condition, the target must succeed on a Constitution saving throw, or the Poisoned condition doesn't end on it."*

---

## Summary

| Gap | Classification | v4 atom exists? |
|---|---|---|
| `apply_condition` in spell `Effect` | `surface_widening` | Yes (`apply_condition`) |
| `repeat_save` as `ActivationPhase` variant | `surface_widening` | Yes (`repeat_save`) |
| `modify_roll_advantage` with condition-gate + cast-time ability param | `surface_widening` | Partial (`modify_roll_advantage` exists; condition-gate and cast-time param do not) |
| Condition-persistence gate | `atom_widening` | No |

Overall classification: **`atom_widening`** (the condition-persistence gate requires a new v4 atom; the three surface gaps are additive).

The `activation` spell family is the correct structural home for this unit — the gaps are surface and atom level, not structural. No new family is needed.
