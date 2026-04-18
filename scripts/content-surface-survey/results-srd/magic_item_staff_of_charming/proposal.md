# Proposal: Staff of Charming — `atom_widening`

## What was encoded

A partial `CompositeMagicItemMechanics` covering two of the three active properties:

- **Cast Spell** — `ActivatedAbilityMechanics` (Magic action, charge_pool cap 10, dawn reset 1d8+2) with a `direct` phase granting `grant_spell_access(charge_cast, 1 charge)` for Charm Person, Command, and Comprehend Languages.
- **Reflect Enchantment** — `TriggeredReactionAbilityMechanics` with a `spell_save_outcome` trigger (`outcome: "success"`, `spellSchool: "enchantment"`, `spellTargetsOnlySelf: true`) and a `reflect_triggering_spell` effect in a direct phase.

Charge mechanics: `charge_pool` cap 10, `resetCadence: { kind: "dawn", regain: 1d8+2 }`, `destruction: { kind: "last_charge_roll", die: 20, destroyOn: 1 }`. These encode cleanly.

Attunement restriction: class_list [bard, cleric, druid, sorcerer, warlock, wizard]. Encodes cleanly.

## What is missing

### Gap 1: `convert_save_failure_to_success` atom (blocking)

**SRD text:** "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one."

This is the **Resist Enchantment** property. It fires after the die roll resolves (the save has already been failed) and retroactively converts the outcome to a success. There is no atom in v4 or in the current TS surface that models this.

Closest existing atoms and why they don't fit:
- `modify_roll_advantage` — grants advantage on *future* rolls, not retroactive conversion.
- `modify_roll_numeric` — adds a numeric bonus *before* the roll result is determined.
- `negate_triggering_spell` — cancels the spell entirely, does not convert the save outcome.
- `reflect_triggering_spell` — reflects the spell back at its caster; requires a *succeeded* save.

**Proposed atom:**
```typescript
| {
    readonly kind: "convert_save_failure_to_success";
    // No fields needed — applies to the immediately-resolved failed save that
    // triggered the enclosing reaction (narrowed by the trigger's spell_save_outcome
    // predicate). Once used, the save is treated as a success for all purposes.
  }
```

**Trigger shape:** The Resist Enchantment reaction uses the existing `spell_save_outcome` trigger with `outcome: "failure"`, `spellSchool: "enchantment"`, `spellTargetsOnlySelf: true`. The trigger shape already exists; only the effect atom is missing.

**Resource:** Resist Enchantment has its own separate resource — it does NOT draw from the staff's charge pool. Reset is once per dawn (`resetCadence: { kind: "dawn" }`, no `regain` field = full refill, cap 1). This is already expressible; no new surface shape needed for the resource.

### Gap 2: Shared charge pool across composite components (surface limitation)

**SRD text:** "This staff has 10 charges. [Cast Spell] expend 1 charge... [Reflect Enchantment] expend 1 charge from the staff."

Cast Spell and Reflect Enchantment both draw from the same 10-charge pool. In the current `CompositeMagicItemMechanics` surface, each component with an `ActivationResource` declares its own `charge_pool`. There is no mechanism to declare a shared pool at the composite level and reference it from multiple components.

The encoded workaround: both components redundantly declare `{ kind: "charge_pool", cap: { kind: "fixed", uses: 10 }, resetCadence: { kind: "dawn", regain: 1d8+2 } }`. The trace shows two separate `charge` resource nodes — which misrepresents the shared depletion (using 5 charges on Cast Spell does not appear to reduce the available charges for Reflect Enchantment in the graph).

**Proposed surface widening:** A `sharedChargePool` field at the `CompositeMagicItemMechanics` level, referenced by component-level mechanics that draw from it. Or, a named resource reference scheme so components can reference the pool by id rather than re-declaring it.

## Full encoding once gaps are resolved

```
CompositeMagicItemMechanics {
  parts: [
    ActivatedAbilityMechanics {               // Cast Spell
      activationCost: { kind: "standard_action", action: "magic" }
      resource: shared_charge_pool_ref
      phases: [direct → grant_spell_access × 3 (charge_cast 1)]
    },
    TriggeredReactionAbilityMechanics {       // Reflect Enchantment
      activationCost: { kind: "reaction", trigger: spell_save_outcome(success, enchantment, self-only) }
      resource: shared_charge_pool_ref        // same pool as Cast Spell
      phases: [direct → reflect_triggering_spell]
    },
    TriggeredReactionAbilityMechanics {       // Resist Enchantment (needs new atom)
      activationCost: { kind: "reaction", trigger: spell_save_outcome(failure, enchantment, self-only) }
      resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }
      resetCadence: { kind: "dawn" }
      phases: [direct → convert_save_failure_to_success]  // NEW ATOM
    }
  ],
  sharedPool: { kind: "charge_pool", cap: 10, resetCadence: dawn(1d8+2) }  // NEW SURFACE FIELD
}
```
