# Proposal: Animal Messenger — Widening Requirements

**Outcome:** `structural_widening`
**Unit:** Animal Messenger (SRD 5.2.1, level 2 Enchantment)

---

## Why no Dhall was authored

Animal Messenger's core mechanic is:

> Target an existing wild Tiny Beast within range → the beast makes a CHA save (skipped if CR > 0) → on fail, the beast is compelled to autonomously travel to a specified location and deliver a specified message, persisting until the spell's duration ends or the beast arrives.

This does not fit any existing `SpellMechanics` family honestly:

| Family | Why it fails |
|---|---|
| `activation` | `onFail: Effect` is `damage \| none`; creature compulsion is neither. |
| `ongoing_effect` | operation is `roll_modifier \| damage_on_hit`; creature task-delegation is neither. |
| `anchored_trigger` | plants a trigger on a *location*; here the subject is a *creature*. |
| `triggered_reaction` | caster-reaction-shaped; Animal Messenger is an active cast. |

Forcing any of these would produce a graph that lies about what the spell does.

---

## Widening 1 — New payload family: `creature_compulsion`

**Kind:** `new_subgraph`

The mechanic pattern:

```
spell_root → activate → save_gate (target creature)
  on fail → command_creature (task: travel + deliver)
           → persist → expire (duration / on delivery)
```

This is a new top-level payload family, analogous to `anchored_trigger` but creature-targeted rather than location-targeted. The creature-compulsion mechanic appears in several spells (Animal Messenger, Geas, Command, Suggestion, Charm Person/Monster) at varying complexity levels. Animal Messenger is the simplest case.

---

## Widening 2 — New `Effect` variant: `command_creature`

**Kind:** `new_variant`

The current `Effect` union is:
```typescript
export type Effect = DamageEffect | NoneEffect;
```

v4 has a `command_companion` atom, but that atom targets an already-bound companion. Animal Messenger targets an *unbound wild beast* chosen at cast time — semantically distinct. A new surface variant is needed:

```typescript
export type CommandCreatureEffect = {
  readonly kind: "command_creature";
  readonly task: "deliver_message"; // closed enum, widen on pressure
};
```

The task payload (the message text, the recipient description) is DM-agenda per ARCHITECTURE.md and stays out of core. Only the task *kind* needs to be representable.

---

## Widening 3 — Duration slot-scaling variant

**Kind:** `new_variant`

Current `Duration.timed` holds a fixed `DurationValue`:
```typescript
| { readonly kind: "timed"; readonly value: DurationValue }
```

Animal Messenger upcast: *+48 hours per slot above 2.* There is no slot-scaling shape for `Duration`. A new variant is needed, e.g.:

```typescript
| {
    readonly kind: "timed_slot_scaled";
    readonly base: DurationValue;
    readonly perSlotAboveBase: DurationValue;
    readonly baseLevel: SpellLevel;
  }
```

This same gap will recur for other spells with slot-scaled durations (Suggestion, Hold Person, etc.).

---

## Widening 4 — Save gate CR-conditional auto-succeed

**Kind:** `new_variant`

The SRD text: *"if the target's Challenge Rating isn't 0, it automatically succeeds."* This means the save gate is gated on a property of the target (its CR), not on the roll mechanics. No existing surface shape captures a conditional bypass of a saving throw based on target properties.

Candidate shape for `ActivationPhase.save_gate`:
```typescript
autoSucceedCondition?: {
  readonly kind: "target_cr_above";
  readonly cr: number;
}
```

This pattern (CR/type-conditional save immunity) appears in other spells (e.g., Charm Person only affects Humanoids).

---

## Notes on DM-agenda boundary

The spell's DM-agenda portions:
- The message text ("up to twenty-five words") — narrative content
- The recipient description ("a red-haired dwarf wearing a pointed hat") — fuzzy matching adjudicated by DM
- Whether the beast successfully finds the recipient before the spell ends — DM adjudication

These are correctly out of core scope. The mechanical frame (save gate → compulsion → travel + delivery lifecycle) is deterministic and belongs in core.

The unit is **not** classified as `dm_agenda` because the DM-agenda portions are secondary deliverables of a mechanically-grounded compulsion effect, not the entire purpose of the spell.
