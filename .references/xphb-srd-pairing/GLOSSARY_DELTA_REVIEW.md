# Glossary Delta Review

Purpose:

- complete the queued manual review of the small high-value glossary mismatch set;
- distinguish exact overlap, wording delta, structure delta, and naming split using local PHB-side 5etools data plus the local SRD 5.2.1 glossary;
- keep this as the canonical home for glossary-delta findings rather than scattering them across chat.

Primary inputs:

- [`GLOSSARY_PAIRING.md`](./GLOSSARY_PAIRING.md)
- [`Rules-Glossary.md`](../srd-5.2.1/Rules-Glossary.md)
- local PHB-side 5etools rules data:
  - [`actions.json`](../5etools-src/data/actions.json)
  - [`conditionsdiseases.json`](../5etools-src/data/conditionsdiseases.json)
  - [`variantrules.json`](../5etools-src/data/variantrules.json)

## Short Answer

The sampled glossary terms do not suggest a hidden semantic split between PHB and SRD.

What they show is:

- overwhelmingly exact or near-exact wording overlap;
- a few harmless heading-shape differences like `[Action]` or `[Condition]`;
- one real naming split: `Surprise` in the SRD versus `Surprised` in PHB-side 5etools;
- one structural asymmetry: `Reach` is present as its own SRD glossary heading but was not surfaced as a PHB glossary candidate in the current pairing output.

## Reviewed Terms

## Action

- PHB-side reading:
  - one action on your turn;
  - choose from glossary-defined actions or from special actions provided by features;
  - enumerates `Attack`, `Dash`, `Disengage`, `Dodge`, `Help`, `Hide`, `Influence`, `Magic`, `Ready`, `Search`, `Study`, `Utilize`.
- SRD reading:
  - same core rule;
  - same action inventory;
  - adds a cross-reference line to `Playing the Game`.
- Classification:
  - `wording / editorial delta only`
- Research consequence:
  - no vocabulary split needed; same mechanic unit.

## Bonus Action

- PHB-side reading:
  - special action on the same turn as your action;
  - no more than one per turn;
  - only available when a rule explicitly grants it.
- SRD reading:
  - same rule;
  - same three constraints;
  - adds a cross-reference to `Playing the Game`.
- Classification:
  - `near-exact overlap`
- Research consequence:
  - no delta with modeling consequence.

## Reaction

- PHB-side reading:
  - special action in response to a trigger;
  - can happen on another creature's turn or on your own turn;
  - once used, unavailable until the start of your next turn;
  - `Opportunity Attack` called out as universal example.
- SRD reading:
  - same rule;
  - same trigger/turn/start-of-next-turn semantics;
  - same `Opportunity Attacks` cross-reference;
  - adds `Playing the Game` cross-reference.
- Classification:
  - `near-exact overlap`
- Research consequence:
  - no delta with modeling consequence.

## Concentration

- PHB-side reading:
  - required by some spells and other effects;
  - ends if creator loses concentration;
  - creator may end it voluntarily;
  - broken by another concentration effect, damage save failure, or becoming incapacitated / dead.
- SRD reading:
  - same lifecycle and break conditions;
  - same DC rule for damage;
  - same voluntary-end rule.
- Classification:
  - `near-exact overlap`
- Research consequence:
  - confirms concentration should be modeled as one shared cleanup/ownership family, not a PHB/SRD split.

## Opportunity Attack

- PHB-side reading:
  - singular heading `Opportunity Attack`;
  - triggered when visible creature leaves reach using action, bonus action, reaction, or speed;
  - spend a reaction to make one melee weapon or unarmed attack right before departure.
- SRD reading:
  - plural heading `Opportunity Attacks`;
  - same trigger and same reaction-based melee/unarmed attack rule.
- Classification:
  - `naming / heading-shape delta only`
- Research consequence:
  - normalize singular/plural; same mechanic unit.

## Search

- PHB-side reading:
  - Wisdom check to discern something not obvious;
  - same four-skill table: `Insight`, `Medicine`, `Perception`, `Survival`.
- SRD reading:
  - same action rule and same table;
  - heading includes `[Action]`.
- Classification:
  - `exact overlap modulo heading decoration`
- Research consequence:
  - no delta with modeling consequence.

## Study

- PHB-side reading:
  - Intelligence check to study memory, book, clue, or other source of knowledge;
  - same `Areas of Knowledge` table.
- SRD reading:
  - same wording and same table;
  - heading includes `[Action]`.
- Classification:
  - `exact overlap modulo heading decoration`
- Research consequence:
  - no delta with modeling consequence.

## Utilize

- PHB-side reading:
  - normal object interaction usually happens alongside something else;
  - if object use requires an action, take the `Utilize` action.
- SRD reading:
  - same rule text with plain-text `Attack action` instead of PHB inline tag formatting.
- Classification:
  - `exact overlap modulo formatting`
- Research consequence:
  - no delta with modeling consequence.

## Exhaustion

- PHB-side reading:
  - cumulative condition;
  - level reaches `6` means death;
  - D20 Tests reduced by `2 x level`;
  - speed reduced by `5 x level`;
  - long rest removes one level.
- SRD reading:
  - same structure and same thresholds;
  - heading includes `[Condition]`.
- Classification:
  - `near-exact overlap`
- Research consequence:
  - no delta with modeling consequence.

## Invisible

- PHB-side reading:
  - three effect blocks:
    - `Surprise`: advantage on initiative if invisible when rolling it;
    - `Concealed`: unseen-targeting immunity unless observer can see you;
    - `Attacks Affected`: incoming attacks at disadvantage, outgoing at advantage unless observer can see you.
- SRD reading:
  - same three effect blocks with the same semantics;
  - heading includes `[Condition]`.
- Classification:
  - `near-exact overlap`
- Research consequence:
  - confirms the important thing is the condition payload, not the editorial heading form.

## Surprise / Surprised

- PHB-side reading:
  - heading `Surprised`;
  - rule text: if creature is caught unawares by the start of combat, it is surprised and has disadvantage on initiative.
- SRD reading:
  - heading `Surprise`;
  - rule text says creature is surprised and has disadvantage on initiative.
- Classification:
  - `real naming split with no visible semantic split`
- Research consequence:
  - the mechanic appears to be one state/rule;
  - vocabulary design should preserve one canonical concept with alias handling for `Surprise` and `Surprised`, rather than treating them as different runtime units.

## Reach

- Pairing-state observation:
  - `Reach` appears as an SRD-only glossary heading in the current pairing output.
- SRD reading:
  - standalone rule: a creature has `5 feet` of reach unless a rule says otherwise.
- PHB-side observation:
  - not surfaced as a PHB glossary candidate in the current generated pairing output;
  - but it does exist locally in PHB-side structured input:
    - in `book-xphb.json` under the melee-attack rules as a named `Reach` subentry;
    - in `book-xphb.json` equipment property coverage as a named `Reach` item-property entry:
      - `A Reach weapon adds 5 feet to your reach when you attack with it, as well as when determining your reach for Opportunity Attacks with it.`
- Classification:
  - `pairing extraction gap, not corpus disagreement`
- Research consequence:
  - the issue is with the current glossary-pairing surface, not with PHB-side rule presence;
  - if glossary pairing is later regenerated, `Reach` should be admitted through PHB-side non-glossary rule anchors or a broader term-harvesting pass.

## Working Conclusion

For the reviewed glossary sample:

- most entries are exact or near-exact overlaps;
- heading decorators like `[Action]` and `[Condition]` should be treated as presentation, not ontology;
- `Surprise` / `Surprised` is the one genuine naming normalization issue worth carrying forward;
- `Reach` is present on both sides, but the current glossary pairing missed the PHB-side anchor because it lives outside the PHB glossary statblock surface.

## What This Means For The Next Research Step

The glossary pass now supports these next steps:

1. keep one canonical mechanic concept for `surprise/surprised`, with alias normalization;
2. if glossary pairing is regenerated, widen the PHB-side term harvest enough to catch rule anchors like `Reach` that live outside the PHB glossary statblock surface;
3. proceed with extension-surface drafting, since the sampled glossary terms now suggest term-layer stability apart from normalizing `surprise/surprised`.
