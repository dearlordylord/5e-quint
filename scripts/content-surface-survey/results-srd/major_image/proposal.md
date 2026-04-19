# Proposal: Major Image — atom_widening

## Unit
**Major Image** — Level 3 Illusion spell (SRD 5.2.1, `srd52: true`)

## What Fits

The spell maps to `ongoing_effect` cleanly:

| Element | Encoding |
|---|---|
| Family | `ongoing_effect` |
| Attachment | `area { kind: "cube", sideFeet: 20 }`, `origin: point_within_range`, range 120 ft |
| Duration | `concentration`, up to 10 minutes |
| Passive effect | `create_illusion` with `maxSize: "gargantuan"`, `channels: ["visual","sound","smell","temperature"]` |
| Reposition | `reposition_attachment` (no `maxMoveFeet` cap) via `on_caster_spends_action { kind: "standard_action", action: "magic" }` |
| Disbelief gate | `on_creature_studies` + `ability_check_gate { ability: "int", dc: caster_spell_save_dc }` |

Typecheck passes. Tracer emits a valid mermaid graph. The `on_creature_studies` trigger and `ability_check_gate` ongoing effect are already in the surface — anticipating exactly this illusion pattern.

## Gap 1 — Missing atom: disbelief/see-through effect (primary — atom_widening)

**RAW:** "If a creature discerns the illusion for what it is, the creature can see through the image, and its other sensory qualities become faint to the creature."

The `ability_check_gate.onPass` is typed as `EffectAtom`. No existing `EffectAtom` captures "this creature now perceives this illusion as transparent/faint." `{ kind: "none" }` was used as an acknowledged placeholder — same gap already documented for Silent Image.

This is a creature-local perception state with deterministic mechanical consequences: the creature can target through the illusion, the illusion provides no concealment for that creature, and sensory channels go faint. It is not DM agenda — the SRD defines the outcome deterministically on check success.

**Proposed atom: `disbelieve_illusion`**
```typescript
| { readonly kind: "disbelieve_illusion" }
```
- No parameters at the atom level: scope is always the creature that passed the check, against the host illusion for its remaining duration.
- Emitted as an `effect`-category node in the tracer with relation `branches_on_pass`.
- Same atom serves: Silent Image (identical text), and Phantasmal Force (disbelief ends the psychic damage loop).

## Gap 2 — Missing surface variant: slot-based duration kind change (secondary — surface_widening)

**RAW:** "The spell lasts until dispelled, without requiring Concentration, if cast with a level 4+ spell slot."

At slot ≥ 4, the duration *kind* changes: from `{ kind: "concentration", upTo: { unit: "minute", amount: 10 } }` to `{ kind: "permanent", endsOn: ["dispel"] }`. The existing `DurationUpcastTier` only supports `amount` changes within the same kind. The True Polymorph `permanentIfMaintainedFull` flag is maintenance-based (sustain full duration → becomes permanent), not slot-based — a different trigger.

**Proposed variant: `concentration.permanentAtSlot`**
```typescript
// Added to the concentration Duration kind:
readonly permanentAtSlot?: {
  readonly atSlot: SpellLevel;
  readonly endsOn?: ReadonlyNonEmptyArray<"dispel" | "damage">;
};
```

When cast at slot ≥ `permanentAtSlot.atSlot`, the spell skips the concentration window and goes directly to `persist → expire[on: dispel]`. When cast below that slot, normal concentration applies.

This pattern is specific enough to major_image in the current SRD corpus but general enough that other illusion or enchantment spells could reuse it.

## Classification

- **Primary**: `atom_widening` — missing `disbelieve_illusion` atom for illusion Study-check `onPass`
- **Secondary**: `surface_widening` — missing slot-based duration kind change (`concentration` → `permanent` at slot threshold)

Filing as `atom_widening` (most severe applicable class).
