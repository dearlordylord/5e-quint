# Tactical Adjudicator Prototype

> **THROWAWAY PROTOTYPE — not a production package.**

## Question

Can deterministic battle-rule code interpret spatial route steps without either
owning arena geometry or forcing the spatial kernel to know creature rules?

This package owns the experiment's movement profiles and converts each spatial
step into an opaque traversal weight. It imports only the public types of
`@dnd/tactical-space-prototype`; it owns no arena, placement state, route search,
scenario, or terminal code.

The `ordinary` and `crawling` profiles implement the movement arithmetic stated
in SRD 5.2.1: Difficult Terrain adds one foot of movement per foot traveled, and
crawling adds one extra foot—or two in Difficult Terrain. The
`unaffected-by-difficult-terrain` profile represents the SRD capability whose
movement is unaffected by Difficult Terrain, demonstrating that the same
geometry can be evaluated differently. See
[`Playing-the-Game.md`](../../.references/srd-5.2.1/Playing-the-Game.md) and
[`Rules-Glossary.md`](../../.references/srd-5.2.1/Rules-Glossary.md), plus the
capability wording in
[`Descriptions-E-L.md`](../../.references/srd-5.2.1/Spells/Descriptions-E-L.md).

This remains deliberately narrower than a real battle adjudicator. It does not
track Speed, movement budgets, actions, conditions, dice, or battle revisions.
