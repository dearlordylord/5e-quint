# Proposal: Surface Widenings for Hellish Rebuke

**Unit:** Hellish Rebuke (Warlock 1, Reaction, SRD 5.2.1)  
**Outcome:** `surface_widening`  
**Atoms needed:** none (all v4 atoms exist)  
**Surface variants needed:** 3

---

## Gap 1 — `ReactionTrigger.take_damage_from_visible_creature`

### Problem

The existing `ReactionTrigger` variants are:

```typescript
| { readonly kind: "hit_by_attack_roll" }
| { readonly kind: "targeted_by_named_spell"; readonly spellId: string }
| { readonly kind: "any_of"; readonly triggers: ReadonlyArray<ReactionTrigger> }
```

Hellish Rebuke triggers on **taking damage from a creature you can see within 60 ft**. This includes:
- Being hit by a weapon attack roll (covered by `hit_by_attack_roll`)
- Being hit by a damaging spell (Fireball, Magic Missile, etc. — NOT covered)
- Taking damage from any other source attributed to a visible creature (NOT covered)

Using `hit_by_attack_roll` as a stand-in would encode the wrong rule — it excludes the majority of valid trigger scenarios.

### Proposed addition

```typescript
| {
    readonly kind: "take_damage_from_visible_creature";
    readonly rangeFeet: number;
  }
```

SRD evidence: *"which you take in response to taking damage from a creature that you can see within 60 feet of yourself"*

---

## Gap 2 — `Attachment.trigger_source`

### Problem

Hellish Rebuke's target is not a free-choice target — it is **locked to the creature that fired the reaction trigger**. The existing `target` attachment (`selection: { mode: "one" }`) models a caster-chosen target from within range, which is subtly but mechanically distinct.

The constraint matters at runtime: the caster cannot choose a different nearby creature; the reaction is bound to the specific creature that caused the triggering event.

### Proposed addition

```typescript
| { readonly kind: "trigger_source" }
```

This attachment kind means "the creature (or entity) identified by the reaction trigger." It requires no selection parameter — the trigger determines the target.

SRD evidence: *"The creature that damaged you is momentarily surrounded by green flames."* (No range check needed beyond what the trigger already requires.)

---

## Gap 3 — Half-damage on successful save

### Problem

The `save_gate` phase shape is:

```typescript
{
  readonly kind: "save_gate";
  readonly attachment: Attachment;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;
  readonly onSuccess: Effect;
}
```

`Effect` is `DamageEffect | NoneEffect`. `DamageEffect` takes a `DiceAmount` — a fixed dice expression or a scaled variant.

"Half as much damage on a successful one" is **not** a fresh dice roll. It means: roll the fail amount (2d10), then halve the result. This is mechanically distinct from rolling 1d10 separately:

- Fail roll = 18 → success receives 9
- Fail roll = 2 → success receives 1

A separate `1d10` expression would sometimes give 10 when the fail gave only 2. The two distributions are not equivalent.

This save-for-half pattern is ubiquitous in the SRD (Fireball, Thunderwave, Ice Storm, etc.) and cannot be honestly encoded without a surface change.

### Proposed addition (two options)

**Option A** — New `Effect` variant:

```typescript
| { readonly kind: "half_of_fail_damage" }
```

The tracer would link this effect to the `onFail` damage amount (implicit dependency). Clean, semantically precise.

**Option B** — Boolean flag on `save_gate`:

```typescript
{
  readonly kind: "save_gate";
  ...
  readonly onFail: Effect;
  readonly halfDamageOnSuccess: boolean;  // replaces onSuccess when true
}
```

Simpler to add, but slightly less composable if a future spell needs "quarter damage on success" or similar.

Either option is workable. Option A is more honest to the composition model.

SRD evidence: *"taking 2d10 Fire damage on a failed save or half as much damage on a successful one"*

---

## Why no `.dhall` was authored

All three gaps are blocking for honest encoding:

1. No `ReactionTrigger` variant matches "take damage from a visible creature within 60 ft"
2. No `Attachment` variant captures the trigger-source binding
3. No `Effect` shape expresses "half of what the fail rolled"

Forcing the unit into `hit_by_attack_roll` + `{ mode: "one" }` + a fresh `1d10` on success would produce a formally valid but semantically wrong JSON. The guardrails require honest encoding over valid-but-misleading encoding.

---

## Impact

These three widenings together would unblock a large class of SRD spells:

- **`take_damage_from_visible_creature`** triggers: Hellish Rebuke (and potentially future revenge/counterattack reactions)
- **`trigger_source` attachment**: any reaction spell that automatically targets the trigger actor
- **Half-damage on success**: Fireball, Thunderwave, Ice Storm, Lightning Bolt, Burning Hands, Cone of Cold, and many others — this is perhaps the single most common save-for-half pattern in the SRD

The `half_of_fail_damage` widening in particular likely blocks a large fraction of the srd-5.2.1 spell tier.
