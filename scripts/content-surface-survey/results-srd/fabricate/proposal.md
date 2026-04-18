# Proposal: Fabricate surface gaps

Fabricate encodes cleanly as `activation` / `direct` / `create_object`. Typecheck passes and the tracer emits a valid graph. The following secondary gaps remain.

## Gap 1: Material-conditional size cap on `create_object`

**Evidence:** "If you're working with metal, stone, or another mineral substance, however, the fabricated object can be no larger than Medium (contained within a 5-foot Cube)."

The current `create_object` atom has one `maxSize: Size` field. Fabricate defines two distinct size caps:
- General materials: Large or smaller (10-foot Cube)
- Metal / stone / mineral: Medium or smaller (5-foot Cube)

**Proposed widening:** Add a `materialMaxSize` map or a conditional variant to `create_object`:

```typescript
| {
    readonly kind: "create_object";
    readonly maxSize: Size;
    readonly shape?: AreaShapeSpec;
    readonly consumable?: true;
    readonly durability?: CreatedObjectDurability;
    // NEW: override maxSize for specific material categories
    readonly materialSizeCaps?: ReadonlyArray<{
      readonly material: "metal" | "stone" | "mineral";
      readonly maxSize: Size;
    }>;
  }
```

Alternative: express as a single `maxSizeByMaterial` map. The current encoding uses `maxSize = "large"` and omits the mineral cap.

## Gap 2: Proficiency gate for high-skill items

**Evidence:** "You also can't use it to create items that require a high degree of skill—such as weapons and armor—unless you have proficiency with the type of Artisan's Tools used to craft such objects."

No proficiency-check gate exists on `create_object` or on the `direct` activation phase. This is a constraint that prevents the spell from fabricating weapons/armor without tool proficiency. It would require either:
- A `proficiencyGate` field on `create_object` referencing the relevant `ArtiansTools` proficiency, or
- A new `proficiency_check_gate` activation phase variant (heavier).

The constraint is partially DM-resolved (what counts as "high degree of skill" is judgment), so a simple flag or annotation may suffice.

## Gap 3: Raw-material targeting in ObjectFilter

**Evidence:** "Choose raw materials that you can see within range."

`ObjectFilter.material` only supports `"metal" | "flammable"`. There is no way to express "raw/unprocessed material" as an attachment filter. The encoding omits the filter entirely, which is functionally equivalent to "any object" rather than "raw material only". A `"raw"` or `"unprocessed"` material category — or a `manufactured: false` filter — would address this. Note: `ObjectFilter.manufactured` already exists; setting it to `false` would partially capture "unprocessed material" semantics.
