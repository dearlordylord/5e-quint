## Verdict

`Potion of Gaseous Form` fits the existing `magic_item` record kind and `activation` mechanics family in broad shape:

- single-use consumable
- self-applied timed effect
- no attunement
- no concentration

I did **not** author `content/magic_item_potion_of_gaseous_form.dhall` because the current surface cannot express two required parts of the granted `Gaseous Form` effect honestly.

## Forced surface widenings

### 1. Standalone `restrict_action_set` effect

The surface taxonomy already recognizes `restrict_action_set`, but `src/surface/types.ts` does not expose it as a standalone `EffectAtom`. Right now action restriction only exists as `grant_extra_action.restriction`, which is the wrong shape here.

Why it is forced:

- `Gaseous Form` imposes an ongoing prohibition, not an extra-action exception.
- Encoding this through `grant_extra_action` would be a false trace.

Evidence:

> The target can't talk or manipulate objects, and any objects it was carrying or holding can't be dropped, used, or otherwise interacted with. Finally, the target can't attack or cast spells.

Suggested direction:

- add a standalone `EffectAtom` variant for `restrict_action_set`
- allow it in passive / ongoing / direct effect bundles the same way other persistent effect atoms are allowed

### 2. Bonus-action self-end on a timed effect

The potion changes `Gaseous Form` from concentration-based to a 1-hour timed effect, but the target can still end it early with a Bonus Action.

Why it is forced:

- current `DurationEndTrigger` variants only cover passive event-driven ends
- there is no way to encode voluntary self-termination with an action cost

Evidence:

> When you drink this potion, you gain the effect of the Gaseous Form spell for 1 hour (no Concentration required) or until you end the effect as a Bonus Action.

Suggested direction:

- add a duration/lifecycle variant for `target_ends_effect_as_bonus_action`
- or add a small shared dismiss subshape that carries an activation cost

## Secondary omitted pressure

These clauses also remain unsurfaced, but I did not use them as the main classification basis:

- entering and occupying another creature's space
- passing through narrow openings
- treating liquids as solid surfaces

Those look like movement/capability projection gaps tied to the underlying spell, but the two widenings above already block an honest encoding.
