# Round 1 Group C

Items:

- `Staff of Healing`
- `Staff of Power`
- `Wand of Fireballs`

## Short Verdict

This group fits the current graph vocabulary without forcing a new node family or edge family.

The three items all validate the same basic pattern: `magic_item_root` plus `attune` plus item-owned `charge` state, with item-local spell release and recharge cleanup. `Staff of Power` adds stronger pressure on `modify_ac`, `modify_roll`, `damage`, and `break`, but that still stays inside the existing taxonomy.

## `Staff of Healing`

Local item record:

- `reqAttune`: bard, cleric, or druid
- `charges`: `10`
- `recharge`: `1d6 + 4` at dawn
- action text: spend 1 or more charges to cast `cure wounds`, `lesser restoration`, or `mass cure wounds`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `action_window`
  - `charge`
  - `release`
- Edges that fit:
  - `roots`
  - `requires`
  - `opens_window`
  - `consumes`
  - `releases`
- What leaks:
  - the spell menu is encoded as item text plus `attachedSpells`, not as a persistent stored payload;
  - the "lose forever on last-charge 1" outcome is cleanup prose, not a distinct state family.
- Owns state/resource?
  - Yes. The item owns its own charge pool.
  - No. It does not own spell slots or stored-spell occupancy.

## `Staff of Power`

Local item record:

- `reqAttune`: sorcerer, warlock, or wizard
- `charges`: `20`
- `recharge`: `2d8 + 4` at dawn
- static bonuses: `+2` attack/damage with the staff, `+2` AC, `+2` saving throws, `+2` spell attack rolls
- charge spend cases:
  - `Power Strike` on hit for extra `1d6` force damage
  - spell casting from the staff
  - `Retributive Strike` by breaking the staff

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `charge`
  - `on_hit_window`
  - `action_window`
  - `break`
  - `release`
  - `modify_ac`
  - `modify_roll`
  - `damage`
  - `scale_damage`
- Edges that fit:
  - `roots`
  - `requires`
  - `opens_window`
  - `consumes`
  - `grants`
  - `releases`
  - `branches_on_completion`
- What leaks:
  - the partial failure state after the last charge is spent, where the staff keeps only its +2 weapon bonus, is a mixed lifecycle result but still not a new family;
  - the plane-travel escape on `Retributive Strike` is an outcome branch of `break`, not a separate node kind.
- Owns state/resource?
  - Yes. The item owns a charge pool.
  - Yes, partially. It also owns a persistent property state for the retained weapon bonus after charge exhaustion.

## `Wand of Fireballs`

Local item record:

- `reqAttune`: spellcaster
- `charges`: `7`
- `recharge`: `1d6 + 1` at dawn
- action text: spend charges to cast `fireball`, with higher levels paid for by extra charges
- failure text: on the last charge, a `1` destroys the wand

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `action_window`
  - `charge`
  - `release`
  - `scale_damage`
  - `self_break`
- Edges that fit:
  - `roots`
  - `requires`
  - `opens_window`
  - `consumes`
  - `releases`
  - `branches_on_completion`
- What leaks:
  - the charge-to-cast-level mapping is item text plus `attachedSpells`, but the graph already has enough room for the meaningful part through `scale_damage`;
  - the destruction-on-last-charge branch is cleanup, not a new runtime family.
- Owns state/resource?
  - Yes. The wand owns its own charge pool.
  - No. It does not store spells independently of the casting menu.

## Cross-Item Findings

- All three items are item-rooted spellcasting implements, not creature-rooted spell storage.
- `charge` is the only truly item-local resource family these entries force.
- `Staff of Healing` and `Wand of Fireballs` are clean charge-spend-and-release cases.
- `Staff of Power` adds the strongest mixed case, but it still fits the current `modify_*`, `damage`, `break`, and `release` vocabulary.
- None of the three needs `stores` or `stored_spell`; they expose a selectable spell menu, not a persistent spell bank.
- Recharge at dawn is just charge lifecycle management and does not justify a new resource node.

## Final Judgment

This group does not force any new node family or edge family.

The right reading is that `v2` already has the needed structure for item-local spellcasting, charge pools, recharge, and destructive cleanup. The remaining roughness is in item-specific prose and mixed lifecycle states, not in missing graph primitives.
