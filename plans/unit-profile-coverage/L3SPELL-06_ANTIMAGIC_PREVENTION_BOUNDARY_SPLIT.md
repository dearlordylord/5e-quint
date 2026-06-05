# L3SPELL-06 Antimagic Field Prevention Boundary Split

## RAW And Language Check

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field` lists the remaining prevention clauses: no spellcasting, Magic actions, or magical-effect creation inside the aura; magical targeting/effect prevention for things inside it; magic item property suppression; magical area exclusion; teleportation and planar-travel blocking; temporary portal closure; ongoing spell suppression with Artifact/deity exceptions; and Dispel Magic immunity.
- `.references/srd-5.2.1/Rules-Glossary.md#Emanation` says an Emanation extends from a creature or object, moves with that origin, and the origin is included only if the creator decides otherwise.
- `UBIQUITOUS_LANGUAGE.md` distinguishes Magic Action from spellcasting: action-time spellcasting is one Magic Action use, but features and magic items can also require Magic actions.

## Current Promoted Owners

The promoted Antimagic Field runtime owners cover ongoing-spell suppression, aura action interdiction, magical-effect targeting/effect-delivery interdiction, and represented self-teleport destination transit blocking. They consume caller-supplied aura identity and membership witnesses rather than deriving table geometry or map positions.

## Split Rows

| Clause | Owner boundary | Task row |
|---|---|---|
| Spellcasting prevention and Magic Action prevention inside the aura | Needs typed aura-membership witnesses, including the Emanation origin-inclusion choice, plus one cross-action interdiction owner for action spells, Bonus Action spells, reaction spells, and non-spell Magic actions. | `L3-FOLLOWUP-ANTIMAGIC-AURA-ACTION-INTERDICTION` |
| Magical targeting and magical-effect delivery prevention | Needs a generic magical-effect targeting/effect-delivery owner that consumes aura-membership facts for selected targets and affected things. | `L3-FOLLOWUP-ANTIMAGIC-MAGICAL-TARGETING-AND-EFFECT-INTERDICTION` |
| Magic item property suppression | Deferred until magic item records, equipment/attunement state, and property projection exist; Antimagic Field must not create a parallel item registry. | `L3-FOLLOWUP-ANTIMAGIC-MAGIC-ITEM-SUPPRESSION` |
| Magical area clipping | Needs a shared area geometry overlap/clipping owner; current area spells consume caller-supplied area and membership witnesses rather than storing map geometry. | `L3-FOLLOWUP-ANTIMAGIC-MAGICAL-AREA-CLIPPING` |
| Represented self-teleport destination transit blocking | Promoted by `L3-FOLLOWUP-ANTIMAGIC-TRANSIT-BLOCKING` for self-teleport destinations that consume caller-supplied origin/destination aura-membership witnesses. Automatic aura-membership derivation remains table-owned. | completed |
| Planar travel blocking | Closed until a planar-travel procedure, plane-location state, and table-owned plane transition witness owner exists; do not add plane metadata to self-teleport or generic teleport state. | future planar-travel owner |
| Portal closure | Deferred until portal occurrences have stable identity, placement, open/closed state, destination, and cleanup semantics. | `L3-FOLLOWUP-ANTIMAGIC-PORTAL-CLOSURE` |
| Dispel Magic immunity on the aura | Needs a typed Dispel Magic exception once Antimagic aura occurrences are otherwise targetable or visible to magical-effect targeting. | `L3-FOLLOWUP-ANTIMAGIC-DISPEL-IMMUNITY` |
| Broader ongoing spell suppression | Extend the current suppression owner one represented ongoing Spell Effect family at a time, preserving non-deletion, ticking duration, and Artifact/deity exceptions. | `L3-FOLLOWUP-ANTIMAGIC-BROADER-ONGOING-SPELL-SUPPRESSION` |

## Implementation Decision

Task 13 promoted represented self-teleport destination transit blocking for caller-supplied origin/destination Antimagic Field aura-membership witnesses. Planar travel remains closed because the battle runtime has no represented planar-travel procedure, plane-location state, or table-owned plane transition witness shape; adding Antimagic-only plane fields would duplicate a future owner and make invalid combinations representable.

## Reviewer Loop Notes

- RAW traceability: every split row above maps to one clause in the local SRD Antimagic Field text or the Emanation/Magic Action glossary entries.
- Ubiquitous language: the action-interdiction row uses `Magic Action` separately from spellcasting.
- Architecture and connascence: the ledger now colocates the old broad follow-up into owner-specific rows so future work can change one owner without relying on a single overloaded Antimagic task label.
