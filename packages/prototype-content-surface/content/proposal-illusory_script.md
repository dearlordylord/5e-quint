# Proposal: Illusory Script — dm_agenda classification

## Outcome

`dm_agenda` — the spell's core mechanic is entirely narrative/informational. No Dhall, JSON, or trace files produced.

## Why dm_agenda

Illusory Script creates a timed, passive perceptual illusion on written text (parchment, paper, or similar material):

- **Designated viewers** (chosen at cast time): see the real text, in the caster's hand, conveying the intended meaning.
- **All other viewers**: see unintelligible script or (optionally) an altered meaning, handwriting, and language.
- **Truesight bypass**: creatures with Truesight can read the hidden message regardless of designation.
- **Dispel consequence**: if dispelled, both the original script and the illusion disappear.
- **Duration**: 10 days, timed (no concentration).

None of these effects involve attack rolls, saving throws, damage, conditions, HP changes, action economy, or roll modifiers. The combat engine (battle.qnt / XState) has no use for "what text does this viewer perceive when reading this document." That determination is entirely narrative: the DM tells the players what they see when they look at the writing.

This is exactly the pattern described in the TAXONOMY dm_agenda criterion: "narrative, informational, or DM-decided outcomes with no deterministic mechanical resolution." It parallels Alarm's notification signal — except Alarm has an in-core trigger mechanism (physical_contact / enters_area → release) that IS worth encoding, while Illusory Script has no trigger at all. The entire spell is the informational layer.

## Spell header is encodable; payload family is not

The header fields all map cleanly to existing surface types:

| Field | Value | Surface type |
|---|---|---|
| Casting time | 1 minute, Ritual | `{ kind: "minutes", amount: 1, ritual: true }` |
| Range | Touch | `{ kind: "touch" }` |
| Components | S + M (consumed) | `{ v: false, s: true, m: "ink worth 10+ GP, which the spell consumes" }` |
| Duration | 10 days | `{ kind: "timed", value: { unit: "day", amount: 10 } }` |
| Level / School | 1 / illusion | `level: 1, school: "illusion"` |

The blocker is the mechanics payload. No existing family fits honestly:

- **`ongoing_effect`**: requires `operation` of kind `roll_modifier` or `damage_on_hit`. A passive perceptual filter is neither.
- **`activation`**: requires resolution phases (attack roll or save gate). There are none.
- **`triggered_reaction`**: not a reaction spell.
- **`anchored_trigger`**: requires a trigger event array (physical_contact, enters_area). Illusory Script has no triggering event — the illusion is always-on for the duration.

## What would be needed to bring this in-scope (not recommended)

If a future decision were made to model perceptual-layer spells in the core (e.g., for an information-tracking subsystem), the following additions would be necessary:

1. **`object` attachment variant** in `Attachment` — the illusion attaches to a physical object (the written material), not to a creature. `object` is a v4 atom but is absent from the `Attachment` union in `types.ts`. This is a `surface_widening`.

2. **`perceptual_filter` operation type** — a new variant of `OngoingOperation` that encodes viewer-category-dependent perception rules. This would carry: a designation predicate (chosen at cast), the perception for designated viewers, and the perception for undesignated viewers. No existing operation variant covers this. This is a `surface_widening`.

3. **Viewer-category predicate** — a closed filter grammar for "who counts as designated" (chosen at cast time, analogous to Alarm's `creature_exemption_list`). New surface variant.

4. **Truesight bypass rule** — a passive sense-override predicate ("creatures with Truesight see X"). No current atom covers this; it would be a new effect atom. `atom_widening`.

None of these are recommended at this time. The spell is legitimately out-of-core.
