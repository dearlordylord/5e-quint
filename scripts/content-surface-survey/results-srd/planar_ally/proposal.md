# Proposal: Planar Ally — structural_widening

## Summary

Planar Ally is a level 6 Conjuration spell (10-min cast, instantaneous duration) that summons a free-willed extraplanar creature (Celestial, Elemental, or Fiend) to a location within 60 feet. The summoned creature is explicitly not compelled to behave any particular way; everything after its appearance is contingent on DM-adjudicated negotiation.

**Outcome: `structural_widening`**

No existing `SpellMechanics` family can encode this spell honestly. The tracer was not run because the JSON cannot be authored without fabricating a false mechanics shape.

---

## Gap 1 — Missing spell mechanics family for creature summoning

**Existing families:** `ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`

None of these fit:

- `activation` requires phases typed as `attack_roll` or `save_gate`. There is no "summon creature" phase.
- `ongoing_effect` requires a persistent `operation` (roll_modifier or damage_on_hit). Instantaneous duration and no persistent rider means this cannot apply.
- `triggered_reaction` / `anchored_trigger` — wrong causality direction entirely.

**Proposed addition:** A new spell mechanics family, e.g. `summon_creature`, with a structure like:

```
SummonCreatureMechanics = SpellMechanicsHeader & {
  family: "summon_creature";
  creatureType: "celestial" | "elemental" | "fiend" | ...;
  placement: Attachment;       // where the creature appears
  compelled: boolean;          // false for Planar Ally; true for Find Familiar etc.
  negotiation?: NegotiationGate;  // optional — present when creature is autonomous
}
```

This family covers Planar Ally and structurally related spells (Find Familiar, Animate Dead, Conjure Elemental, etc. that share the "creature appears" pattern).

---

## Gap 2 — Missing `create_companion` in spell Effect type

The surface `Effect` type is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

The v4 atom inventory (Section 9) includes `create_companion` and `command_companion`, but neither appears in the spell `Effect` union. A summoning family needs at minimum:

```typescript
export type SummonEffect = {
  readonly kind: "create_companion";
  readonly creatureType: string;      // closed enum or open string
  readonly compelled: boolean;
};

export type Effect = DamageEffect | NoneEffect | SummonEffect;
```

---

## Gap 3 — Negotiation gate (dm_agenda boundary)

After the creature appears, the SRD states:

> "When the creature appears, it is under no compulsion to behave a particular way."
> "If you are unable to agree on a price for the creature's service, the creature immediately returns to its home plane."

The negotiation outcome — whether the creature agrees, what payment is acceptable, whether the task is suitable — is driven entirely by DM judgment. The SRD provides payment guidelines ("100 GP per minute of task time") but explicitly notes: "The DM can adjust these payments based on the circumstances."

Per `ARCHITECTURE.md`, DM rulings and agenda decisions are out-of-core. The negotiation content itself cannot and should not be modeled as mechanical atoms.

However, the _gate structure_ (agree → creature performs task → returns; disagree → creature immediately returns) is a mechanical branch. It could be expressed as a new `negotiation_gate` subgraph analogous to `save_gate`, where the outcome is caller-owned (DM decides) rather than dice-resolved.

**Classification of this sub-gap:** `dm_agenda` for the negotiation content; potential `structural_widening` if the gate structure itself needs representation.

---

## Spell header fields — all encodable

These existing surface types handle the header correctly:

| Field | Value | Existing support |
|---|---|---|
| Level | 6 | `SpellLevel` |
| School | Conjuration | `SpellSchool` |
| Casting time | 10 minutes (not ritual) | `CastingTime { kind: "minutes", amount: 10, ritual: false }` |
| Range | 60 ft point | `Range { kind: "point", feet: 60 }` |
| Components | V, S | `Components { v: true, s: true, m: false }` |
| Duration | Instantaneous | `Duration { kind: "instantaneous" }` |

The gap is entirely in the mechanics family and effect type, not the header.

---

## Recommendation

1. Add a `summon_creature` spell mechanics family with optional `negotiation` metadata.
2. Add `create_companion` to the spell `Effect` union.
3. For Planar Ally specifically, the negotiation outcome remains `dm_agenda` — the model can record that negotiation occurs and the branch structure, but cannot determine the outcome.
4. This widening would also unblock encoding of: Find Familiar, Find Steed, Animate Dead, Conjure Elemental, Conjure Animals, and the full Summon-* family (Summon Beast, Summon Celestial, etc.) — all currently blocked by the same structural gap.
