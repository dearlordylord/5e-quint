# Proposal: Detect Thoughts gaps

**Unit:** Detect Thoughts (Level 2 Divination, Concentration 1 minute)  
**Outcome:** `structural_widening`

---

## Summary of gaps

Detect Thoughts cannot be honestly encoded in the current surface. Four distinct gaps block it, in order of severity:

---

### Gap 1 — Multi-mode ongoing family (structural)

The spell activates *one of two effects* at cast time and allows the caster to re-select between them on each subsequent turn using a Magic action. The current `ongoing_effect` family has a single `operation: OngoingOperation` field. There is no surface mechanism for player-choice between N distinct operations per activation.

**Proposed widening:** A new spell mechanics family (or a structural extension to `ongoing_effect`) with a `modes` array and a per-turn selection cost:

```typescript
export type MultiModeOngoingMechanics = SpellMechanicsHeader & {
  readonly family: "multi_mode_ongoing";
  readonly attachment: Attachment;
  readonly modes: ReadonlyArray<{
    readonly name: string;
    readonly operation: OngoingOperation;  // extended — see Gap 2
  }>;
  readonly modeActivationCost: "magic_action" | "bonus_action" | "free";
};
```

This generalizes to future spells with similar "choose-your-effect-each-turn" patterns (Moonbeam repositioning, Hunger of Hadar variants, etc.).

---

### Gap 2 — Information/detection effect atoms (atom widening)

Both modes of Detect Thoughts produce informational outcomes. The v4 atom inventory has no information or detection atoms, and the current `Effect` union (`DamageEffect | NoneEffect`) cannot express them.

**Sense Thoughts** — detects presence of thinking creatures within 30 ft:
```typescript
export type SensePresenceEffect = {
  readonly kind: "sense_presence";
  readonly radius: { readonly feet: number };
  readonly filter: "thinking_creatures";  // can generalize later
};
```

**Read Thoughts (surface)** — learns what is most on target's mind:
```typescript
export type GrantInformationEffect = {
  readonly kind: "grant_information";
  readonly scope: "surface_thoughts" | "deep_thoughts" | "reasoning_and_emotions";
  readonly target: "one_creature";
};
```

These would be added to the `Effect` union and the v4 atom inventory under the effect category.

**Note:** `grant_sense` already exists in v4 (darkvision, truesight) but covers persistent sensory modes, not active proximity detection of mental states. `sense_presence` is conceptually distinct.

---

### Gap 3 — Probe deeper: nested save gate within ongoing (surface widening)

Read Thoughts has a **conditional follow-up**: on the caster's *next turn*, they can spend a Magic action to "probe deeper," opening a Wisdom saving throw:
- Fail → `grant_information` (reasoning/emotions) + target knows
- Success → spell ends + target knows

This is a save gate nested inside an ongoing concentration effect, triggered by a per-turn optional activation. The current surface has no mechanism for "optional secondary activation within an ongoing effect that costs a Magic action and has a save gate."

Once Gap 1 (multi-mode) and Gap 2 (grant_information) are addressed, this could be modeled as a mode with a special `save_gate_operation`:

```typescript
export type SaveGateOperation = {
  readonly kind: "save_gate_operation";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onFail: Effect;         // grant_information
  readonly onSuccess: "end_spell"; // new — spell termination on save success
};
```

The `onSuccess: "end_spell"` is itself a small widening: the current `Effect` has no "terminate the spell" outcome.

---

### Gap 4 — Target-initiated ability check counter (atom widening)

The target can use their action to make an Intelligence (Arcana) check against the caster's spell save DC to terminate the spell:

> "the target can take an action on its turn to make an Intelligence (Arcana) check against your spell save DC, ending the spell on a success."

This is a **target-initiated ability_check resolution** that can terminate an ongoing concentration effect. Nothing in the current surface models a contested check the *target* initiates against the *caster's* DC.

**Proposed widening:** A new `TerminationCondition` type attached to ongoing mechanics:

```typescript
export type AbilityCheckTermination = {
  readonly kind: "target_ability_check";
  readonly ability: Ability;            // "int"
  readonly skill?: string;              // "arcana"
  readonly dc: DcSource;               // caster_spell_save_dc
  readonly activatedBy: "target";
  readonly cost: "action";
};
```

This generalizes to future spells where the target can resist or end an effect through an active check (Suggestion, Geas's compliance checks, etc.).

---

## Out-of-core items (not proposed for widening)

- **Material blocking** (stone/metal/lead): spatial environmental filtering — DM-adjudicated. No deterministic mechanical resolution; legitimately out-of-core per ARCHITECTURE.md.
- **"Target knows you are probing"**: narrative notification — caller-owned per ARCHITECTURE.md.
- **Language/telepathy prerequisite** on Sense Thoughts: creature property filter. Could be modeled as a `filter` predicate on `sense_presence` if the engine needs it; not blocking for the surface taxonomy.

---

## Pressure classification

| Gap | Kind | Blocks encoding? |
|-----|------|-----------------|
| Multi-mode ongoing family | `structural_widening` | Yes — no honest family exists |
| `sense_presence` atom | `atom_widening` | Yes — no information effect atom |
| `grant_information` atom | `atom_widening` | Yes — same |
| Nested save gate with end_spell | `surface_widening` | Yes — once atoms exist |
| Target ability check counter | `atom_widening` | Yes — no termination condition pattern |

Primary classification: **`structural_widening`** (the family gap is the root; the atom gaps compound it).
