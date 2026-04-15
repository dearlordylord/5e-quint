# Round 1 Group C

Spells:

- `Haste`
- `Hold Person`
- `Hunter's Mark`
- `Invisibility`
- `Magic Weapon`

This group is useful because it shows the current atoms graph can describe the outer shell of a spell, but it still lies about several spell-internal rule shapes. The main gap is not casting time or concentration; it is the missing vocabulary for stat-specific rewrites, stateful marks, and self-ending triggers.

## `Haste`

Source: [Descriptions-E-L.md:1091-1100](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md:1091)

- Atoms used: `spell_root`, `choose`, `target`, `grant`, `concentrate`, `duration_window`.
- Relations used: `roots`, `requires`, `attaches_to`, `grants`, `persists_until`.
- What leaks into prose: doubled Speed, +2 AC, Advantage on Dexterity saving throws, the extra action, and the restricted action subset (`Attack` one attack only, `Dash`, `Disengage`, `Hide`, `Utilize`). The lethargy end effect is also prose-only.
- Verdict: strengthens `grant` and `persist_until`, but falsifies the idea that `modify_roll` and `grant` are enough for buff spells. The taxonomy needs explicit atoms for `modify_speed`, `modify_ac`, `grant_extra_action`, and `restrict_action_set`. Right now it flattens the spell into "some bonuses plus a duration," which is wrong.

## `Hold Person`

Source: [Descriptions-E-L.md:1247-1255](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md:1247)

- Atoms used: `spell_root`, `choose`, `target`, `apply_condition`, `turn_end_window`, `concentrate`, `duration_window`.
- Relations used: `roots`, `requires`, `attaches_to`, `modifies`, `persists_until`.
- What leaks into prose: the Humanoid-only target filter, the repeat-save loop at the end of each turn, and the "ending the spell on itself" behavior on a success.
- Verdict: strengthens `apply_condition` and `turn_end_window`, but falsifies `branches_on_completion` as currently written. A single completion branch is not enough; the taxonomy needs an explicit repeat-save / retry relation or it will keep pretending this is just "paralyze for a minute."

## `Hunter's Mark`

Source: [Descriptions-E-L.md:1275-1288](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md:1275)

- Atoms used: `spell_root`, `bonus_action_window`, `target`, `grant`, `concentrate`, `duration_window`.
- Relations used: `roots`, `opens_window`, `attaches_to`, `grants`, `persists_until`, `branches_on_completion`.
- What leaks into prose: the quarry mark itself, the extra Force damage on hit, the Perception/Survival help to find the target, and the ability to move the mark when the target drops to 0 HP.
- Verdict: strengthens `bonus_action_window` and `grant`, but falsifies the attachment model as currently written. This spell wants a stateful `mark` or `designation` relation, plus a `move_mark`-style transfer. Without that, the taxonomy is pretending the mark is just flavor text on top of a buff.

## `Invisibility`

Source: [Descriptions-E-L.md:1466-1474](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md:1466)

- Atoms used: `spell_root`, `choose`, `target`, `apply_condition`, `concentrate`, `duration_window`.
- Relations used: `roots`, `requires`, `attaches_to`, `modifies`, `persists_until`.
- What leaks into prose: the early end conditions after the target makes an attack roll, deals damage, or casts a spell.
- Verdict: strengthens `apply_condition`, but falsifies the lifecycle model if `expire` is treated as time-only. The taxonomy needs a self-breaking / action-triggered termination relation. Otherwise it misses the real rule: the spell is not just concentrated; it is conditionally fragile.

## `Magic Weapon`

Source: [Descriptions-M-P.md:117-125](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md:117)

- Atoms used: `spell_root`, `bonus_action_window`, `target`, `item`, `grant`, `duration_window`.
- Relations used: `roots`, `requires`, `attaches_to`, `grants`, `persists_until`.
- What leaks into prose: the weapon becoming a magic weapon, the distinction between a nonmagical weapon and a magic one, and the scaling of the bonus to +2 and +3 at higher slots.
- Verdict: strengthens `item` attachment and `grant`, but falsifies the current effect vocabulary because item-kind transformation is not represented. `modify_roll` is not enough here. The taxonomy needs a way to say that an object changes rules classification, not just that it gains a numeric bonus.

## Cross-Spell Findings

- The taxonomy can cover cast-time, concentration, and generic duration, but it is too coarse for spell-internal state changes.
- `grant` is currently overused as a catch-all; it hides distinct effects for speed, AC, action access, damage, and item state.
- `Hold Person` and `Invisibility` both show that termination logic is not just `expire`; the graph needs explicit self-breaking or retry semantics.
- `Hunter's Mark` shows that stateful marks are not representable as plain attachments. The graph needs a dedicated mark/designation atom or relation.
- `Magic Weapon` shows that item transformation is not the same thing as a numeric modifier. The current taxonomy is lying if it treats them as equivalent.
- Overall, this group strengthens the idea that the taxonomy must become a real graph of typed relations, not just a bucket list of spell families.

Edited file:
- `.references/xphb-srd-pairing/spell-validation/ROUND_1_group_C.md`
