`Wand of Wonder` fits the existing top-level `magic_item` kind and the `activation` mechanics family for its charge economy:

- 7-charge pool
- `holding_item` gate
- Magic action activation
- dawn recharge `1d6 + 1`
- last-charge destruction roll

The blocker is the payload, not the item shell.

## Why It Does Not Fit Cleanly

The wand does not grant a fixed spell list or a player-chosen mode. It resolves by a mandatory random `1d100` table, and several entries then branch again with nested random rolls (`1d10`, `1d4`) into different spells or forms.

The current surface has:

- player choice (`choose`, `CastTimeChoice`, `CastTimeEffectModeChoice`)
- fixed granted spells (`grant_spell_access`)
- direct/save/attack resolution

It does not have:

- random weighted table dispatch at activation time
- nested random dispatch inside a branch

Encoding the wand as a list of `grant_spell_access` effects would be false, because the wielder does not choose which effect occurs.

## Required Widenings

### 1. Random table dispatch

Classification: `atom_widening`

The surface needs a random-resolution subgraph or atom that can express weighted table outcomes and nested rerolls.

Evidence:

> "That location becomes the point of origin of a spell or other magical effect determined by rolling on the Wand of Wonder Effects table."

> "Roll 1d10 to determine the spell"

> "Roll 1d4 to determine which creature appears"

> "Roll 1d4 to determine the target's new form"

### 2. Granted-spell range override

Classification: `surface_widening`

The wand overrides spell range for spells it casts. `grant_spell_access` currently supports `dcOverride`, `areaOverride`, and `targetRestriction`, but not range override.

Evidence:

> "If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand."

### 3. Obscurement-area environmental effects

Classification: `atom_widening`

Two table entries create timed areas whose mechanical payload is light/heavy obscurement. No current effect atom models "area becomes Lightly Obscured / Heavily Obscured."

Evidence:

> "During that time, the area of effect is Lightly Obscured."

> "the area of effect is Heavily Obscured."

## Secondary Notes

- "If an effect has multiple possible subjects, the GM determines randomly which among them are affected" is another random-targeting pressure point.
- Some individual table entries might fit existing atoms in isolation, but the unit as authored cannot be represented honestly until the random dispatch layer exists.
