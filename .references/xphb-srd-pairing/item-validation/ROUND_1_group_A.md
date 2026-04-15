# Round 1 Group A

Items:

- `Attunement`
- `Wearing and Wielding Items`
- `Pearl of Power`

## Short Verdict

Group A mostly reuses the current item graph cleanly.

`Attunement` and `Wearing and Wielding Items` validate the existing `magic_item_root` procedure family, while `Pearl of Power` validates item-owned use/recharge state without forcing a new high-level family. The main residue is timing granularity (`Magic action`) and recharge cadence (`next dawn`), not a missing core node shape.

## `Attunement`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `rest_window`
  - `attunement_slot`
  - `expire`
  - `complete`
- Edges that fit:
  - `requires`
  - `opens_window`
  - `consumes`
  - `persists_until`
  - `branches_on_completion`
- What leaks into prose:
  - the short-rest focus is a procedure, not item metadata
  - interruption, distance, death, replacement, and voluntary ending are cleanup rules, not separate item kinds
  - the duplicate-copy restriction is still a rule on attunement eligibility, not a second state machine
- Ownership:
  - the item does not own the slot pool
  - the creature owns attunement capacity, and the item participates as the bond target
- Verdict:
  - this is a clean fit for the existing attunement lifecycle
  - no new node family is forced

## `Wearing and Wielding Items`

- Nodes that fit:
  - `magic_item_root`
  - `item`
  - `object`
  - `location`
  - `weapon`
  - `grant`
  - `suppress`
- Edges that fit:
  - `attaches_to`
  - `requires`
  - `modifies`
- What leaks into prose:
  - the intended-fashion rule is occupancy logic, not item-local state
  - rings, armor, cloaks, gloves, bracers, and footwear are slot constraints, not separate item-state families
  - paired-item benefits are a wear-state constraint, not a new activation subsystem
- Ownership:
  - the wearer/wielder owns the occupancy state
  - the item only reads that occupancy to decide whether its properties are live
- Verdict:
  - this fits the current graph as legality and eligibility gating
  - no new node family is forced

## `Pearl of Power`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `item`
  - `action_window`
  - `use_count`
  - `spell_slot`
  - `restore`
- Edges that fit:
  - `requires`
  - `attaches_to`
  - `opens_window`
  - `consumes`
  - `grants`
- What leaks into prose:
  - the 2024 text’s `Magic action` is finer than the current `action_window` label
  - the `next dawn` reset is a recharge cadence, not just a one-off effect
  - the slot restored is character-owned; the item only owns the once-per-dawn availability
- Ownership:
  - the item owns the use lock / recharge state
  - the character owns the spell slot being restored
- Verdict:
  - this is item-owned resource state, not character-owned spell state
  - it fits the existing graph if `action_window` is allowed to stand in for the timing hook
  - the item does not force a new core family, but it does expose the weakest timing residue in Group A

## Cross-Item Findings

1. `Attunement` and `Wearing and Wielding Items` are both eligibility procedures, but they are not the same thing. Attunement is a creature-item bond with cleanup; wear/wield is occupancy and fit.
2. `Pearl of Power` is the only Group A item that clearly owns a runtime resource. The item owns the once-per-dawn use state; the restored spell slot is downstream character state.
3. The group splits cleanly along ownership lines:
   - attunement capacity is creature-side;
   - wear/wield occupancy is wearer-side;
   - Pearl recharge is item-side.
4. The residue is typed detail, not a missing architecture branch. `Magic action` and `next dawn` are real, but they look like refinements of existing nodes rather than proof of a new node family.

## New Node / Edge Family

Group A does **not** force a new node or edge family.

If later validation wants exact support for `Magic action` or explicit dawn-based recharge cadence, that would be a refinement pass on the existing action/recharge vocabulary, not evidence that Group A needs a new core family now.

Files edited:

- `.references/xphb-srd-pairing/item-validation/ROUND_1_group_A.md`
