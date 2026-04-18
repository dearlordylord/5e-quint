# Proposal: Tongues — surface_widening

## Unit

**Tongues** · Level 3 Divination · SRD 5.2.1

## Gap

The `ongoing_effect` family is the correct structural home for Tongues:

- Casting time: Action → `action_quota` consumed
- Range: Touch → `{ kind: "touch" }`
- Attachment: one creature touched → `{ kind: "target", selection: { mode: "one" } }`
- Duration: 1 hour (timed, not concentration) → `{ kind: "timed", value: { unit: "hour", amount: 1 } }`
- No upcasting

Everything fits **except** `OngoingOperation`. The union currently only admits:

| variant | use |
|---|---|
| `roll_modifier` | Bless-style numeric bonus on rolls |
| `damage_on_hit` | Hunter's Mark-style extra damage on hits |

Tongues' operation is **grant a sense capability** — specifically, universal language comprehension (hear/see any language → understand it) and universal language expression (speak/sign → any language-knower understands you). The v4 atom inventory lists `grant_sense` as an effect atom, but there is no surface `OngoingOperation` variant that emits it.

## Proposed widening

Add a new `OngoingOperation` variant:

```typescript
export type GrantSenseOperation = {
  readonly kind: "grant_sense";
  readonly senseKind: GrantSenseKind;
};

export type GrantSenseKind =
  | "universal_language_comprehension"
  | "universal_language_expression"
  | "universal_language"; // combined — both comprehend and be-understood
```

Tongues would use `"universal_language"` (or two separate operations in a list if the surface ever supports multi-operation ongoing effects).

## Tracer change required

`traceOngoingOperation` needs a new case:

```typescript
case "grant_sense": {
  const id = ids("op");
  nodes.push({
    id,
    category: "effect",
    atomKind: "grant_sense",
    label: `grant_sense\n${op.senseKind}`,
  });
  edges.push({ from: procId, to: id, relation: "grants" });
  edges.push({ from: id, to: attId, relation: "attaches_to" });
  return;
}
```

## Pressure score

Single spell pressure. However, **Comprehend Languages** (also SRD) has the same mechanic shape (ritual-castable, self or target, timed, grant language comprehension). These two spells form a natural pair that both require the same widening, so this is a `×2` pressure signal from the spell pool alone. Additional pressure from items like Helm of Comprehending Languages.

## Classification

`surface_widening` — the `ongoing_effect` family and `target` attachment are correct; only `OngoingOperation` is missing a variant. All required v4 atoms (`grant_sense`, standard procedure/resource/lifecycle atoms) already exist.
