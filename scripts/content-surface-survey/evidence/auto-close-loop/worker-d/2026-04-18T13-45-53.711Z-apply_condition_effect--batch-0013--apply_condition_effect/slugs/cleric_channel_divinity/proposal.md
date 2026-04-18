## Verdict

`Channel Divinity` is a `structural_widening`.

I did not author `content/cleric_channel_divinity.dhall` because the existing `ClassFeatureRecord` mechanics families cannot encode this unit honestly as a single feature.

## Why the existing families do not fit

`activation` is too small. It can express one activated procedure with one resource and one ordered phase list. `Channel Divinity` is not one such procedure:

- it has one shared pooled resource;
- each use requires choosing one effect option from this class;
- the options are mechanically different full procedures, not just different effect bundles;
- the text explicitly says more options are added later.

That means the feature is really:

1. spend one Channel Divinity use;
2. choose an option from a feature-local menu;
3. run that option's own activation graph.

The current surface has no honest way to express that composition for a single class feature.

## Specific gaps

### 1. Shared resource across multiple full activations

`Divine Spark` and `Turn Undead` are not siblings that can be split into separate authored features without lying about ownership of the resource pool.

The resource belongs to `Channel Divinity` itself:

> "Each time you use this class's Channel Divinity, choose which Channel Divinity effect from this class to create."

and:

> "You can use this class's Channel Divinity twice."

So the missing shape is a shared-resource activation-options subgraph, not just a new effect atom.

### 2. Turn Undead's compelled retreat is not in the atom surface

The existing atoms can cover part of Turn Undead:

- area target selection filtered to Undead;
- `save_gate`;
- `apply_condition` for `frightened` and `incapacitated`;
- timed duration;
- early end on target taking damage.

But this line is still not representable:

> "For that duration, it tries to move as far away from you as it can on its turns."

That is not a one-shot `force_move`; it is an ongoing source-relative compelled behavior on each of the target's turns.

### 3. Source-side early-end conditions are missing

The current `DurationEndTrigger` grammar is target-side. Turn Undead also ends early when the cleric is incapacitated or dies:

> "This effect ends early on the creature if it takes any damage, if you have the Incapacitated condition, or if you die."

The target-damaged clause fits. The source-incapacitated and source-death clauses do not.

## Minimal widening direction

The narrow honest widening is:

- add a class-feature mechanics shape for a shared resource with option-local activation procedures;
- add an atom or ongoing-operation form for compelled fleeing away from a source;
- widen duration early-end triggers to allow source-side condition/death clauses.

Without those, any authored `Channel Divinity` record would either:

- flatten multiple different procedures into one fake activation, or
- split Divine Spark / Turn Undead into independent features and falsely duplicate or relocate the shared resource.

Both would be misleading, so I stopped before authoring a placeholder content file.
