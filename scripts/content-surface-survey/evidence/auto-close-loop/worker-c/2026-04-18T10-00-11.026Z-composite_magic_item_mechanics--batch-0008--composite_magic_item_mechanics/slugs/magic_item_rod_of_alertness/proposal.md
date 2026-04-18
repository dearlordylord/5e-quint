## Rod of Alertness

Verdict: `structural_widening`

### What fits today

Two parts of the item already fit the current surface:

- **Alertness** can be modeled as a passive magic-item component gated by `condition = { kind = "holding_item" }`, with:
  - `modify_roll_advantage` on `ability_check` plus `skillFilter = { kind = "fixed", skills = ["perception"] }`
  - `modify_roll_advantage` on `initiative`
- **Spells** can be modeled as passive `grant_spell_access` effects while holding the rod:
  - `detect_evil_and_good`
  - `detect_magic`
  - `detect_poison_and_disease`
  - `see_invisibility`

That means the item already wants a **composite magic item**: passive held benefits plus another part for the aura.

### What does not fit honestly

**Protective Aura** is not a one-shot effect. It is an activated, persistent, item-anchored area effect:

- activation: `As a Magic action`
- anchoring: `plant the haft end of the rod in the ground`
- persistence: `after 10 minutes`
- alternate cleanup: `or when a creature takes a Magic action to pull the rod from the ground`
- area-scoped grants while active: creatures in the bright-light radius gain AC/save bonuses and invisible-creature location sensing

Current `MagicItemComponentMechanics` has no non-spell family equivalent to spell `ongoing_effect` or `anchored_trigger`. The available item families are:

- `passive`
- `activation`
- `triggered_reaction`
- `spawned_creature`
- `composite`

None of those can honestly express:

- a planted anchor that remains in place after activation
- a persistent area centered on that anchor
- ongoing benefits that apply only while creatures remain within that anchored area
- an early end caused by removing the anchor with a Magic action

### Narrowest widening that would solve it

1. Add a **non-spell ongoing family for magic items**.
   - Working name: `magic_item_ongoing_effect`
   - It should parallel spell `ongoing_effect` enough to carry:
     - activation cost
     - resource + reset cadence
     - duration
     - attachment / area
     - ongoing operations

2. Add an **item-anchored area origin**.
   - Working name: `Attachment.area.origin.fixed_anchor_or_planted_item`
   - Existing area origins (`self`, `point_within_range`, `on_primary_target`) do not capture “the planted rod remains here and the aura stays here.”

3. Add an **early-end trigger for anchor removal by action**.
   - Working name: `DurationEndTrigger.anchor_removed_by_magic_action`

### Why this is structural, not just surface

This is not just one missing field on the current activation family. The missing behavior is a whole delivery shape: **activated persistent area effect from a non-spell source**. Without that family, any encoding would either:

- lie and model the aura as a one-shot direct grant, or
- lie and center the area on the wielder instead of the planted rod.

Both would produce a misleading trace, so no content file should be authored for this unit under the current surface.
