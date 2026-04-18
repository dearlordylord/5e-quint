## Rod of Alertness

Outcome: `surface_widening`

The unit mostly fits the current `magic_item` surface as a `composite`:

- passive `holding_item` grants for Advantage on Initiative and Wisdom (Perception)
- passive `grant_spell_access` for the four named spells
- activated once-per-dawn protective aura with a 60-foot friendly area and `+1 AC` / `+1 saving throws`

The missing piece is the aura rider:

> "While in that Bright Light, you and your allies ... can sense the location of any Invisible creature that is also in the Bright Light."

Why this is a surface gap, not a new atom:

- The closest existing atom is `grant_sense`.
- But `grant_sense` only models broad sense kinds (`darkvision`, `blindsight`, `tremorsense`, `truesight`) with a range.
- Using `grant_sense.truesight` here would be dishonest. The rod does not grant general truesight or broad invisible-perception; it grants a narrower perception override limited to Invisible creatures that are also inside the aura's bright-light area.

Suggested widening:

- Add a narrower `grant_sense` variant or qualifier for "locate invisible creatures in shared area / bright light" rather than overloading `truesight`.

Notes:

- The emitted Bright/Dim Light itself was treated as caller-owned framing for the area attachment rather than a separate mechanical effect atom.
- The generated JSON includes the activation's 10-minute `duration`, but the current tracer output does not show that duration for magic-item `activation` mechanics. That is a trace discrepancy, not the reason for the widening verdict.
