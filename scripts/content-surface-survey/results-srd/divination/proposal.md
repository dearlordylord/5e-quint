# Proposal: Divination — dm_agenda

## Unit

**Divination** (spell, level 4, school: Divination, srd-5.2.1)

## Outcome

`dm_agenda` — the spell's core mechanic is DM adjudication. No `.dhall` or `.json` authored.

## Reasoning

The spell's entire effect is:

> "You ask one question about a specific goal, event, or activity to occur within 7 days. The DM offers a truthful reply, which might be a short phrase or cryptic rhyme."

There is no deterministic mechanical resolution:

- No attack roll, saving throw, or ability check.
- No damage, healing, or HP modification.
- No condition applied to or removed from a creature.
- No creature-state change of any kind.

The "effect" is that the **DM produces narrative output** (a short phrase or cryptic rhyme). This is a caller-owned, DM-adjudicated outcome — exactly the class of things ARCHITECTURE.md excludes from core-mechanics atoms.

### Secondary mechanic

The 25% cumulative failure chance on repeated castings within a Long Rest introduces a probabilistic gate: roll dice to determine whether the DM gives any answer at all. The gate is mechanically trivial (a single d100 < threshold check), but even when the gate passes, the _content_ of the answer is DM-decided. The failure branch yields "no information," which is not a creature-state change.

Neither half of this secondary mechanic forces a new atom or family — the probabilistic check is caller-resolved and the outcome is narrative in both branches.

## What would be needed to encode this

There is no path to a core-mechanics encoding. The spell's value is entirely in the DM's reply. Even if a `query_oracle` procedure atom were added to v4, the response content would remain outside the deterministic resolution boundary that defines core atoms.

This is the canonical `dm_agenda` case: a spell whose purpose is to solicit a DM communication, with no mechanical effect on the game state.
