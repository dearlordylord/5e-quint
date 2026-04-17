# Proposal: Staff of the Woodlands

## Outcome

`structural_widening`

## Why it does not fit honestly

The current `MagicItemRecord.mechanics` shape is:

- `PassiveMechanics`
- or `ActivatedAbilityMechanics`

`Staff of the Woodlands` needs both at once:

- passive held/wielded bonuses:
  - `+2` to attack rolls made with the staff as a Quarterstaff
  - `+2` to damage rolls made with the staff
  - `+2` to spell attack rolls while holding it
- activated charge-spending abilities:
  - cast multiple spells from the staff
  - spend 1 charge to turn the staff into a tree
  - use another Magic action while touching the tree to revert it

Encoding only the spell-table half as an `activation` item would omit major item text. Encoding only the held bonuses as `passive` would omit the charges and Tree Form. That is a structural mismatch, not just a small atom gap.

## Specific pressure points

### 1. Composite magic-item mechanics

Needed shape:

- a way for one magic item to carry both passive grants and activated abilities simultaneously

Evidence:

> "This staff has 6 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While holding it, you have a +2 bonus to spell attack rolls."

### 2. Holding/using-this-item gate

Current passive gates only cover:

- `wearing_armor`
- `wielding_weapon`
- unconditional `always`

That is not enough for:

- "while holding it" for spell attacks
- "made with it" for attacks/damage from this specific weapon-item

Needed surface widening:

- item-specific held/wielded predicate such as `holding_item` or `using_attached_weapon`

Evidence:

> "While holding it, you have a +2 bonus to spell attack rolls."

### 3. Flat bonus to weapon damage rolls

The surface has:

- `modify_roll_numeric` for attack rolls / saves / checks
- no corresponding effect atom for flat weapon damage-roll bonuses

Needed atom:

- something like `modify_damage_numeric`

Evidence:

> "...grants a +2 bonus to attack rolls and damage rolls made with it."

### 4. Tree Form item/object transformation

The Tree Form mode is not just spell access. It is item-state transformation with a persistent object in the world plus a revert action and a fall rider on revert.

Evidence:

> "You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree."

> "While touching the tree and using a Magic action, you return the staff to its normal form."

> "Any creature in the tree falls when the tree reverts to a staff."

Needed support likely includes:

- item/object transform or item-mode replacement
- planted location/object attachment
- revert action tied to the transformed object
- fall-on-revert rider

## Secondary gap

The attunement restriction is also underspecified by the current record:

> "*Staff, Rare (Requires Attunement by a Druid)*"

`MagicItemRecord` only has `requiresAttunement: boolean`; it cannot express class-restricted attunement.

## Recommendation

Classify this unit as `structural_widening`.

The first widening should be a composite magic-item mechanics shape that can carry:

- passive grants
- one or more activated ability blocks

After that, the narrower surface/atom gaps remain:

- item-specific hold/use predicates
- flat weapon damage bonus support
- Tree Form item/object transformation semantics
