# Restoring Touch — widening proposal

## Verdict

`Restoring Touch` does not fit an existing authored family honestly. It is not:

- a standalone `activation`, because it has no independent action cost or resource pool;
- a `passive`, because it does not grant an always-on effect by itself;
- a clean `composite`, because both halves would need to share and modify the same `Lay On Hands` activation and pool.

## Why the current surface fails

The existing `Lay On Hands` encoding already models:

- one `bonus_action` activation;
- one `charge_pool` whose cap is `5 × paladin level`;
- one direct effect: heal HP equal to resource spent.

`Restoring Touch` is an extension of that exact activation:

- trigger: **when you use Lay On Hands on a creature**;
- optional rider: remove one or more listed conditions;
- shared resource: each removed condition costs **5 HP from the Lay On Hands pool**;
- tradeoff: those points **do not also heal**.

The missing capability is not a new atom like `remove_condition`; that atom already exists. The missing capability is a way for one class feature to augment a named existing activation and consume that activation's existing resource pool.

## Narrowest honest widening

Add a structural mechanism such as `augment_named_activation` or equivalent subgraph support:

- target an existing authored unit / activation by id, here `paladin_lay_on_hands`;
- add an optional branch or rider to that activation;
- consume from the target activation's existing resource pool, not a duplicated pool;
- allow exchanging some or all of the activation's spend away from healing into alternate effects.

## Why I did not author placeholder content

Encoding `Restoring Touch` as a separate `activation` would require inventing a second pool or duplicating the Lay On Hands pool definition on a second record. That would be false to the rule text and violates the no-redundant-state / honest-family-fit requirements.
