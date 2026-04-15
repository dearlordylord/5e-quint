# Synthesis: Cross-Family Pressure Matrix

Purpose:

- consolidate the current synthesis state across spells, items, feats, traits, and class features;
- make the reused-vs-strengthened-vs-still-open distinction explicit in one canonical place;
- give the next design step a compact evidence-backed matrix instead of another family-by-family recap.

Primary inputs:

- [`SYNTHESIS_extension_surface_pressure_spells_items.md`](./SYNTHESIS_extension_surface_pressure_spells_items.md)
- [`SYNTHESIS_extension_surface_pressure_feats_traits.md`](./SYNTHESIS_extension_surface_pressure_feats_traits.md)
- [`SYNTHESIS_extension_surface_pressure_classes.md`](./SYNTHESIS_extension_surface_pressure_classes.md)

## Short Answer

The corpus still points toward one closed, typed extension surface rather than separate execution models per family.

What changed during the later passes is not the existence of a new model. What changed is the minimum set of distinctions that model must preserve.

## Matrix

| Pressure family | Established by | Later families mostly do what? | Current reading |
|---|---|---|---|
| timing / trigger families | spells, items | reuse and densify | Stable: action, bonus action, reaction, on-hit, on-miss, post-action, post-roll, post-test are real first-class families. |
| resolution families | spells, masteries, items | reuse with more combinations | Stable: automatic, attack-based, save-based, save-for-half, interrupt/cancel, and rider-plus-save shapes remain distinct. |
| cleanup / ownership families | spells, items | reuse and reinforce | Stable: concentration, next-turn boundary, attunement/bond, manual end, condition-ended, action-ended cleanup all remain first-class. |
| legality / gating families | items, feats | broaden and strengthen | Stable: equipment state, feature prerequisite, level gate, ability gate, and category gate belong in typed legality vocabulary. |
| grant / link families | spells, feats, traits | broaden and strengthen | Stable: grant spell, cantrip, feat, condition, movement mode, and always-prepared state are recurring linked payload families. |
| scaling families | spells, traits | classes strengthen sharply | Stable but not yet minimal: target scaling, dice scaling, projectile scaling, threshold scaling, and table-driven use-count scaling are not one flat bucket. |
| source-local choice families | traits, feats | classes strengthen sharply | Stable: lineage choice, ancestry mode choice, invocation choice, and constrained repeatable choice all need explicit typed support. |
| option registries | class features | strongly strengthen | Stable: Cunning Strike, Channel Divinity, Eldritch Invocations, and similar menus are a core family, not an edge case. |
| replacement / retraining families | feats, spells | classes strengthen sharply | Stable: replace prepared spell, invocation, mastery choice, cantrip, or other typed pick is a real operation family. |
| cross-family rewrites | items, class features | classes strengthen sharply | Stable: features that modify spell, item, mastery, attack, or quota behavior are common enough to need typed rewrite surfaces. |
| source-root identity | traits, feats | classes reinforce | Stable: some payloads remain tightly coupled to ancestry, feat, class, subclass, or item roots and should not be flattened into anonymous atoms. |
| provenance / package boundaries | items, optional content pressure | later families do not reduce it | Stable: provenance remains orthogonal to runtime shape and must stay explicit as optional package pressure grows. |

## What Looks Fully Settled

These now look evidence-backed enough that another family pilot is unlikely to overturn them:

- closed typed families beat open scripting;
- timing and cleanup must be first-class;
- grants, choices, and registries are not special cases;
- cross-family rewrites are real but should stay typed and constrained;
- source-root identity and provenance should remain explicit rather than being flattened away.

## What Is Not Yet Settled

The remaining uncertainty is no longer whether these pressure families exist.

The remaining uncertainty is:

- how many distinct top-level payload families are truly needed;
- how compactly scaling can be encoded without losing non-equivalent shapes;
- whether rewrite surfaces should be partitioned by target family (`spell`, `item`, `attack`, `resource`) or expressed through a smaller common operation vocabulary;
- where source-root identity should live: on every payload atom, only on root-bearing containers, or on typed links between them.

## What This Means For The Next Research Step

The next productive steps are now:

1. extend the `classes_and_features` root/subunit bridge beyond the representative tranche;
2. deepen full-family enrichment where pressure is highest:
   - spells
   - equipment/masteries and magic items
   - class features
3. run the manual glossary-delta review so the closed vocabulary work is checked against the actual term layer;
4. only then draft the first candidate closed extension surface.
