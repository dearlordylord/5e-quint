# Widening Proposal: Modify Memory

**Outcome**: `atom_widening`
**Unit**: Modify Memory (5th-level Enchantment, SRD 5.2.1)

## Why encoding was blocked

Modify Memory has a recognizable structural frame: it is a concentration spell that opens with a save gate, applies conditions on failure, and then sustains an ongoing effect while the caster narrates the memory alteration. This frame maps to the `activation` family with a `save_gate` phase.

Four distinct gaps prevent honest encoding:

---

### Gap 1 — `apply_condition` not available as a spell Effect variant

**Classification**: `surface_widening`

The `Effect` union for spell activation phases is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

The `apply_condition` atom exists in v4 and is reachable from mastery `save_gate` riders (`SaveGateRiderResult`), but it has no path into spell activation phase effects. Modify Memory's `onFail` result is two conditions — not damage.

**Required widening**: Add an `ApplyConditionEffect` variant to the spell `Effect` union:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly conditions: ReadonlyArray<Condition>;
};

export type Effect = DamageEffect | ApplyConditionEffect | NoneEffect;
```

---

### Gap 2 — `Condition` type missing charmed and incapacitated

**Classification**: `surface_widening`

```typescript
export type Condition = "prone";
```

Only `"prone"` is present. Charmed and Incapacitated are SRD conditions inflicted on failed save. Many other spells (Charm Person, Hold Person, Hypnotic Pattern, etc.) also require Condition widening, so this gap is high-priority breadth.

**Required widening**: Add `"charmed"` and `"incapacitated"` (and other SRD conditions) to the `Condition` union as a bulk pass.

---

### Gap 3 — No `alter_memory` atom in v4

**Classification**: `atom_widening` (primary blocker)

The payload of the spell — permanently eliminating, restoring, replacing, or fabricating a creature's memory of an event — has no counterpart in the v4 atom inventory. It is distinct from every existing effect atom:

- Not `apply_condition` (conditions end when concentration ends; the memory change is permanent and fires at spell end)
- Not `modify_roll_*` (no roll is modified)
- Not `damage` / `heal` / `modify_max_hp`
- Not `move` / `force_move` / `transport_exile`
- Not `create_object` (a memory is not an object)

The memory alteration is a **permanent mutation of a creature's narrative internal state** triggered at a specific lifecycle moment (spell end, if concentration is maintained and description is complete). It has a deterministic trigger boundary (concentration drop vs. successful completion) even if the behavioral consequence is DM-adjudicated.

**Proposed atom**:

```
alter_memory
  - category: effect
  - operates on: the target creature's remembered past
  - trigger: fires at spell end (not at cast time)
  - scope: bounded by a time-window parameter (addressable memory period)
  - modes: eliminate | restore | change | create (authoring detail, not separate atoms)
  - permanent: true (persists after spell ends; removable only by Remove Curse / Greater Restoration)
```

The DM-adjudicated question of whether the memory "takes root" (language check, plausibility) is caller-owned per `ARCHITECTURE.md`. The atom records the attempt and its parameters; the runtime signals success or failure; behavioral consequences are out-of-core.

---

### Gap 4 — Conditional advantage on the save gate

**Classification**: `surface_widening`

The save text reads: *"If you are fighting the creature, it has Advantage on the save."*

This is a pre-roll modifier on the save gate's resolution, conditioned on combat state at cast time. No existing save gate surface shape carries a conditional advantage field. The closest existing shapes (`modify_roll_advantage` effect, mastery `ModifyRollAdvantageRider`) operate post-cast rather than as a save gate pre-condition.

**Required widening**: A `conditionalAdvantage` optional field on `ActivationPhase` save_gate, or a new `SaveGatePreModifier` type:

```typescript
export type SaveGatePreModifier = {
  readonly kind: "advantage_if";
  readonly condition: "in_combat_with_caster";
};

// Extended save_gate phase:
{
  readonly kind: "save_gate";
  readonly preModifier?: SaveGatePreModifier;
  // ... rest unchanged
}
```

---

### Gap 5 — Upcast: slot-based narrative scope scaling

**Classification**: `surface_widening`

The upcast effect is threshold-tier slot scaling, but what scales is not a dice expression — it is the time window of memories accessible to the spell:

| Slot | Memory window |
|------|---------------|
| 5    | 24 hours      |
| 6    | 7 days        |
| 7    | 30 days       |
| 8    | 365 days      |
| 9    | Any time      |

`DiceAmount` and its scaling variants only support dice/numeric values. No surface shape models "slot determines narrative scope parameter."

This gap affects other spells (e.g., spells that extend duration or range per slot in non-numeric ways) and should be addressed as part of a broader slot-scaling vocabulary pass. For now it can be omitted from the encoded record with a note, or represented as an opaque string-per-slot table if a new variant is added.

---

## Recommended remediation order

1. **Condition widening** (breadth pass) — unblocks many other spells
2. **ApplyConditionEffect in spell Effect** — unblocks Modify Memory and others with condition-on-save outcomes
3. **alter_memory atom** — specific to this spell and similar memory/mind-rewrite effects
4. **SaveGatePreModifier** — conditional advantage on saves (narrow, affects few spells)
5. **Narrative scope scaling** — upcast vocabulary, lower priority

---

## DM-agenda boundary note

The spell contains genuine DM-agenda:
- Whether the creature believes the modified memory ("doesn't necessarily affect how a creature behaves")
- Whether an "illogical" memory takes root ("The DM might deem a modified memory too nonsensical")
- The content of the verbal description

These stay out of core per `ARCHITECTURE.md`. The `alter_memory` atom records the mechanical frame (save gate + concentration + description window + permanent effect at end); behavioral consequences are caller-owned signals.
