## Quarterstaff of the Acrobat

This unit fits the existing top-level `magic_item` kind and the existing composite family in principle, but it does **not** fit the current authored surface honestly.

The item needs four capabilities the current surface cannot express together:

1. The weapon itself changes among named forms (`quarterstaff`, `10-foot pole`, `6-inch rod`).
2. Several benefits apply only in specific forms.
3. The weapon can emit and extinguish light.
4. In quarterstaff form, it temporarily gains a thrown/range profile and automatically returns to the wielder's hand after the ranged attack.

## Why this is not clean

- `alter_item_kind` already exists as an effect atom, but the surface has no item/object attachment target for a magic-item activation to alter the held weapon itself.
- The passive / triggered-reaction families can gate on `holding_item`, but they cannot gate on the item's **current form**. Encoding Acrobatic Assist or Attack Deflection without the form restriction would overstate the rule.
- No existing effect atom models illumination ("emit green Dim Light out to 10 feet").
- No existing effect atom models granting a temporary thrown/ranged weapon profile plus "immediately after you make a ranged attack with the weapon, it flies back to your hand."

## Proposed widenings

### 1. Surface widening: item attachment target

- Kind: `new_variant`
- Name: `Attachment.item`
- Why: `alter_item_kind` needs a real attachment target for the held weapon/object whose form changes.
- Evidence: "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff."

### 2. Surface widening: form-state predicate

- Kind: `new_variant`
- Name: `EquipmentPredicate.item_form`
- Why: multiple riders depend on the item's current form, not merely on holding it.
- Evidence: "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)." / "Attack Deflection (Quarterstaff Form Only)." / "Ranged Weapon (Quarterstaff Form Only)."

### 3. Atom widening: light emission

- Kind: `new_atom`
- Name: `emit_light`
- Why: the item creates deterministic illumination with explicit radius and on/off control.
- Evidence: "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

### 4. Atom widening: weapon profile mutation

- Kind: `new_atom`
- Name: `modify_weapon_profile`
- Why: quarterstaff form temporarily gains the Thrown property and explicit range bands.
- Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."

### 5. Atom widening: returning thrown weapon rider

- Kind: `new_atom`
- Name: `return_to_hand_after_ranged_attack`
- Why: the return effect is a deterministic post-attack rider, distinct from generic item destruction/return-on-end lifecycle.
- Evidence: "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

