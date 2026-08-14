# D&D 5e Rules SDK

An executable, formally specified implementation of D&D 5e SRD 5.2.1 rules
for character creation, progression, character sheets, and combat.

Supports every class through [level 10](plans/unit-profile-coverage/LEVEL1_10_FULL_SUPPORT.md)
and an executable subset of battle-relevant spells with mechanically decidable
outcomes.

The [shipped SRD catalog](plans/unit-profile-coverage/README.md#collection-boundaries)
contains only SRD 5.2.1 content. Closed-license content is not included; the
runtime also accepts additional content catalogs.

## How it works

Rules are specified in [Quint](https://quint.sh/) and executed by
[TypeScript reducers](ARCHITECTURE.md).

When a rule depends on a player choice or table observation, the runtime
returns a question to fill.

The runtime does not roll dice or infer battlefield geometry. Callers provide
those facts as witnesses through the API.

## Example

Conceptual pseudocode; the public API exposes each discovery and fill step:

```ts
let creation = beginCharacter();

creation = fill(creation, {
  class: "fighter",
  background: "soldier",
  species: "human",
  size: "medium",
  humanSkill: "perception",
  originFeat: "alert",
  fighterSkills: ["acrobatics", "survival"],
  fightingStyle: "defense",
});

const fighter1 = finishCharacter(creation);
const fighter2 = levelUp(fighter1);
const fighter3 = levelUp(fighter2, { subclass: "champion" });
const fighterSheet = createCharacterSheet(fighter3);

const encounter = startBattle(fighterSheet, srd.monsters.goblinWarrior, {
  witnesses: { fighterInitiative: 17, goblinInitiative: 12 },
});
let battle = encounter.battle;
const fighter = encounter.character;
const goblin = encounter.opponent;

battle = attack(battle, {
  target: goblin,
  witnesses: { distance: 5, attackRoll: 17, damageRoll: 8 },
});

battle = takeDamage(battle, {
  target: fighter,
  witnesses: { damage: 7 },
});

battle = secondWind(battle, {
  witnesses: { healingRoll: 6 },
});

battle = actionSurge(battle);
battle = attack(battle, {
  target: goblin,
  witnesses: { distance: 5, attackRoll: 16, damageRoll: 7 },
});

const fighterAfterBattle = handoff(battle, fighterSheet);
```

## Develop

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm quality
```

## License

Code is licensed under [Apache 2.0](LICENSE). SRD 5.2.1 content is available
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see
[NOTICE](NOTICE) for attribution.
