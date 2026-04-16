# Proposal: Wind Walk — Structural Widening

## Outcome: `structural_widening`

Wind Walk cannot be honestly encoded in the current content surface. The spell's core mechanic — transforming creatures into a persistent, reversible gaseous form with a bundled state change — does not fit any existing `SpellMechanics` family.

---

## Primary Gap: No `transform_form` family

Wind Walk's structure is:

1. **Cast**: Caster + up to 10 willing creatures within 30 ft transform into gaseous form.
2. **Persistent state while in cloud form**:
   - Fly speed 300 ft + hover
   - Immunity to Prone condition
   - Resistance to Bludgeoning, Piercing, Slashing damage
   - Action restriction: only Dash or Magic allowed
3. **Revert to normal** (optional, per creature): Magic action → 1-minute transition → Stunned during transition → normal form.
4. **Re-enter cloud form** (optional, while spell persists): Magic action → 1-minute transition → cloud form.
5. **Spell-end fallback**: If in cloud form and airborne when the spell ends, creature descends 60 ft/round for 1 minute; safe landing if ground reached. Falls otherwise.

This is a **bidirectional form-change** with:
- A state bundle (not a single effect or operation)
- A transition phase with its own condition (Stunned)
- An action-gated re-entry mechanic

None of the four existing families handle this:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | `OngoingOperation` only covers `roll_modifier` and `damage_on_hit`; a form-state bundle is inexpressible |
| `activation` | One-shot with phases; no persistent form state or revert toggle |
| `triggered_reaction` | Reaction-shaped; does not apply |
| `anchored_trigger` | Planted trigger released by event; does not apply |

### Proposed new family: `transform_form`

A `transform_form` family would need at minimum:

```typescript
export type TransformFormMechanics = SpellMechanicsHeader & {
  readonly family: "transform_form";
  readonly attachment: Attachment;             // who is transformed
  readonly formEffects: ReadonlyArray<FormEffect>;  // state bundle while in form
  readonly revertMechanic: RevertMechanic;     // how to leave the form
  readonly reEnterMechanic?: ReEnterMechanic;  // how to re-enter the form (if applicable)
  readonly onSpellEnd?: OnFormEndEffect;       // what happens if still in form when spell ends
};
```

Where `FormEffect` would need to express: fly speed grants, damage resistance, condition immunity, and action restrictions.

---

## Secondary Gaps

### 1. `stunned` missing from `Condition` type

**Current**: `type Condition = "prone"`  
**Needed**: `"prone" | "stunned"` (at minimum for this spell)

**Evidence**: "Reverting takes 1 minute, during which the target has the Stunned condition."

### 2. No `grant_immunity` atom or effect

The v4 taxonomy has `grant_resistance` but no `grant_immunity`. Immunity is mechanically distinct from resistance — it completely negates an effect rather than halving it. Cannot be honestly collapsed into resistance.

**Evidence**: "it has Immunity to the Prone condition"

**Proposed widening**: New atom `grant_immunity` in the Effect category, parameterized by condition or damage type (or both).

### 3. `ActionRestriction` has no allowlist mode

**Current**: `ActionRestriction = { kind: "none" } | { kind: "exclude", actions: [...] }`  
**Needed**: `{ kind: "allow_only", actions: ReadonlyArray<StandardActionKind> }`

Cloud form permits only Dash and Magic. That is an allowlist (everything else forbidden), not a denylist. The current `exclude` variant cannot represent "everything except these is forbidden."

**Evidence**: "The only actions a target can take in this form are the Dash action or a Magic action to begin reverting to its normal form."

### 4. Fly speed + hover not available as spell effects

The v4 taxonomy includes `modify_speed` and `grant_hover` atoms, but neither is reachable via `Effect` or `OngoingOperation` in the current `SpellMechanics` surface. These atoms need to be added to the spell effect vocabulary (either as new `Effect` variants or as entries in a `FormEffect` union if the `transform_form` family is introduced).

**Evidence**: "a target has a Fly Speed of 300 feet and can hover"

### 5. No "self + choose_up_to N others" attachment mode

**Current attachment modes**: `self` | `target` (one or choose_up_to) | `area` | `mark`

Wind Walk targets "you and up to ten willing creatures" — self-inclusive multi-target selection. The `target` attachment with `choose_up_to` excludes the caster; `self` excludes all others.

**Evidence**: "You and up to ten willing creatures of your choice within range assume gaseous forms"

**Proposed widening**: New variant `{ kind: "self_and_targets", selection: TargetSelection }` or a boolean flag `includeCaster: true` on `target` attachment.

---

## Not modeled

The safe-descent fallback clause ("descends 60 feet per round for 1 minute until it lands; if it can't land after 1 minute, it falls the remaining distance") is a spell-end contingency on a specific creature state (in cloud form + airborne). This is likely `dm_agenda` territory for the descent-calculation part, though the "begin descending safely" trigger could be expressed if an `on_end_condition` shape existed.

---

## Summary of required widenings

| # | Classification | Name | Priority |
|---|---|---|---|
| 1 | `structural_widening` | `transform_form` family | Blocker |
| 2 | `surface_widening` | `stunned` in `Condition` | Secondary |
| 3 | `atom_widening` | `grant_immunity` effect atom | Secondary |
| 4 | `surface_widening` | `allow_only` variant of `ActionRestriction` | Secondary |
| 5 | `surface_widening` | Fly speed + hover as spell `Effect` variants | Secondary |
| 6 | `surface_widening` | Self-inclusive multi-target attachment | Secondary |
