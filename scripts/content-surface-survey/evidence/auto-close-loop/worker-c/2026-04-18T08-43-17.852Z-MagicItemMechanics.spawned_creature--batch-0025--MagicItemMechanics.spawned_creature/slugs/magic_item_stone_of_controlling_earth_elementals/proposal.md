`Stone of Controlling Earth Elementals` is a `magic_item` that otherwise fits the existing `spawned_creature` family:

- activation cost: `standard_action` with `action = "magic"`
- resource/reset: 1 use, `dawn` reset
- range: `point` 30 ft
- control: shared initiative, immediately after caster, commands obeyed
- dismissal/despawn: after 1 hour, on death, or manual dismissal

It does not fit honestly today for two surface reasons.

## 1. Magic-item spawned creatures require an inline stat block

`MagicItemSpawnedCreatureMechanics` currently embeds `SpawnedCreaturePayload`, which requires an inline `statBlock`.

That is not what this item says. The item names an existing monster stat block:

> "you can take a Magic action to summon an Earth Elemental"

The unit text does not inline the Earth Elemental's AC, HP, speeds, actions, traits, or senses. Encoding this today would require inventing or importing monster details outside the provided unit text, which would be dishonest under this protocol.

### Needed widening

- kind: `new_variant`
- name: `MagicItemSpawnedCreatureMechanics.statBlockSource = catalog_ref`
- why: magic items can summon an existing catalog creature rather than shipping an inline bespoke stat block

Suggested shape:

```ts
type MagicItemSpawnedCreatureMechanics = ActivatedAbilityHeader & {
  readonly family: "spawned_creature";
  readonly range: Range;
} & (
  | SpawnedCreaturePayload
  | {
      readonly creatureRef: {
        readonly kind: "catalog_ref";
        readonly creatureType?: CreatureType;
        readonly monsterId: string;
        readonly displayName: string;
      };
      readonly control: CreatureControl;
      readonly dismissal: CreatureDismissal;
    }
);
```

No new v4 atom is required. The tracer could still emit the existing `companion`, `create_companion`, and `command_companion` atoms.

## 2. Companion manual dismissal is too narrow

`CreatureDismissal.manualDismiss` only allows `"magic_action" | "never"`.

This item says:

> "The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action."

That is a surface mismatch, not a new atom.

### Needed widening

- kind: `new_variant`
- name: `CreatureDismissal.manualDismiss = "bonus_action"`
- why: manual unsummon can consume a Bonus Action rather than a Magic action

## Classification

`surface_widening`

The top-level kind (`magic_item`) and family (`spawned_creature`) already exist. The missing pieces are narrower payload variants:

1. catalog-referenced summoned creature for magic items
2. bonus-action manual dismissal
