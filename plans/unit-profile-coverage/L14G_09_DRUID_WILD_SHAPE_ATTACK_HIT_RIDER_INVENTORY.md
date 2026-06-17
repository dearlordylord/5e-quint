# L14G Task 9: Druid Wild Shape Attack-Hit Rider Inventory

## RAW Anchors

- `.references/srd-5.2.1/Rules-Glossary.md:966-976`: Stat Block actions and Attack Notation include what happens on a hit.
- `.references/srd-5.2.1/Animals.md:2587-2611`: Wolf Bite deals Piercing damage and applies Prone when the target is a Medium or smaller creature.
- `.references/srd-5.2.1/Rules-Glossary.md:802-808`: Prone condition consequences.
- `.references/srd-5.2.1/Rules-Glossary.md:896-898`: creature and object Size categories.

## Inventory

The eligible Wild Shape Beast form attack-hit rider corpus currently contains one rider destination:

| Destination slice | Example form | Attack | Parsed owner state | Admission result |
| --- | --- | --- | --- | --- |
| Attack-hit condition rider with target Size gate | `stat_block_wolf` | Bite | Condition owner exists for Prone, but the attack-hit payload does not yet carry a typed target Size predicate | Closed |

No eligible SRD Wild Shape Beast form currently contributes an attack-hit forced-movement rider. The runtime inventory still has a forced-movement bucket so a future pushed/pulled/moved-on-hit shape must be split to the movement owner before admission.

## Closure

Task 9 does not promote reducer behavior. The host attack remains unadmitted while the rider lacks an executable owner, so the Wolf Bite Prone clause cannot be silently dropped.

Follow-up owner: `L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-SIZE-GATED-CONDITION-RIDERS`

Required output: add a generic Stat Block attack-hit condition rider payload with a typed target Size predicate and focused runtime evidence before admitting the host attack for Wild Shape forms.
