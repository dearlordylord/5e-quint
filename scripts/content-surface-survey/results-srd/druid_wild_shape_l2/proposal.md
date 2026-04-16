# Proposal: Wild Shape (Druid L2) — atom_widening

## What fits

The `class_feature` kind and `activation` family structurally fit:

| Field | Value | Status |
|---|---|---|
| `kind` | `class_feature` | ✓ exists |
| `family` | `activation` | ✓ exists |
| `activationCost` | `bonus_action` | ✓ exists |
| `resource.kind` | `use_count` | ✓ exists |
| `resource.cap` | `fixed { uses: 2 }` at L2 (scales via Beast Shapes table) | ✓ fixed cap exists; tiered scaling also exists |
| `resetCadence` | `partial_short_full_long { shortRestRefill: 1 }` | ✓ exists |

## What doesn't fit

### 1. Missing atom: `assume_form` (primary blocker)

Wild Shape's core mechanic is the druid **assuming a Beast form** and having their game statistics replaced by the Beast's stat block. The SRD text:

> *Your game statistics are replaced by the Beast's stat block, but you retain your creature type; Hit Points; Hit Point Dice; Intelligence, Wisdom, and Charisma scores; class features; languages; and feats.*

No v4 atom captures this:
- `alter_item_kind` — items only
- `create_companion` / `command_companion` — creates/controls a separate entity; the druid does not become a separate entity
- `transport_exile` — physical movement, not stat replacement

The `ClassFeatureEffect` union (`GrantExtraActionEffect | HealHpEffect`) has no member that can honestly represent "replace your statistics with a creature's stat block."

**Proposed atom:** `assume_form`
- Category: `effect`
- Shape: references a creature stat block (by type/CR constraint at authoring time, by specific stat block at runtime)
- Models: stat block substitution with a closed set of retained attributes (creature type, HP, HD, INT/WIS/CHA scores, class features, languages, feats, proficiencies)

### 2. Missing surface variant: duration on `ClassFeatureActivationMechanics`

Wild Shape persists for a timed, multi-condition duration:

> *You stay in that form for a number of hours equal to half your Druid level or until you use Wild Shape again, have the Incapacitated condition, or die. You can also leave the form early as a Bonus Action.*

`ClassFeatureActivationMechanics` has no duration field — its shape is `ClassFeatureMechanicsHeader & { family, effect }`. There is no way to express:
- Timed expiry (N hours, where N scales with class level)
- Self-break on re-use (using Wild Shape again exits the current form)
- Condition-triggered expiry (Incapacitated)
- State-triggered expiry (death)
- Voluntary early exit (Bonus Action)

The spell surface has `Duration` with `timed` and `concentration` variants, but there is no parallel `ClassFeatureDuration` surface type.

**Proposed widening:** Add a `duration` field to `ClassFeatureActivationMechanics` with a `ClassFeatureDuration` type that supports:
- `timed` with axis-scaled value (e.g. `linear_per_level` with axis=class for the hours formula)
- A `terminatesOn` array of closed expiry triggers: re-use, condition (by name), death, voluntary-bonus-action

### 3. Missing atom: `grant_temp_hp` (secondary)

On form assumption, the druid gains Temporary Hit Points equal to their Druid level:

> *When you assume a Wild Shape form, you gain a number of Temporary Hit Points equal to your Druid level.*

Temporary HP are mechanically distinct from healing:
- They do not restore lost HP
- They form a separate buffer that absorbs damage first
- They do not stack (take the higher value if multiple sources apply)
- They expire with the form or independently

The `heal_hp` atom targets HP restoration. Using it for THP would be dishonest.

**Proposed atom:** `grant_temp_hp`
- Category: `effect`
- Shape: `{ kind: "grant_temp_hp", amount: DiceAmount, target: "self" | "target_creature" }`
- This is the correct atom for False Life (spell), the fighter's Heroic Warrior feature, and other THP sources

### 4. Known Forms (authoring metadata, not a runtime atom)

The Known Forms subsystem (4 forms at L2, scaling count and max CR by level, fly speed unlock at L8) is a **preparation-time learning mechanic**, not a runtime atom. It governs which stat blocks are eligible when Wild Shape is activated. This is authoring/character-sheet metadata:

- Beast form pool size: threshold_tiers by class level (4 → 6 → 8 forms)
- Max CR constraint: threshold_tiers by class level (1/4 → 1/2 → 1)
- Fly speed allowed: threshold_tiers by class level (No → No → Yes)

No new atom is required for this. It would be captured as authoring constraints on the `assume_form` effect's type-selection field.

## Recommended encoding shape (pending widening)

```
ClassFeatureRecord {
  kind: "class_feature"
  className: "druid"
  acquiredAtLevel: 2
  mechanics: {
    family: "activation"
    activationCost: { kind: "bonus_action" }
    resource: { kind: "use_count", cap: { kind: "fixed", uses: 2 } }
    resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 }
    duration: {                                    // NEW surface field
      kind: "timed"
      value: { kind: "linear_per_level", axis: "class", base: 1, perLevel: ..., startingAtLevel: 2 }
      // hours = floor(druidLevel / 2)
      terminatesOn: [
        { kind: "re_use" },
        { kind: "condition", condition: "incapacitated" },
        { kind: "death" },
        { kind: "voluntary_bonus_action" }
      ]
    }
    effects: [
      {
        kind: "assume_form"                        // NEW atom
        formConstraint: { kind: "beast", maxCR: "1/4", flySpeed: false }
        retains: ["creature_type", "hp", "hit_dice", "int", "wis", "cha",
                  "class_features", "languages", "feats", "proficiencies"]
      },
      {
        kind: "grant_temp_hp"                      // NEW atom
        amount: { kind: "linear_per_level", axis: "class", base: 1, perLevel: 1, startingAtLevel: 2 }
        target: "self"
      }
    ]
  }
}
```

Note: the `effects` array in the proposed shape is itself a `surface_widening` — `ClassFeatureActivationMechanics` currently has a single `effect` field, not an array. Wild Shape requires at least two simultaneous effects (form assumption + THP grant).
