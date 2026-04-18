# Proposal: Aura of Courage (paladin L10)

## Verdict

`structural_widening`

## Why it does not fit cleanly

`Aura of Courage` is not an activated feature and not a bearer-local passive. Its mechanic is:

- always on once the paladin reaches level 10;
- spatially scoped to the area of `Aura of Protection`;
- applies to `you and your allies` while they are inside that aura;
- grants `grant_condition_immunity` to `frightened` while within that area.

The current surface can already express the effect atom honestly:

- `grant_condition_immunity { condition = "frightened" }`

But it cannot express the delivery shape honestly for a `class_feature`:

- `PassiveMechanics` has no attachment or area scope; it behaves like a bearer-local always-on grant.
- `ActivatedAbilityMechanics` requires activation cost, resource, and reset cadence, which would be false here.
- Spell `ongoing_effect` mechanics do have area attachment, but reusing a spell family for a class feature would be dishonest.

## Narrowest widening

This is a structural gap centered on passive aura delivery for class features.

Two equivalent repair directions would solve it:

1. Add a dedicated class-feature aura family, e.g. `passive_aura`.
2. Widen non-spell passive mechanics so a passive grant can carry an attachment/scope over other creatures, not just the bearer.

Either way, the shape needs to express:

- always-on class feature;
- persistent aura area;
- reuse of an existing named aura or explicit emanation radius;
- grants applied to creatures inside that area.

## Suggested shape

Minimal sketch:

```ts
type PassiveAuraMechanics = {
  readonly family: "passive_aura";
  readonly aura:
    | {
        readonly kind: "named_aura_ref";
        readonly auraId: string;
      }
    | {
        readonly kind: "emanation";
        readonly radiusFeet: number;
        readonly origin: "self";
      };
  readonly occupantDispositionFilter?: "friendly_to_source";
  readonly grants: ReadonlyArray<EffectAtom>;
};
```

Then `Aura of Courage` can honestly say:

- it is a `class_feature`;
- it reuses `Aura of Protection` as the spatial scope;
- friendly occupants in that aura gain `grant_condition_immunity(frightened)`.

## RAW pressure

> You and your allies have Immunity to the Frightened condition while in your Aura of Protection.

> If a Frightened ally enters the aura, that condition has no effect on that ally while there.

The second sentence does not force a separate atom beyond immunity; it reinforces that the immunity is area-scoped and suppresses the condition's effect while the ally remains in the aura.
