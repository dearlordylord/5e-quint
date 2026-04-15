# Round 1 Group D

Items:

- `Wand of Magic Missiles`
- `Wand of Web`
- `Instrument of the Bards`

## Short Verdict

This group fits the current taxonomy without forcing a new node family.
It confirms the existing split between `charge`-based implements and `use_count`-style per-spell reuse limits.
The only residue is timing prose and per-spell reset wording, not a missing structural kind.

## `Wand of Magic Missiles`

- Fits nodes:
  - `magic_item_root`
  - `activate`
  - `action_window`
  - `charge`
  - `choose`
  - `commit`
  - `release`
- Fits edges:
  - `roots`
  - `opens_window`
  - `consumes`
  - `grants`
- What leaks into prose:
  - the item’s scaling is charge-to-slot-level conversion, which is really spell-side scaling once activation happens
  - the “last charge destroys the wand” rider is cleanup prose, not a new state family
  - the dawn recharge timing is a resource reset detail, not a separate graph kind
- State / resource ownership:
  - yes, the wand owns a `charges: 7` pool in `items.json`
  - 5etools also records `recharge: dawn` and `rechargeAmount: 1d6 + 1`
  - `attachedSpells.charges` marks the spell as item-owned release content, not stored payload

## `Wand of Web`

- Fits nodes:
  - `magic_item_root`
  - `attune`
  - `activate`
  - `action_window`
  - `charge`
  - `choose`
  - `commit`
  - `release`
- Fits edges:
  - `roots`
  - `requires`
  - `opens_window`
  - `consumes`
  - `grants`
- What leaks into prose:
  - the `by a spellcaster` attunement predicate is a gate on `attune`, not a new legality bucket
  - the item’s save DC is part of the activation payload, not owned state
  - the dawn recharge text is the same reuse timing residue as the other wand
- State / resource ownership:
  - yes, the wand owns a `charges: 7` pool
  - 5etools records `reqAttuneTags.spellcasting = true`, so the attunement gate is stricter than the generic wand shape
  - `attachedSpells.charges` again shows release-from-item, not stored-spell behavior

## `Instrument of the Bards`

- Fits nodes:
  - `magic_item_root`
  - `attune`
  - `activate`
  - `action_window`
  - `choose`
  - `commit`
  - `use_count`
  - `modify_roll`
- Fits edges:
  - `roots`
  - `requires`
  - `opens_window`
  - `grants`
  - `consumes`
  - `modifies`
- What leaks into prose:
  - the item’s once-per-dawn restriction is per-spell reuse state, not a pooled charge counter
  - the four spell options are a fixed attached spell list, but the graph still has to read the limit from prose or item metadata
  - the charm-save disadvantage rider is a transient modifier on a spell cast, not a durable item state
  - the seven named variants are packaging in `items.json`, not a different graph family
- State / resource ownership:
  - yes, but in a narrower way than the wands
  - `attachedSpells.daily` indicates item-local daily availability for the attached spells
  - this is better read as per-spell `use_count` ownership than as a charge pool or stored-spell container
  - the item owns cast availability, not payload storage

## Cross-Item Findings

- All three items are `magic_item_root` cases with action-based activation.
- Two items use a numeric `charge` pool; one uses per-spell daily `use_count` behavior.
- None of the three requires `stores` / `stored_spell` / `releases` in the `Ring of Spell Storing` sense.
- The shared shape is “item-rooted spell release with item-local resource ownership,” not a new family of item storage.
- `attune` remains emergent from the existing graph; these items only add predicates on attunement, not a new legality node.

## Conclusion

Group D does not force any new node or edge family.
It does show that the taxonomy should keep item-local resource ownership distinct from stored-spell payloads, and it should treat per-spell daily reuse as a resource pattern, not as a separate item kind.
