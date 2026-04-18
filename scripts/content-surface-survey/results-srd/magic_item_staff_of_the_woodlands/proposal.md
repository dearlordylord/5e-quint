# Proposal: magic_item_staff_of_the_woodlands

**Outcome:** `surface_widening`

## What encoded cleanly

The Staff of the Woodlands fits the composite magic-item pattern established by Staff of Power:

- **Passive part** (`condition: holding_item`): +2 to weapon attack rolls made with the staff (`modify_roll_numeric` on `attack_roll` with `specific_item` weapon filter), +2 to weapon damage rolls (`modify_damage_numeric` with same filter), +2 to spell attack rolls (`modify_roll_numeric` on `spell_attack_roll`). The `spell_attack_roll` RollKind was added precisely for this item per the types.ts comment.
- **Activation part** (`condition: holding_item`): 6-charge pool, dawn recharge of 1d6, eight `grant_spell_access` entries with `charge_cast` mode (Animal Friendship 1, Awaken 5, Barkskin 2, Locate Animals or Plants 2, Pass without Trace 2, Speak with Animals 1, Speak with Plants 3, Wall of Thorns 6 charges). Spell-level-to-charge mapping is exact for all spells.
- **Destruction**: `last_charge_roll` (d20, destroys on 1). ✓

Typecheck passes; tracer emits a complete graph.

## What is missing: Tree Form

**SRD text:**
> You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree. The tree is 60 feet tall and has a 5-foot-diameter trunk, and its branches at the top spread out in a 20-foot radius. The tree appears ordinary but radiates a faint aura of Transmutation magic that can be discerned with the Detect Magic spell. While touching the tree and using a Magic action, you return the staff to its normal form. Any creature in the tree falls when the tree reverts to a staff.

### Gap 1: Per-effect charge cost on non-spell effects

The `alter_item_kind` atom (target: tree form) exists in the surface but carries no charge cost. The `charge_cast` mode on `grant_spell_access` handles per-spell charge costs, but there is no analogous mechanism for other `EffectAtom` variants.

Both Tree Form and the 8 spell accesses draw from the **same** 6-charge pool. If Tree Form were placed in a separate composite part, it would get its own disconnected pool — structurally wrong. If folded into the spell activation part's `direct` phase as a plain `alter_item_kind` effect, the 1-charge cost is invisible: the frame presents it as free relative to the activation's resource bookkeeping.

**Proposed widening:** An optional `chargeCount: number` field on `EffectAtom` entries within an `ActivationPhase.direct.effects` list, or a wrapper type `{ chargeCount: number, effect: EffectAtom }`, so non-spell effects can declare their draw on the shared pool. The `charge_cast` pattern on `grant_spell_access` already proves the per-effect variable-cost idiom; this extends it to all atoms.

### Gap 2: Transformed-state equipment predicate for Tree Form revert

**SRD text:**
> While touching the tree and using a Magic action, you return the staff to its normal form.

The revert activation is gated on the item being in tree form (transformed state) and the wielder physically touching it. The existing `EquipmentPredicate` variants (`holding_item`, `wearing_item`, `wielding_weapon`, etc.) cover nominal wear/hold states but cannot express an item's current transformation state. A new variant — e.g., `{ kind: "item_in_form", form: string }` — would be needed.

### Gap 3: Environmental aftermath (DM-agenda)

> Any creature in the tree falls when the tree reverts to a staff.

This is DM-side adjudication: which creatures are "in the tree" and the resulting fall are environmental/positional consequences. Not a gap in the surface — legitimately DM-agenda, outside the core mechanics model.

Similarly, the tree's Transmutation magic aura (visible via Detect Magic) is a narrative property carried by `alter_item_kind`'s `newKind` string — no surface widening needed for the aura itself.

## Classification

`surface_widening` — the family, kind, and all required atoms (`alter_item_kind`, composite mechanics) exist; what's missing is a per-effect charge cost mechanism and a transformed-state equipment predicate variant for the Tree Form sub-ability.
