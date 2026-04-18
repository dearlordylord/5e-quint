`Brutal Strike` does not fit the current `ClassFeatureRecord` mechanics families honestly.

Why it blocks:

- The rule is an on-hit rider attached to an existing Strength-based attack roll made during the Attack action.
- The current class-feature surface only admits `passive`, `activation`, or `composite` over those two families.
- Encoding this as `activation` would fabricate a separate attack-roll procedure instead of modifying one attack within an already-declared Attack action, which would be false to the rule text.

Primary widening:

- Structural widening: allow class features to use an on-hit rider family analogous to `MasteryMechanics.family = "on_hit_trigger"`, with additional gating for:
  - only on the barbarian's turn;
  - only on one Strength-based attack roll of the barbarian's choice;
  - only if Reckless Attack was used;
  - only if that chosen roll would otherwise have Advantage and does not have Disadvantage;
  - rider resolves only on hit;
  - choice among Brutal Strike options on hit.

Secondary surface gaps exposed by this unit:

- The extra damage is "of the same type dealt by the weapon or Unarmed Strike". `EffectAtom.damage.damageType` cannot currently reference the triggering attack's damage type.
- `Forceful Blow` includes voluntary self-movement: "You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks." The current surface has `force_move` for moving a target and `deny_opportunity_attack`, but no self-movement atom or rider that links distance to half the user's Speed.

Evidence from unit text:

- "If you use Reckless Attack, you can forgo any Advantage on one Strength-based attack roll of your choice on your turn."
- "If the chosen attack roll hits, the target takes an extra 1d10 damage of the same type dealt by the weapon or Unarmed Strike, and you can cause one Brutal Strike effect of your choice."
- "Forceful Blow. The target is pushed 15 feet straight away from you. You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks."
- "Hamstring Blow. The target's Speed is reduced by 15 feet until the start of your next turn."
