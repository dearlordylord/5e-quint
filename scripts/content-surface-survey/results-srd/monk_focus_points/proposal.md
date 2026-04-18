# Proposal: Monk Focus Points

**Unit slug:** `monk_focus_points`
**Outcome:** `structural_widening`

## Why this unit cannot be encoded

Focus Points is a composite class feature with four sub-features (the pool itself plus Flurry of Blows, Patient Defense, Step of the Wind). The blocking gap is architectural: the current surface has no way to define a named resource pool and have multiple independent activations draw from it. The `CompositeClassFeatureMechanics` family combines multiple `ClassFeatureComponentMechanics` parts, but each part owns its own `resource` and `resetCadence` — there is no cross-part pool reference.

A dishonest encoding (each sub-feature with its own `use_count cap=1, resetCadence short_or_long_rest`) would misrepresent the rules: a Monk with 5 Focus Points can use Flurry of Blows 3× and Patient Defense twice in a single fight. With independent use-counts each would be limited to one use per rest.

Secondary gaps (would block encoding even if the shared pool were resolved):

### 1. No atom for granting a standard action as a Bonus Action

Patient Defense's free tier: "You can take the Disengage action as a Bonus Action."
Step of the Wind's free tier: "You can take the Dash action as a Bonus Action."

`grant_extra_action` grants an additional main-action-economy Action; it does not grant a specific standard action usable as a Bonus Action. This is a distinct slot in the economy (bonus action vs. action) with a specific standard-action payload.

**Proposed atom:** `grant_bonus_action_standard_action { action: StandardActionKind }`

### 2. No atom for bonus-action unarmed strikes (Flurry of Blows)

"You can expend 1 Focus Point to make two Unarmed Strikes as a Bonus Action."

This is a multi-strike Bonus Action limited to Unarmed Strikes. The existing atoms don't cover this:
- `grant_extra_action` grants a full extra Action (not a Bonus Action), and not Unarmed Strike-specific
- `scale_attack_count` widens the existing Attack action's count — does not grant a Bonus Action attack sequence

**Proposed atom:** `grant_bonus_action_unarmed_strikes { count: number }` or a more general `grant_bonus_action_attacks { kind: "unarmed_strike" | "weapon", count: number }`

### 3. No atom for doubled jump distance (Step of the Wind)

"Your jump distance is doubled for the turn."

Jump distance is a distinct movement property in SRD 5.2.1 (PHB Athletics rules, Running Jump/Standing Jump). `modify_speed` adjusts Walking Speed; `grant_speed` adds a speed mode; neither covers the jump multiplier.

**Proposed atom:** `modify_jump_distance { multiplier: number }` or `modify_jump_distance { kind: "double" }`

### 4. Optional-expenditure two-tier pattern (Patient Defense, Step of the Wind)

Both features offer: free version (BA, no FP) OR enhanced version (BA + 1 FP). The current `ActivatedAbilityMechanics` represents a single activation cost and effect — there is no "pay more for the enhanced version" branching pattern. A new surface shape is needed to express "same activation slot, optional additional cost unlocks additional effects."

## Shared Pool: Required Architectural Change

The minimum needed: a top-level `SharedResourcePool` that can be named (`focus_points`) and referenced from multiple activations by name. The pool carries:
- `cap: UseCountCap` (scales with monk class level — `threshold_tiers` or `linear_per_level` with `axis: "class"`)
- `resetCadence: RestResetCadence` (`short_or_long_rest`)
- Save DC formula (8 + Wis mod + PB) — referenced by sub-features that call for saves

Sub-features then declare `consumesFrom: "focus_points"` (or similar) with a cost in points, rather than owning their own resource.

This pattern would also unify with Sorcery Points (Sorcerer), Ki Points (old Monk), Bardic Inspiration dice, and other class resource pools that multiple sub-features draw from.
