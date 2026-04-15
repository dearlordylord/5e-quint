# Round 3 Synthesis

Purpose:

- aggregate the third 20-spell pass against `TAXONOMY_atoms_graph_v2.md`;
- determine whether the current atom graph is still structurally dishonest;
- decide whether to keep iterating on the same spell sample or move to broader validation.

## Short Answer

`v2` is good enough to stop iterating on this 20-spell sample.

That does **not** mean the taxonomy is finished.
It means the remaining residue has narrowed enough that the next useful move is not another pass over the same twenty spells looking for more top-level atoms.

The remaining loss is mostly:

- subtype detail;
- branch/outcome bookkeeping;
- sequencing precision;
- spell-specific policy seams;
- scaling parameterization;
- implementation-facing prompt / prepare / commit semantics.

Those are real, but they are no longer evidence that the current atom inventory is missing another major spell family.

## Group Verdicts

### Group A

- `Aid`
- `Alarm`
- `Antimagic Field`
- `Banishment`
- `Bless`

Result:

- no new major atom family forced;
- residue is target-cap scaling, alert-policy detail, suppression bookkeeping, and branch/outcome typing.

### Group B

- `Counterspell`
- `Dispel Magic`
- `Find Familiar`
- `Fly`
- `Glyph of Warding`

Result:

- no new major atom family forced;
- residue is component-sensitive interrupt policy, delayed-release trigger policy, one-instance-only lifecycle policy, and finer movement/landing phrasing.

### Group C

- `Haste`
- `Hold Person`
- `Hunter's Mark`
- `Invisibility`
- `Magic Weapon`

Result:

- no new major atom family forced;
- residue is target-gate metadata, rider specialization, break sequencing, and item-bonus parameterization.

### Group D

- `Shield`
- `Shield of Faith`
- `Shocking Grasp`
- `Sleep`
- `Spiritual Weapon`

Result:

- no new major atom family forced;
- residue is mostly sequencing precision, scaling detail, and proxy lifecycle polish.

## What Round 3 Validated

### 1. The reset was necessary

The earlier family bundle story was too strong.

The atom graph is a better research frame because it can admit:

- PHB-as-extension pressure;
- lower-level relations instead of only family labels;
- repeated falsification and revision.

### 2. `v2` is no longer collapsing obviously distinct spell shapes

The repeated problem in `v0` was dishonest compression.

By round 3, the sample no longer forces the taxonomy to flatten:

- alert wards into storage wards;
- interrupt spells into generic reactions;
- marks into generic buffs;
- companions into prose-only lifecycle;
- attack proxies into generic object creation;
- exile / return branches into vague movement;
- breakable states into generic duration buffs.

### 3. Typed scaling survives the sample

The loop strengthened the claim that scaling is not one thing.

At minimum, the taxonomy still needs distinct support for:

- target-count scaling;
- numeric-bonus scaling;
- damage scaling.

Round 3 did not falsify that split.

### 4. Legality still reads better as emergent

The spell sample still does not justify reviving `legality` as its own top-level family.

The more honest current read is still:

- windows
- requirements
- attachments
- resources
- prompts
- preparation
- commitment

combine to produce availability / legality behavior.

### 5. Prompt / prepare / commit remains an important architectural pressure

`Shield` in particular still pressures a dry-run / decision / commit style read:

- the state exposes an available reaction;
- the user may or may not choose to take it;
- the system needs a prepared candidate before consuming resources and mutating state.

Round 3 does not finish that architecture, but it keeps the pressure explicit.

## What Is Still Open

Round 3 leaves real open work:

- build a real taxonomy graph representation instead of only prose buckets;
- widen spell validation beyond the current twenty spells;
- test the graph against attunement-heavy and stored-spell-heavy magic items;
- test whether prompt / prepare / commit should become a common runtime architecture pattern;
- decide how much branch/outcome typing belongs in the taxonomy versus later schema;
- keep checking whether legality should stay emergent rather than first-class.

## Research Conclusion

The current stop condition is met:

- the 20-spell loop has been run three times;
- each round removed real compression or dishonesty;
- by round 3, the residue is narrow enough that another pass on the same sample is unlikely to discover a new major atom family.

So the correct next move is:

1. keep `RESET_foundation_srd_base_phb_extension.md` as the correction layer;
2. treat `TAXONOMY_atoms_graph_v2.md` as the current working atom inventory;
3. widen validation, not by default to schema design, but to broader spell and item samples and to an actual graph representation.
