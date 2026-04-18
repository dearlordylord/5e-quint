# Restoring Touch (paladin L14)

## Verdict

`structural_widening`

`Restoring Touch` does not fit honestly as its own authored `activation` record in the current surface.

## Why it does not fit

The feature is not a standalone action, bonus action, reaction, passive grant, or triggered reaction. Its trigger and cost are parasitic on an existing class feature activation:

- it happens only **when you use Lay On Hands**;
- it spends from the **same Lay On Hands healing pool**;
- its spend is in direct competition with the healing amount from that same activation;
- it can remove **one or more** conditions during that same use.

Encoding it as a separate `activation` would be false in at least two ways:

- it would imply a separate invocation window rather than “also” during Lay On Hands;
- it would either duplicate the Lay On Hands pool or sever the coupling between cure-cost and heal amount.

## Concrete surface gaps

### 1. Missing augmentation shape on an existing activation

The surface needs a way for one class feature to modify another named activation rather than pretending to be its own activation.

Candidate direction:

- a new subgraph or mechanics family for “augment existing named activation”
- scoped to a specific feature id such as `paladin_lay_on_hands`
- able to add optional branches/effects and shared-cost rules to that host activation

RAW evidence:

> "When you use Lay On Hands on a creature, you can also remove one or more of the following conditions from the creature"

### 2. Missing `remove_condition` subset-choice form

Current `remove_condition.condition` supports:

- one fixed condition
- all listed conditions
- choose exactly one from a list

Restoring Touch needs:

- choose any subset of size 1+

RAW evidence:

> "remove one or more of the following conditions from the creature: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned"

### 3. Missing shared-pool exchange rule inside the host activation

The rule is not just “remove a condition and spend some resource.” It is:

- spend 5 points from the Lay On Hands pool per removed condition
- those points do **not** also heal HP

That means the remove-condition branch and the heal branch are competing uses of the same pool within one resolution.

RAW evidence:

> "You must expend 5 Hit Points from the healing pool of Lay On Hands for each of these conditions you remove; those points don't also restore Hit Points to the creature."

## Why this is not just `surface_widening`

Even if `remove_condition` gained subset choice, the feature would still not fit honestly as a standalone `activation`. The core mismatch is structural: the current families have no way to express “augment this other feature’s activation and share its pool/cost accounting.”

