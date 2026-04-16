# Augury — Survey Outcome: `dm_agenda`

## Spell summary

- Level 2 Divination (Ritual)
- Casting time: 1 minute (or as Ritual)
- Range: Self
- Duration: Instantaneous
- Components: V, S, M (divinatory tokens worth 25+ GP)

## Why `dm_agenda`

The entire core mechanic of Augury is DM adjudication with no deterministic engine-owned resolution:

> "You receive an omen from an otherworldly entity about the results of a course of action that you plan to take within the next 30 minutes. **The DM chooses the omen** from the Omens table."

The omen table (Weal / Woe / Weal and woe / Indifference) is a narrative output chosen by the DM based on their knowledge of the fiction. There is no attack roll, saving throw, damage roll, condition application, or any mechanically deterministic effect.

### Secondary mechanic: repeated-cast degradation

> "If you cast the spell more than once before finishing a Long Rest, there is a cumulative 25% chance for each casting after the first that you get no answer."

This is also DM-owned: the degraded result is described as a "random reading" — still an omen chosen (randomly or otherwise) by the DM. The 25% probability itself is a usage-resource concern (spell slot + implicit per-Long-Rest limit), but the payload remains DM-adjudicated narrative information.

## Comparison to Alarm

Alarm (`anchored_trigger` family) was classified as borderline because its signal effect was noted as "caller-owned" — but Alarm still has a deterministic anchored event trigger (creature contacts/enters, filter fires) and a structured signal shape the engine emits. Augury has no such deterministic trigger or signal; there is no anchor, no event predicate, no structured output shape owned by the engine at all.

## What would be needed to encode Augury

Nothing in v4 taxonomy covers DM-decided narrative response. Even a hypothetical widening would not be appropriate: per ARCHITECTURE.md, "DM rulings, agenda decisions, notification surfaces, and other caller-owned facts are not core-mechanics atoms." Augury's output IS the DM ruling. A new `dm_query` family or `oracle_response` atom would belong to a caller-owned notification layer outside the core, not to the content surface.

## Verdict

`dm_agenda` — legitimately out-of-core. Do not attempt to encode.
