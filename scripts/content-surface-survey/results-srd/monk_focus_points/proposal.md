`Focus Points` does not fit the current authored surface honestly.

Why it fails:

- The top-level unit is not itself a single activation. The level-2 feature establishes a reusable resource pool whose cap scales by Monk level, defines a save DC formula for later Monk features, and grants access to three subordinate techniques.
- The existing `class_feature` surface only models one `activation` with one `activationCost`, one `resource`, one `resetCadence`, and one `effect`.
- The available `ClassFeatureEffect` variants are only `grant_extra_action` and `heal_hp`, which do not cover:
  - making two Unarmed Strikes as a Bonus Action,
  - taking standard actions as a Bonus Action,
  - combining two standard actions into one Bonus Action,
  - doubling jump distance for the turn,
  - or declaring a save DC formula for later dependent features.

This forces a structural widening rather than a placeholder encoding.

Suggested widening:

- Add a non-activation class-feature family for a persistent class resource / option bundle.
- That family would need to model:
  - a level-scaled resource pool,
  - rest reset behavior,
  - granted subordinate activations,
  - and shared derived metadata such as a feature save DC formula.

Evidence from source:

- "This energy is represented by Focus Points. Your Monk level determines the number of points you have"
- "You can expend these points to enhance or fuel certain Monk features. You start knowing three such features"
- "When you expend a Focus Point, it is unavailable until you finish a Short or Long Rest"
- "The save DC equals 8 plus your Wisdom modifier and Proficiency Bonus."
- "Flurry of Blows... expend 1 Focus Point to make two Unarmed Strikes as a Bonus Action."
- "Patient Defense... take the Disengage action as a Bonus Action. Alternatively, you can expend 1 Focus Point to take both the Disengage and the Dodge actions as a Bonus Action."
- "Step of the Wind... take the Dash action as a Bonus Action. Alternatively, you can expend 1 Focus Point to take both the Disengage and Dash actions as a Bonus Action, and your jump distance is doubled for the turn."
