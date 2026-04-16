# Proposal: Awaken — structural_widening

## Why no Dhall/JSON was authored

Awaken cannot be encoded honestly in the current surface. The unit's core mechanics fail at every level of the type hierarchy:

1. **No matching payload family.** The four existing spell families all assume some form of combat-resolution plumbing:
   - `ongoing_effect` — persistent operation on an attached target (not applicable)
   - `activation` — requires `ActivationPhase[]` entries, each of which must be `attack_roll` or `save_gate`; Awaken has neither
   - `triggered_reaction` — reaction-shaped spell; Awaken is not a reaction
   - `anchored_trigger` — planted sensor released by later events; Awaken is not an alarm

   Awaken is a **permanent transformation spell**: it fires once, mutates the target creature irreversibly, then ends. No existing family has this shape.

2. **Casting time in hours.** `CastingTime` supports `action | bonus_action | reaction | minutes(amount, ritual)`. 8 hours is not representable without a new `hours` variant.

3. **modify_ability_score is deferred.** The central mechanical gift of Awaken — granting Intelligence 10 to a creature that had 3 or less — requires `modify_ability_score`. The v4 taxonomy explicitly lists this as a Known Remaining Weak Spot (§12): "modify_ability_score as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope)." Awaken is the strongest pressure case yet for promoting this atom.

4. **alter_creature_type is absent.** When the target is a natural plant (non-creature), Awaken transforms it into a Plant creature — a change of creature type, not of item kind. `alter_item_kind` covers items only. A distinct atom is needed.

5. **grant_language is absent.** The target gains the ability to speak a language. `grant_proficiency` covers skill/weapon proficiency; language acquisition is mechanically distinct and has no atom.

6. **Condition type is too narrow.** `Condition` currently only includes `"prone"`. The Charmed condition applied by Awaken is a standard SRD condition with distinct mechanical effects (can't attack caster or allies, regards caster as friendly). The type needs `"charmed"` at minimum.

7. **Compound conditional expiry.** The Charmed condition lasts "30 days or until you or your allies deal damage to it." This is a compound expiry: two independent termination conditions (time elapsed OR damage event). Neither `Duration` nor `RiderExpiry` supports this shape. A new variant — something like `{ kind: "timed_or_event"; value: DurationValue; event: ... }` — is needed.

## dm_agenda boundary

The final sentence of Awaken — "the awakened creature chooses its attitude toward you" — is legitimately out-of-core per ARCHITECTURE.md. It is a DM-adjudicated narrative outcome. It should not be modeled as a mechanical atom.

Similarly, "the DM chooses statistics appropriate for the awakened Plant" is DM agenda. The core surface encodes the spell's mechanical effects; creature stat blocks are outside its scope.

## Required widenings (ordered by severity)

| Widening | Kind | Notes |
|---|---|---|
| New `permanent_transformation` (or `companion_awakening`) payload family | new_subgraph | Structural gap — the primary blocker |
| `modify_ability_score` atom | new_atom | Explicitly deferred in v4; Awaken is the leading pressure case |
| `alter_creature_type` atom | new_atom | Creature type mutation; no existing atom covers this |
| `grant_language` atom | new_atom | Language acquisition; distinct from proficiency |
| `CastingTime { kind: "hours" }` variant | new_variant | Hours-scale casting not representable |
| `Condition: "charmed"` | new_variant | Condition union too narrow |
| Compound conditional expiry | new_variant | "30 days or until damage" not representable in Duration/RiderExpiry |

## Notes on `grant_sense`

Awaken also grants "senses similar to a human's" to plant targets. `grant_sense` exists in the v4 atom inventory but is not yet implemented in `types.ts` or `tracer.ts`. This is a minor gap that can be addressed when the first unit actually requires it; it would not have been the blocking issue here.
