# L3SPELL-06 Antimagic Field Prevention Boundary Split

## RAW And Language Check

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field` lists the remaining prevention clauses: no spellcasting, Magic actions, or magical-effect creation inside the aura; magical targeting/effect prevention for things inside it; magic item property suppression; magical area exclusion; teleportation and planar-travel blocking; temporary portal closure; ongoing spell suppression with Artifact/deity exceptions; and Dispel Magic immunity.
- `.references/srd-5.2.1/Rules-Glossary.md#Emanation` says an Emanation extends from a creature or object, moves with that origin, and the origin is included only if the creator decides otherwise.
- `UBIQUITOUS_LANGUAGE.md` distinguishes Magic Action from spellcasting: action-time spellcasting is one Magic Action use, but features and magic items can also require Magic actions.

## Current Promoted Owners

The promoted Antimagic Field runtime owners cover ongoing-spell suppression, aura action interdiction, magical-effect targeting/effect-delivery interdiction, represented self-teleport destination transit blocking, and the Dispel Magic no-effect aura exception. They consume caller-supplied aura identity and membership witnesses rather than deriving table geometry or map positions.

## Split Rows

| Clause | Owner boundary | Task row |
|---|---|---|
| Spellcasting prevention and Magic Action prevention inside the aura | Promoted by `spell.invocation-antimagic-field-action-interdiction`. The runtime consumes active aura identity plus caller-supplied aura-membership witnesses, including the Emanation origin-inclusion choice, and blocks Action spell discovery, Bonus Action spell discovery, triggered Reaction spell discovery, stale spell subjects, and supported non-spell Magic Action feature subjects for creatures inside an active aura. Automatic aura-membership derivation remains table-owned. | completed |
| Magical targeting and magical-effect delivery prevention | Promoted by `spell.invocation-antimagic-field-magical-effect-interdiction`. The runtime consumes the same active aura identity and caller-supplied aura-membership witnesses to reject selected spell targets, table-supplied spell area affected creatures, object-contact spell affected creatures, and supported non-spell Magic Action feature targets or affected creatures inside an active aura without authored-identity dispatch or duplicate target state. Automatic target, area, and geometry derivation remains table-owned. | completed |
| Magic item property suppression | Deferred until magic item records, equipment/attunement state, and property projection exist; Antimagic Field must not create a parallel item registry. | `L3-FOLLOWUP-ANTIMAGIC-MAGIC-ITEM-SUPPRESSION` |
| Magical area clipping | Closed as table-spatial derivation. Current area spells consume caller-supplied area ids, affected membership, aura membership, movement/path witnesses, and overlap facts; the runtime does not store generic map geometry, shape placement, Total Cover line tests, or partial clipped geometry. The table supplies post-Antimagic area and membership facts until a shared geometry owner exists. | runtime-detached closure |
| Represented self-teleport destination transit blocking | Promoted by `spell.invocation-self-teleport` under `L3-FOLLOWUP-ANTIMAGIC-TRANSIT-BLOCKING` for self-teleport destinations that consume caller-supplied origin/destination aura-membership witnesses. Automatic aura-membership derivation remains table-owned. | completed |
| Planar travel blocking | Closed until a planar-travel procedure, plane-location state, and table-owned plane transition witness owner exists; do not add plane metadata to self-teleport or generic teleport state. | future planar-travel owner |
| Portal closure | Deferred until portal occurrences have stable identity, placement, open/closed state, destination, and cleanup semantics. | `L3-FOLLOWUP-ANTIMAGIC-PORTAL-CLOSURE` |
| Dispel Magic immunity on the aura | Promoted by `spell.invocation-ongoing-spell-ending` with a typed Dispel Magic no-effect exception for active Antimagic Field aura targets matched by stable area identity and source combatant identity. | completed |
| Broader ongoing spell suppression | No additional represented ongoing Spell Effect family has both stable occurrence identity and source spell level beyond the already claimed spell-light, spellObjectContactDamage, and Spiritual Weapon families. The next promotion waits for another tracked occurrence owner with executable suppressed-state behavior. | `L3-FOLLOWUP-ANTIMAGIC-ADDITIONAL-TRACKED-ONGOING-SPELL-SUPPRESSION` |

## Implementation Decision

The remaining Antimagic Field blocker ledger now has no generic prevention
catch-all. Runtime-owned clauses point at promoted profile slices, while
runtime-detached clauses name the missing owner boundary. Represented
self-teleport destination transit blocking is promoted for caller-supplied
origin/destination Antimagic Field aura-membership witnesses. Planar travel
remains closed because the battle runtime has no represented planar-travel
procedure, plane-location state, or table-owned plane transition witness shape;
adding Antimagic-only plane fields would duplicate a future owner and make
invalid combinations representable.

## Reviewer Loop Notes

- RAW traceability: every split row above maps to one clause in the local SRD Antimagic Field text or the Emanation/Magic Action glossary entries.
- Ubiquitous language: the action-interdiction row uses `Magic Action` separately from spellcasting.
- Architecture and connascence: the ledger now colocates the old broad follow-up into owner-specific rows so future work can change one owner without relying on a single overloaded Antimagic task label. Completed rows name their promoted profile owners, and runtime-detached rows name their missing owner boundary rather than preserving stale follow-up labels.
