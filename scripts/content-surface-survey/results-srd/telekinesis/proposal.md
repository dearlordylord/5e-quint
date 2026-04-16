# Proposal: Telekinesis — surface_widening

## Unit

- **Slug**: `telekinesis`
- **Kind**: spell (level 5, transmutation, concentration ≤ 10 min)
- **Outcome**: `surface_widening`

## Why it doesn't encode

Telekinesis is a concentration spell whose primary loop is:

> Each turn, spend your **Magic action** → pick a creature or object within 60 ft → apply telekinetic control.

The **`ongoing_effect` family** is conceptually correct (concentration, repeating-per-turn effect). Encoding fails because the surface vocabulary is too narrow in six places.

---

## Gap 1: `OngoingOperation` has no save_gate variant

`OngoingOperation = RollModifierOperation | DamageOnHitOperation`

Both existing variants describe passive riders that fire on attack-roll events. Telekinesis's per-turn effect is a **save_gate** the caster actively opens by spending their Magic action. No `save_gate_on_magic_action` (or equivalent) variant exists.

**Evidence**: *"as a Magic action on your later turns before the spell ends, you can exert your will on one creature … The target must succeed on a Strength saving throw, or …"*

**Proposed variant**:
```typescript
export type SaveGateOnMagicActionOperation = {
  readonly kind: "save_gate_on_magic_action";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: SpellEffect;   // see Gap 2
  readonly onSuccess: SpellEffect;
};
```

---

## Gap 2: Spell `Effect` union has no `force_move` or `apply_condition`

`Effect = DamageEffect | NoneEffect`

The creature-branch effects are:
- Forced movement up to 30 ft (`force_move`) — in v4 taxonomy but absent from spell `Effect`
- Restrained condition (`apply_condition`) — in v4 taxonomy and in mastery `SaveGateRiderResult`, but absent from spell `Effect`

**Evidence**: *"you move it up to 30 feet in any direction"* / *"the creature has the Restrained condition"*

**Proposed additions to `Effect`**:
```typescript
export type ForceMoveEffect = {
  readonly kind: "force_move";
  readonly maxFeet: number;
  readonly axis: "any_direction_within_range";
};

export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
  readonly expiresOn: ConditionExpiry;   // see Gap 4
};
```

---

## Gap 3: `Condition` type doesn't include `"restrained"`

`export type Condition = "prone"`

Restrained is the condition inflicted by the creature branch.

**Evidence**: *"the creature has the Restrained condition"*

**Proposed widening**:
```typescript
export type Condition = "prone" | "restrained";
```

---

## Gap 4: No per-invocation activation cost on `OngoingOperation`

`OngoingEffectMechanics` has no field for a per-invocation cost beyond concentration maintenance. Telekinesis consumes the caster's Magic action each time they invoke the effect. This is mechanically distinct from spells whose ongoing operation fires passively (Bless, Hunter's Mark).

**Evidence**: *"as a Magic action on your later turns"*

**Proposed addition** (to the new save_gate_on_magic_action operation, or as a shared field on `OngoingEffectMechanics`):
```typescript
readonly invocationCost: { readonly kind: "magic_action" };
```

---

## Gap 5: No `object` attachment kind

`Attachment` has `self | target | area | mark`. Telekinesis targets **objects** in two sub-modes (unattended auto-move; worn/carried with STR save). The v4 taxonomy lists `object` as an attachment atom but it is absent from `types.ts`.

**Evidence**: *"You can try to move a Huge or smaller object"*

**Proposed addition to `Attachment`**:
```typescript
| {
    readonly kind: "object";
    readonly sizeLimit: "huge_or_smaller";
    readonly subMode: "unattended" | "worn_or_carried";
  }
```

---

## Gap 6: Dual creature/object mode

`OngoingEffectMechanics` has a single `operation` field. Telekinesis has two mechanically distinct modes (creature vs. object) selected per invocation. A single operation cannot represent both modes.

**Possible fix**: allow `OngoingEffectMechanics` to carry `operations: ReadonlyArray<OngoingOperation>` with discriminated attachment kinds, or introduce a new `choice_on_activation` operation wrapper.

---

## Object fine-control sub-mode

*"You can exert fine control on objects … such as manipulating a simple tool, opening a door or a container …"*

This sub-mode is **narrative / dm_agenda** — it specifies a range of DM-adjudicated interactions with no deterministic mechanical resolution. It is legitimately out-of-core and does not require a surface widening.

---

## Summary table

| Gap | Type affected | Classification |
|-----|--------------|---------------|
| No save_gate operation | `OngoingOperation` | new_variant |
| No `force_move` effect | `Effect` (spell) | new_variant |
| No `apply_condition` effect | `Effect` (spell) | new_variant |
| `"restrained"` missing | `Condition` | new_variant |
| No per-invocation action cost | `OngoingEffectMechanics` | new_variant |
| No `object` attachment | `Attachment` | new_variant |
| Single-operation limit | `OngoingEffectMechanics` | new_variant / new_subgraph |
