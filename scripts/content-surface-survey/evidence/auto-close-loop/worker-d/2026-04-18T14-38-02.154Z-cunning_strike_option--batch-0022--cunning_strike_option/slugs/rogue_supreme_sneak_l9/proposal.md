`Supreme Sneak` does not fit the current authored surface honestly.

Why it does not fit:

- The unit is a `class_feature`, but its mechanic is not a standalone activation and not a plain always-on numeric/status grant.
- The feature's primary effect is to unlock a new named option inside another subsystem: Cunning Strike.
- The unlocked option has its own internal cost (`Cost: 1d6`) and modifies the normal break condition of the Hide action's Invisible condition.
- The rider is conditional on a future board-state check at end of turn: the invisibility is preserved only if the rogue ends the turn behind Three-Quarters Cover or Total Cover.

Why existing shapes are insufficient:

- `PassiveMechanics.grants` can grant simple persistent effects, proficiencies, feats, spell access, and similar capability grants, but there is no atom for granting a new Cunning Strike option.
- Existing duration `earlyEnd` triggers belong to the effect that owns the duration. `Supreme Sneak` instead alters another rule source's break behavior: the Hide action's Invisible condition.
- There is no current atom/subgraph for "an attack would normally end a condition, but this paid rider postpones that break and keeps the condition only if a later end-of-turn predicate is true."
- There is also no existing surface resource/cost shape for spending `1d6` from Sneak Attack as an option cost inside another feature's resolution.

Recommended widening:

1. Add a capability-grant atom such as `grant_cunning_strike_option`.
   It should be usable from `PassiveMechanics` on a `class_feature`.
   It should carry the option name, the internal option cost, and the option's effect payload.

2. Add a subgraph for conditional retention of an existing condition sourced elsewhere.
   Minimal shape needed here:
   - precondition: bearer currently has Hide action Invisible condition
   - trigger: this attack would end that condition
   - override: do not end immediately
   - checkpoint: end of turn
   - predicate: bearer is behind Three-Quarters Cover or Total Cover
   - outcome: retain condition if predicate holds, otherwise end it

Evidence from unit text:

> You gain the following Cunning Strike option.
>
> Stealth Attack (Cost: 1d6). If you have the Hide action's Invisible condition, this attack doesn't end that condition on you if you end the turn behind Three-Quarters Cover or Total Cover.
