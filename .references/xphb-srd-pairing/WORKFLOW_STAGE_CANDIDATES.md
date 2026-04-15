# Workflow Stage Candidates

Purpose:

- derive candidate timing/workflow stages from the PHB/SRD mechanics themselves;
- avoid importing platform workflow names from Foundry, Midi-QOL, or PF2E directly;
- keep a concrete bridge between pairing research and later closed-vocabulary design.

Important rule:

- these are stage candidates, not final engine stages;
- they should survive only if the corpus forces them;
- competitor research is used only as a stress test for whether the distinction matters in practice.

## Why This Exists

Two existing research tracks intersect here:

- [RESEARCH_XPHB_SRD_PAIRING.md](../RESEARCH_XPHB_SRD_PAIRING.md) tells us which mechanics exist in the PHB/SRD corpus.
- [LEARN_explicit_effect_phase_ownership.md](../LEARN_explicit_effect_phase_ownership.md) shows that real engines are forced to distinguish apply time, expiry time, cleanup, reactions, and workflow-local timing.
- [LEARN_closed_mechanic_vocabularies.md](../LEARN_closed_mechanic_vocabularies.md) shows that those distinctions should later become closed typed vocabulary, not ambient hooks.
- [LEARN_item_feature_scoped_runtime_payloads.md](../LEARN_item_feature_scoped_runtime_payloads.md) shows that many of those distinctions are carried by item-, spell-, feat-, and feature-scoped payload families rather than by creature-global flags.
- [LEARN_hard_provenance_package_boundaries.md](../LEARN_hard_provenance_package_boundaries.md) reminds us that any future stage vocabulary may have to be reusable across provenance-bound optional packages without collapsing licensing boundaries.

So this file sits at the overlap:

- rules-derived stage pressure first;
- competitor timing pain second.

## Candidate Stages

### 1. `action_use`

Corpus pressure:

- `Action`
- `Attack`
- `Dash`
- `Disengage`
- `Dodge`
- `Help`
- `Hide`
- `Influence`
- `Magic`
- `Ready`
- `Search`
- `Study`
- `Utilize`

Why it likely survives:

- the PHB explicitly names action-bound procedures;
- many effect-bearing rules attach to taking an action, replacing an action, or granting a special action.

Competitor cross-check:

- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)
- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)

### 2. `bonus_action_use`

Corpus pressure:

- `Bonus Action`
- bonus-action-granted spells and features

Why it likely survives:

- bonus action is a distinct resource/timing surface, not just a subtype label;
- many later feature and spell mechanics key off this distinction directly.

Competitor cross-check:

- [LEARN_closed_mechanic_vocabularies.md](../LEARN_closed_mechanic_vocabularies.md)

### 3. `reaction_window`

Corpus pressure:

- `Reaction`
- `Opportunity Attack`
- triggered defensive or interrupting effects

Why it likely survives:

- reaction timing is not just action use; it is an interrupt window with consumption and possible denial.

Competitor cross-check:

- [LEARN_explicit_effect_phase_ownership.md](../LEARN_explicit_effect_phase_ownership.md)
- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)

### 4. `ready_resolution`

Corpus pressure:

- `Ready`
- readied trigger -> later resolution

Why it likely survives:

- Ready splits declaration from later execution;
- that is a rules-native two-stage mechanic, not a platform concern.

Competitor cross-check:

- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)

### 5. `attack_resolution`

Corpus pressure:

- `Attack Roll`
- `Weapon Attack`
- `Spell Attack`
- `Unarmed Strike`

Why it likely survives:

- many effects key off making an attack, being hit by an attack, or resolving a hit versus miss.

Competitor cross-check:

- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)

### 6. `save_resolution`

Corpus pressure:

- `Saving Throw`
- `Save`
- spell and hazard effects that force saves

Why it likely survives:

- save-gated effects are a separate semantic family from attack-gated effects.

Competitor cross-check:

- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)

### 7. `damage_resolution`

Corpus pressure:

- `Damage`
- `Damage Roll`
- `Resistance`
- `Vulnerability`
- concentration checks when damage is taken

Why it likely survives:

- effects trigger on dealing damage, taking damage, reducing damage, or reacting to damage.

Competitor cross-check:

- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)

### 8. `condition_apply_remove`

Corpus pressure:

- named conditions
- `Condition`
- effects and features that apply, suppress, or remove conditions

Why it likely survives:

- condition ownership and cleanup are a core engine concern;
- many later mechanics will be simpler payload over this stage rather than new custom hooks.

Competitor cross-check:

- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)

### 9. `turn_start`

Corpus pressure:

- durations and triggers phrased in turn language
- ongoing effects checked at the start of a turn

Why it likely survives:

- this is one of the most common expiry/trigger surfaces in rules text.

Competitor cross-check:

- [LEARN_explicit_effect_phase_ownership.md](../LEARN_explicit_effect_phase_ownership.md)

### 10. `turn_end`

Corpus pressure:

- durations and triggers phrased in end-of-turn language

Why it likely survives:

- end-of-turn expiry is often not interchangeable with start-of-turn checking.

Competitor cross-check:

- [LEARN_explicit_effect_phase_ownership.md](../LEARN_explicit_effect_phase_ownership.md)

### 11. `concentration_start`

Corpus pressure:

- `Concentration`
- spells whose ongoing effect begins under concentration

Why it likely survives:

- starting concentration establishes an ownership link between a source and an ongoing effect.

Competitor cross-check:

- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)

### 12. `concentration_end`

Corpus pressure:

- `Concentration`
- spells whose effects end when concentration ends
- damage-driven concentration interruption

Why it likely survives:

- this is an explicit cleanup boundary, not just a flag flip.

Competitor cross-check:

- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)
- [RESEARCH_foundry_effect_staging.md](../RESEARCH_foundry_effect_staging.md)

### 13. `rest_completion`

Corpus pressure:

- `Long Rest`
- `Short Rest`
- effects or resources restored on rest

Why it likely survives:

- rest is a rules-native lifecycle boundary for recovery and expiry.

Competitor cross-check:

- [RESEARCH_5EQUINT.md](../RESEARCH_5EQUINT.md)

### 14. `movement_trigger`

Corpus pressure:

- `Opportunity Attack`
- `Grappling`
- terrain / movement / forced movement interactions

Why it likely survives:

- movement itself is not enough; some mechanics trigger from leaving reach, entering areas, or becoming unable to move normally.

Competitor cross-check:

- [RESEARCH_ecosystem_map.md](../RESEARCH_ecosystem_map.md)

### 15. `equipment_interaction`

Corpus pressure:

- `Utilize`
- object/equipment interaction rules
- item properties and mastery-linked usage constraints

Why it may survive:

- equipment use and interaction often carry timing, target, and resource semantics distinct from attack or spell resolution.

Competitor cross-check:

- [RESEARCH_5EQUINT.md](../RESEARCH_5EQUINT.md)

## Stages We Should Be Careful About

These may turn out to be real stages, but they are also where competitor platforms often leak implementation details:

- `pre_roll`
- `post_roll`
- `chat_message_created`
- `macro_apply`
- `macro_remove`
- `workflow_finished`

Current rule:

- do not admit any of these into future vocabulary unless the PHB/SRD corpus forces an equivalent rules distinction.

## Current Synthesis

The candidate stage set should probably be forced by four families of corpus facts:

- action economy boundaries;
- attack/save/damage resolution boundaries;
- turn and rest lifecycle boundaries;
- concentration, condition, and cleanup boundaries.

And it should be cross-checked against a fifth pressure source:

- item/feature payload boundaries, especially for magic items and future module-added effect carriers.

That is enough to justify continued timing extraction work without yet freezing a final stage vocabulary.
