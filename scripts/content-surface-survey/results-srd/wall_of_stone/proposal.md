# Proposal: Wall of Stone — structural_widening

## Outcome

`structural_widening` — No honest encoding is possible in the current surface schema.

## Why no encoding was attempted

Wall of Stone's core mechanic is **creating a persistent physical object** (the stone wall) with combat-relevant stats (AC, HP per inch, damage immunities). The current surface only supports:

- `OngoingOperation`: `roll_modifier` | `damage_on_hit`
- `Effect`: `damage` | `none`
- `SpellMechanics` families: `ongoing_effect` | `activation` | `triggered_reaction` | `anchored_trigger`

None of these can honestly represent "place a statted object in the world." Forcing this into any existing family would require lying about the mechanic (e.g., encoding as `damage_on_hit` or `grant_extra_action`), producing a false trace that obscures what the spell actually does.

## Blocking gaps (in priority order)

### 1. `create_object` — missing OngoingOperation variant (primary blocker)

**What the SRD says:**
> A nonmagical wall of solid stone springs into existence at a point you choose within range.

The v4 atom inventory includes `create_object` as an effect atom, but `types.ts` does not expose it in `OngoingOperation` or `Effect`. Until this variant exists, Wall of Stone cannot be encoded in any spell family.

**Proposed shape sketch:**
```typescript
export type CreateObjectOperation = {
  readonly kind: "create_object";
  readonly objectKind: "wall" | "structure" | "barrier"; // closed enum, widen per pressure
  readonly stats: ObjectStats;
  readonly placement: ObjectPlacement;
};
```

### 2. `object_stats` — missing surface shape for created-object properties

**What the SRD says:**
> Each panel has AC 15 and 30 Hit Points per inch of thickness, and it has Immunity to Poison and Psychic damage.

No existing surface shape carries AC, HP formula (HP per structural unit), or damage type immunities for a created object. This is distinct from creature stats and from existing `modify_ac` or `grant_resistance` effects (which modify a creature, not define a new object).

**Proposed shape sketch:**
```typescript
export type ObjectStats = {
  readonly ac: number;
  readonly hpFormula: { readonly perInchThickness: number } | { readonly fixed: number };
  readonly immunities: ReadonlyArray<DamageType>;
};
```

### 3. `placement_displacement` — automatic force_move without save or roll

**What the SRD says:**
> If the wall cuts through a creature's space when it appears, the creature is pushed to one side of the wall (you choose which side).

This displacement is automatic — no attack roll, no saving throw, no window. It fires purely from the geometric fact that the object's placement intersects a creature's space. The caster chooses which side. The v4 `force_move` atom exists but the surface has no shape for placement-triggered automatic displacement.

This is categorically different from a save_gate or an on_hit_window; mapping it to either would misrepresent the trigger and the lack of player agency on the creature's part.

**Proposed shape sketch:**
```typescript
export type PlacementDisplacement = {
  readonly kind: "placement_displacement";
  readonly casterChoosesSide: boolean;
};
```

### 4. `concentrate_to_permanent` — missing Duration variant

**What the SRD says:**
> If you maintain your Concentration on this spell for its full duration, the wall becomes permanent and can't be dispelled.

The current `Duration` union covers `instantaneous`, `concentration` (upTo), and `timed`. There is no variant expressing "concentration that converts to permanent persistence if not broken before the duration elapses." This is a meaningful lifecycle distinction: a broken-concentration outcome produces a different world state than a fully-maintained one.

**Proposed shape sketch:**
```typescript
| {
    readonly kind: "concentration_to_permanent";
    readonly upTo: DurationValue;
    readonly onFullDuration: "permanent";
  }
```

### 5. `target_reaction_escape` — missing save_gate outcome for target-Reaction-cost move

**What the SRD says:**
> On a success, it can use its Reaction to move up to its Speed so that it is no longer enclosed by the wall.

Existing `save_gate` mechanics produce caster-driven effects (`apply_condition`, `damage`, etc.). Here the on-success outcome is the **target** optionally spending its own Reaction to move — a player-facing optional action cost that originates from the target, not the caster. This requires a new outcome variant.

This gap is secondary to (1)–(4); it cannot be addressed until the broader object-creation machinery exists.

## Recommended widening order

1. Add `create_object` to `OngoingOperation` (gates everything else)
2. Add `ObjectStats` surface shape
3. Add `placement_displacement` sub-effect on `create_object`
4. Add `concentrate_to_permanent` to `Duration`
5. Add target-Reaction-cost outcome to save_gate (lower priority; affects enclosure edge case only)

## Other wall spells likely blocked by the same gap

Wall of Fire, Wall of Force, Wall of Ice, Wall of Thorns all create persistent area objects. All are blocked by gap (1). Wall of Stone is a good pressure-case to design against because it exercises the most variants simultaneously (displacement, enclosure save, permanence).
