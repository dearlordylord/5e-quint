# Wind Walk — Surface Widening Proposal

**Outcome:** `atom_widening`  
**Unit:** Wind Walk (level 6 Transmutation, SRD 5.2.1)

## What Encodes Cleanly

The cloud form's passive grants all typecheck and trace without error:
- `grant_speed { speedKind = "fly", feet = 300, hover = true }` — fly speed with hover
- `grant_condition_immunity { condition = "prone" }` — immunity to Prone
- `grant_resistance { damageType = "bludgeoning/piercing/slashing" }` (×3) — physical resistance

The `CastingTime { kind = "minutes", amount = 1, ritual = false }` variant encodes the 1-minute casting time correctly. The `choose_up_to: 11` target selection approximates "you and up to ten willing creatures" (no "self plus N" attachment mode exists, but this is an acceptable approximation used elsewhere).

## Missing Atoms

### 1. `restrict_action_set` as a standalone EffectAtom

**RAW:** "The only actions a target can take in this form are the Dash action or a Magic action to begin reverting to its normal form."

Wind Walk restricts affected creatures' action economy to a strict subset: only Dash and Magic. The existing surface has `ActionRestriction` (`{ kind: "exclude", actions: [...] }`) but only as a parameter on `grant_extra_action` — it is not a standalone `EffectAtom`. A `restrict_action_set` EffectAtom would allow direct-grant phases to impose action-economy constraints on targets.

**Proposed shape:**
```typescript
| {
    readonly kind: "restrict_action_set";
    readonly allowedOnly: ReadonlyNonEmptyArray<StandardActionKind>;
  }
```

This is distinct from `grant_extra_action.restriction` (which narrows a *bonus* action, not the creature's *existing* action menu). Wind Walk shrinks the existing menu, not adds to it.

**Precedents:** Hypnotic Pattern's Incapacitated + Speed 0 combination already restricts what creatures can do; Wind Walk's action restriction is stronger and explicit.

### 2. Timed mode-switch with transition condition (`timed_mode_switch_with_condition`)

**RAW:** "Reverting takes 1 minute, during which the target has the Stunned condition. Until the spell ends, the target can revert to cloud form, which also requires a Magic action followed by a 1-minute transformation."

Wind Walk allows voluntary bidirectional mode switching between cloud form and normal form. Each switch costs a Magic action plus a 1-minute transformation window, during which the Stunned condition applies. This is not a standard CastTimeEffectModeChoice:

- `CastTimeEffectModeChoice.allowsMidDurationSwitchAs = "magic_action"` models an *instant* mode switch.
- Wind Walk's switch is *staged*: Magic action initiates → 1-minute transformation window → Stunned during window → new form active.

**No current surface shape captures:**
1. A player-triggered mid-duration transformation with a timed delay
2. A condition applied only during the transformation window (not the resulting form)
3. Bidirectional toggleability for the remaining spell duration

This likely requires a new subgraph shape, possibly:
```typescript
type MidDurationModeTransition = {
  readonly cost: OngoingCasterActionCost;
  readonly transitionDuration: DurationValue;
  readonly transitionCondition?: Condition;
  readonly resultMode: "normal_form" | string;
};
```

### 3. `fall_on_end` EffectAtom

**RAW:** "If a target is in cloud form and flying when the effect ends, the target descends 60 feet per round for 1 minute until it lands, which it does safely. If it can't land after 1 minute, it falls the remaining distance."

The v4 taxonomy lists `fall_on_end` as an effect atom (TAXONOMY_atoms_graph.md §9), but it is absent from the current `types.ts` EffectAtom union. Wind Walk is a second pressure case (Fly spell also has a "target falls if still aloft" clause, though that was omitted from fly.dhall as DM agenda). Wind Walk's version is richer: it specifies a safe descent rate (60 ft/round), a safe landing window (1 minute), and a fallback fall.

**Proposed shape:**
```typescript
| {
    readonly kind: "fall_on_end";
    readonly safeDescentFeetPerRound?: number;
    readonly safeLandingWindowSeconds?: number;
  }
```

The `fly.dhall` precedent notes the fall clause as "DM agenda" for that spell (geometry/physics), but Wind Walk makes the rate and timing explicit in RAW, which argues for surface-level encoding.

## Summary Table

| Gap | Classification | Priority |
|-----|---------------|----------|
| `restrict_action_set` standalone EffectAtom | `atom_widening` | High — core cloud-form constraint |
| Timed mode-switch with transition condition | `atom_widening` / `structural_widening` | High — core reversion mechanic |
| `fall_on_end` EffectAtom (from v4 taxonomy) | `atom_widening` | Low — secondary clause |
