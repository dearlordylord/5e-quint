**Aura Expansion (Paladin L18)**

> "Your Aura of Protection is now a 30-foot Emanation."

**Verdict**

`surface_widening`

The current top-level family fit is fine:

- `kind = "class_feature"` exists.
- `mechanics.family = "passive"` exists for class features.

The missing piece is lower-level: there is no honest effect shape for "modify the radius/geometry of another named ongoing aura."

**Why No Authored Dhall**

Authoring this as a standalone passive aura would be false. Aura Expansion does not grant a second aura or restate Aura of Protection's saving-throw bonus. It only changes the footprint of the existing Aura of Protection feature.

The current surface can describe:

- a passive effect you gain directly;
- an area attachment on a spell or other one-shot procedure;
- fixed aura geometry when the unit itself owns the aura.

It cannot describe:

- a passive feature that targets another feature by id; or
- a passive effect that changes that feature's emanation radius to 30 feet.

Because of that, any `content/paladin_aura_expansion_l18.dhall` would either:

- fabricate a new aura instead of modifying Aura of Protection; or
- duplicate Aura of Protection's own mechanics inside this level-18 feature.

Both are misleading.

**Narrowest Honest Widening**

This does not force a new top-level family. The honest widening is within the existing effect surface:

1. Add a `modify_range`-style effect variant that can target named ongoing aura geometry.
2. Add a cross-feature reference so the modifier can identify `Aura of Protection` as the thing being changed.

Sketch:

```typescript
type EffectAtom =
  | ...
  | {
      readonly kind: "modify_range";
      readonly target: {
        readonly kind: "feature_attachment";
        readonly featureId: string;
      };
      readonly shape: {
        readonly kind: "emanation";
        readonly radiusFeet: number;
      };
    };
```

That would let Aura Expansion say, honestly: modify `paladin_aura_of_protection_l6` so its emanation radius is 30 feet.

**Why This Is Surface, Not Atom, Widening**

The v4 taxonomy already includes `modify_range`. The problem is that the authored surface does not currently expose a variant that can apply that concept to an existing named aura/attachment owned by another feature.
