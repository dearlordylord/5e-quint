# Comprehend Languages

## Verdict

`dm_agenda`

## Why it is not authored

The spell's payload is purely informational:

- "you understand the literal meaning of any language that you hear or see signed"
- "You also understand any written language that you see, but you must be touching the surface on which the words are written"
- "It takes about 1 minute to read one page of text"
- "This spell doesn't decode symbols or secret messages"

That does not currently correspond to a deterministic combat/runtime atom in the authored surface. The existing `detect` atom is about sensing closed mechanical properties like magic or thoughts, not granting language comprehension. Encoding this as a fake self-buff or as a detection effect would produce a misleading trace.

## Local precedent

The package already treats language/comprehension as caller-owned or DM agenda in authored notes:

- [content/mass_suggestion.dhall](/workspace/typescript/dnd/scripts/content-surface-survey/workers/2591716-comprehend_languages/content/mass_suggestion.dhall:45) notes that hearing/understanding language is "DM agenda per §B Comprehend Languages / Tongues".
- [content/geas.dhall](/workspace/typescript/dnd/scripts/content-surface-survey/workers/2591716-comprehend_languages/content/geas.dhall:33) treats "can't understand your command" as language/comprehension handling outside core mechanics.

## No widening proposed

No surface or atom widening is proposed from this unit alone. Adding a first-class language-comprehension model would be a deliberate scope expansion into informational/caller-facing state, not a narrow patch to an otherwise-mechanical spell family.
