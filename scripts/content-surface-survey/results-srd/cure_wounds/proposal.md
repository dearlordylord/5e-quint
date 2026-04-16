# Proposal: surface_widening for Cure Wounds

## Unit

**Cure Wounds** — Level 1 Abjuration spell (SRD 5.2.1, `srd52: true`).  
Casting Time: Action | Range: Touch | Components: V, S | Duration: Instantaneous  
Effect: Target regains 2d8 + spellcasting ability modifier HP.  
Upcast: +2d8 per slot level above 1.

## Why it doesn't fit

Cure Wounds is an instant, action-cost, slot-scaling, touch-range spell — structurally identical to `activation` family spells. But two surface-type gaps prevent honest encoding.

### Gap 1: `ActivationPhase` has no unconditional variant

`ActivationPhase` is currently:

```typescript
export type ActivationPhase =
  | { kind: "attack_roll"; ... onHit: Effect; onMiss: Effect; }
  | { kind: "save_gate"; ... onFail: Effect; onSuccess: Effect; };
```

Both variants require a resolution gate. Cure Wounds delivers its heal with no attack roll and no saving throw — the effect fires unconditionally on the target touched. No existing phase kind can represent this without lying (e.g., a save_gate with `onFail` and `onSuccess` both set to the same heal would be a false trace).

### Gap 2: `heal_hp` absent from the spell `Effect` union

```typescript
// Current spell Effect — only damage or nothing:
export type Effect = DamageEffect | NoneEffect;
```

`HealHpEffect` already exists for class features:

```typescript
export type HealHpEffect = {
  readonly kind: "heal_hp";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};
```

It needs to be added to the spell `Effect` union (or a shared `Effect` union promoted to both).

## Proposed widenings

### Widening 1 — new `ActivationPhase` variant: `unconditional`

```typescript
| {
    readonly kind: "unconditional";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

This covers spells that touch/target a creature and apply an effect without any roll or gate. Cure Wounds is the canonical example; Healing Word and Mass Cure Wounds would follow the same shape.

The tracer would emit: `activate → attaches_to target → grants effect(heal)`.  
No new v4 atoms required — `heal` already exists in the v4 atom inventory.

### Widening 2 — `heal_hp` in spell `Effect`

Promote `HealHpEffect` into the shared spell `Effect` union (or duplicate/reuse):

```typescript
export type Effect = DamageEffect | NoneEffect | HealHpEffect;
```

The existing `HealHpEffect` type is already the right shape: `DiceAmount` supports `linear_per_level` with `axis: "slot"` for upcast scaling.

## Expected trace after widening

```
spell_root → activate
activate --consumes--> action_quota
activate --consumes--> spell_slot (≥ level 1)
activate --attaches_to--> target (one, range Touch)
activate --grants--> heal (2d8 linear per slot above 1)
heal --modifies (scale_die_count, axis=slot)--> spell_slot
```

Atoms used: `spell_root`, `activate`, `action_quota`, `spell_slot`, `target`, `heal`, `scale_die_count`  
Relations used: `roots`, `consumes`, `attaches_to`, `grants`, `modifies`

## Notes

- Both widenings are narrow: no new v4 atoms needed, only new type variants.  
- `heal_hp` already exists in `ClassFeatureEffect`; the gap is that spells don't share it.  
- The `unconditional` phase will also serve Healing Word (bonus action, 60 ft, same upcast pattern) and Mass Cure Wounds (6 targets in area).  
- The `target: "self" | "target_creature"` field on `HealHpEffect` continues to work; Cure Wounds uses `"target_creature"`.
