# Learn: Item- and Feature-Scoped Runtime Payloads

Pattern:

- actions live on spells, weapons, and features;
- runtime consumes typed action payloads;
- creature state stores the minimal owned payloads needed for resolution.

Main competitors:

- Foundry dnd5e activities
- A5E actions model

Our local counterpart:

- `mainHandWeapon`
- `offHandWeapon`
- `readyableSpellPayloads`
- `battleReactionOptions`
- `battleBonusActionOptions`

## Why Read This

Read this if you want to understand why a large engine stops being tractable when every action is encoded as a special case on the creature itself.

The external lesson is simple: actions belong with the content that defines them.

## Tracer Bullet

### 1. Read the Foundry dnd5e activity type registry

Read:

- [foundryvtt-dnd5e `module/config.mjs:4403`](./competitors/foundryvtt-dnd5e/module/config.mjs)

What to notice:

- dnd5e defines a typed activity vocabulary;
- each type has a distinct document class.

Short example:

```js
DND5E.activityTypes = {
  attack: { documentClass: activities.AttackActivity },
  cast: { documentClass: activities.CastActivity },
  damage: { documentClass: activities.DamageActivity },
  save: { documentClass: activities.SaveActivity },
  summon: { documentClass: activities.SummonActivity },
}
```

Why it matters:

- the system does not start from "creatures have a giant list of special booleans";
- it starts from typed action-bearing content.

### 2. Read the generic activity sheet to see the shared action shape

Read:

- [foundryvtt-dnd5e `module/applications/activity/activity-sheet.mjs:46`](./competitors/foundryvtt-dnd5e/module/applications/activity/activity-sheet.mjs)

What to notice:

- every activity has shared configuration surfaces:
- activation, targeting, consumption, effects.

Short example:

```js
activation: {
  template: ".../activity/activation.hbs",
  parts: [
    "...activity-time.hbs",
    "...activity-targeting.hbs",
    "...activity-consumption.hbs"
  ]
}
```

Why it matters:

- the engine sees actions through a stable schema;
- per-item actions become composable because they share a common envelope.

### 3. Read A5E’s description of multiple actions per item

Read:

- [A5E `README.md:20`](./inspirations/foundry-level-up-a5e/README.md)

What to notice:

- one item can expose multiple independently configured actions;
- this supports alternate attack modes, staff spells, ongoing features.

Short example:

```md
features, spells, maneuvers, and objects can each be configured with numerous "actions",
each of which represents a different way to activate the item
```

Why it matters:

- this is the right conceptual model for D&D content;
- "the item owns activation modes" is stronger than "the creature owns flat action flags."

### 4. Read A5E’s contextual bonus description

Read:

- [A5E `README.md:35`](./inspirations/foundry-level-up-a5e/README.md)

What to notice:

- bonuses are contextual, not global booleans;
- they attach to the action or roll context where they matter.

Why it matters:

- it is another argument for payloads over flat creature flags.

## Now Trace The Equivalent In Our Repo

### 5. Read the battle-owned payload fields

Read:

- [battle-machine-types.ts:92](../packages/core/src/battle-machine-types.ts)

What to notice:

- battle already owns typed payload fields for attacks, spells, and reactions;
- this is the exact seam to strengthen.

Short example:

```ts
readonly readyableSpellPayloads: ReadonlyMap<SpellId, BattleReadyableSpellPayload>;
readonly mainHandWeapon: BattleWeaponProfile | null;
readonly offHandWeapon: BattleWeaponProfile | null;
readonly battleBonusActionOptions: ReadonlyArray<MonsterBattleBonusActionOption>;
readonly battleReactionOptions: ReadonlyArray<MonsterBattleReactionOption>;
```

### 6. Read the projector that fills those payloads

Read:

- [battle-machine-actions-turn.ts:136](../packages/core/src/battle-machine-actions-turn.ts)

What to notice:

- the battle projector computes payload defaults;
- it does not force battle transitions to rediscover source-level action metadata every time.

Short example:

```ts
readyableSpellPayloads:
  cfg.readyableSpellPayloads ??
  battleReadyableSpellPayloadsFromPreparedSpells(preparedSpells, slotsCurrent),
```

## What To Carry Back Into This Repo

Take:

- action-capable content should compile to typed payloads;
- battle should own only the payloads it needs to resolve actions;
- repeated special cases should be folded into payload schemas rather than more booleans.

Do not take:

- UI sheet architecture;
- Foundry document plumbing;
- generic activity editors as a runtime concern.

## Read Next

- [LEARN_replay_first_deterministic_scenarios.md](./LEARN_replay_first_deterministic_scenarios.md)

