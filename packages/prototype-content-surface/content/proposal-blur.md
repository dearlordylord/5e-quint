# Proposal: Blur — surface_widening

## Unit

**Blur** — Level 2 Illusion, Concentration 1 minute, Self, Action, V only.

> "Your body becomes blurred. For the duration, any creature has Disadvantage on attack rolls against you. An attacker is immune to this effect if it perceives you with Blindsight or Truesight."

## Outcome

`surface_widening` — The `ongoing_effect` family and all header atoms fit. The blocker is a missing variant in `OngoingOperation`.

## What fits

- **Family**: `ongoing_effect` — correct. Blur is a concentration spell that persists while maintained.
- **Attachment**: `{ kind: "self" }` — correct. The caster is the protected subject.
- **Duration**: `{ kind: "concentration", upTo: { unit: "minute", amount: 1 } }` — correct.
- **CastingTime**: `{ kind: "action" }` — correct.
- **Range**: `{ kind: "self" }` — correct.
- **Components**: `{ v: true, s: false, m: false }` — correct, verbal only.
- **Atoms available in v4**: `modify_roll_advantage`, `concentrate`, `expire`, `action_quota`, `spell_slot` — all present.

## What is missing

### 1. Missing `OngoingOperation` variant: advantage/disadvantage on rolls targeting the attachment

The current `OngoingOperation` union:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

`RollModifierOperation` encodes numeric dice deltas (`DiceDelta`, e.g. +1d4 from Bless). It maps to the `modify_roll_numeric` atom. Blur does not add a numeric modifier — it imposes **Disadvantage**, which maps to the `modify_roll_advantage` atom.

**Proposed new variant:**

```typescript
export type RollAdvantageOperation = {
  readonly kind: "roll_advantage";
  readonly on: ReadonlyArray<RollKind>;          // ["attack_roll"]
  readonly mode: "advantage" | "disadvantage";   // "disadvantage"
  readonly direction: "outgoing" | "incoming";   // "incoming" = rolls targeting the attachment
};
```

`direction: "incoming"` distinguishes Blur (disadvantage on rolls *against* the caster) from hypothetical outgoing variants (advantage on rolls *made by* the attached creature). Bless uses `roll_modifier` with no direction concept because numeric bonuses apply to the rolling creature's own roll; advantage-state operations may need direction when the subject is `self`.

### 2. Missing perceptual-sense filter (secondary gap)

> "An attacker is immune to this effect if it perceives you with Blindsight or Truesight."

No current surface type encodes a sense-based bypass filter on an ongoing operation. This could be modeled as an optional `immuneIf` field on the new operation variant:

```typescript
immuneIf?: ReadonlyArray<{ readonly perceivesWith: "blindsight" | "truesight" }>;
```

This is a narrow, real constraint. It should be noted but may be deferred to a later widening pass if Blur is the only pressure case.

## Proposed surface change

Add to `types.ts`:

```typescript
export type RollAdvantageOperation = {
  readonly kind: "roll_advantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly mode: "advantage" | "disadvantage";
  readonly direction: "outgoing" | "incoming";
  readonly immuneIf?: ReadonlyArray<{ readonly perceivesWith: "blindsight" | "truesight" }>;
};

export type OngoingOperation = RollModifierOperation | DamageOnHitOperation | RollAdvantageOperation;
```

Add to `tracer.ts` in `traceOngoingOperation`:

```typescript
case "roll_advantage": {
  const id = ids("op");
  nodes.push({
    id,
    category: "effect",
    atomKind: "modify_roll_advantage",
    label: `modify_roll_advantage\n${op.mode} on ${op.on.join(", ")} (${op.direction})`,
  });
  edges.push({ from: procId, to: id, relation: "grants" });
  edges.push({ from: id, to: attId, relation: "attaches_to" });
  return;
}
```

## Expected trace once widened

```
spell_root → activate → action_quota
           → spell_slot (L2)
           → concentrate → expire (≤ 1 minute)
           → self (attachment)
           → modify_roll_advantage (disadvantage on attack_roll, incoming)
                attaches_to self
```

## Confidence

High — the widening is narrow and precise. All supporting atoms are in v4. No structural or family change is needed.
