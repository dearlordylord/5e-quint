# Proposal: Faerie Fire surface widening

## Unit

**Faerie Fire** — level 1 evocation, concentration 1 min, SRD 5.2.1

## Outcome

`surface_widening` — the spell kind and family skeleton exist, but five surface type variants are missing.

## What the spell does

1. Cast as an Action; range 60 ft; targets a 20-ft Cube area.
2. All **objects** in the Cube are automatically outlined (no save).
3. Each **creature** in the Cube that **fails a Dexterity saving throw** is also outlined.
4. For the concentration duration, every outlined object and creature:
   - Sheds Dim Light in a 10-ft radius *(narrative; out-of-core per ARCHITECTURE.md)*
   - **Cannot benefit from the Invisible condition**
   - **Attack rolls against it have Advantage** (if the attacker can see it)

## Why it doesn't fit the current surface

### Gap 1 — `Effect` lacks `apply_condition` for spell activation phases

`ActivationPhase.save_gate.onFail` is typed as `Effect = DamageEffect | NoneEffect`. Faerie Fire's on-fail result is not damage; it is applying a persistent marker ("outlined") to the target. The mastery system already models this (`SaveGateRiderResult` has `apply_condition`), but the equivalent variant is absent from the spell `Effect` union.

**Proposed addition:**

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;        // needs "outlined" added to Condition
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

### Gap 2 — `OngoingOperation` lacks an "advantage on attacks against target" variant

`OngoingOperation = RollModifierOperation | DamageOnHitOperation`. The `roll_modifier` operation applies a numeric dice delta to rolls *made by* creatures in the attachment scope. Faerie Fire's core payoff goes in the opposite direction: attackers *targeting* the outlined creature gain Advantage. This is a structurally different operation direction.

**Proposed addition:**

```typescript
export type ModifyAttackerRollAdvantageOperation = {
  readonly kind: "modify_attacker_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;   // ["attack_roll"]
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifyAttackerRollAdvantageOperation;
```

This would also cover Greater Invisibility (disadvantage on attacks against the invisible target) and several other spells with similar inversion semantics.

### Gap 3 — No `block_condition_benefit` effect variant

"Can't benefit from the Invisible condition" is not `remove_condition` (Invisible is not removed, it just does not confer its normal benefits). The v4 atom inventory includes `block_targeting`, which is related but not identical. A dedicated surface variant is needed.

**Proposed addition (option A — narrow):**

```typescript
export type BlockConditionBenefitEffect = {
  readonly kind: "block_condition_benefit";
  readonly condition: Condition;          // "invisible" once added
};
```

Alternatively, this could be expressed as an `apply_condition` of a new condition that subsumes the suppression, but that collapses two distinct concepts.

### Gap 4 — `Condition` only contains `"prone"`

Both the "outlined" marker and "invisible" (as a target of suppression) need to be in the `Condition` type.

**Proposed additions:**

```typescript
export type Condition = "prone" | "invisible" | "outlined";
```

"Outlined" is Faerie Fire–specific but `apply_condition` should accept it. "Invisible" is standard SRD and appears as a suppression target here and as a standalone condition in Greater Invisibility, Invisibility, etc.

### Gap 5 — No mixed-targeting split (objects auto, creatures save)

The current surface has no variant for "all objects in area are automatically affected; creatures in the same area must save." Every `ActivationPhase` applies uniformly to every target selected by the `Attachment`.

**Proposed approach:** A new `AffectsObjects` flag or a secondary unconditional attachment on the area, e.g.:

```typescript
export type ActivationPhase =
  // ... existing variants
  | {
      readonly kind: "save_gate";
      readonly attachment: Attachment;
      readonly affectsNonCreaturesUnconditionally?: true;  // objects skip the save
      ...
    };
```

This is narrower than a full structural change and covers the Faerie Fire pattern exactly.

## Encoding strategy if gaps are filled

With all five gaps addressed, Faerie Fire would encode as:

```
family: "activation"
duration: { kind: "concentration", upTo: { unit: "minute", amount: 1 } }
phases: [
  {
    kind: "save_gate",
    attachment: { kind: "area", shape: { kind: "cube", sideFeet: 20 }, origin: { kind: "point_within_range" } },
    affectsNonCreaturesUnconditionally: true,   // gap 5
    ability: "dex",
    dc: { kind: "caster_spell_save_dc" },
    onFail: { kind: "apply_condition", condition: "outlined" },  // gap 1 + 4
    onSuccess: { kind: "none" }
  }
]
```

The "outlined" condition definition (separate from the spell card) would carry:
- `{ kind: "modify_attacker_roll_advantage", mode: "advantage", on: ["attack_roll"] }` (gap 2)
- `{ kind: "block_condition_benefit", condition: "invisible" }` (gap 3 + 4)

The dim-light emission is caller-owned narrative and stays out of the atom graph per ARCHITECTURE.md.

## Scope note

Gaps 1–4 collectively describe the "save gate → apply persistent condition → condition carries ongoing modifiers" pattern. This pattern is present in at least: Hold Person (paralyzed), Entangle (restrained), Hypnotic Pattern (incapacitated), Faerie Fire (outlined). Resolving these gaps unblocks encoding of the entire save-applies-condition class of spells.
