# Spell Validation Matrix v0

Purpose:

- validate `TAXONOMY_atoms_graph.md` against a broader spell sample;
- force the taxonomy to explain real spell shapes instead of preferred abstractions;
- keep the sample broad enough to hit preparation, reaction, storage, release, concentration, completion-branching, and persistent ownership pressure.

Validation fields:

- spell
- why it is in sample
- expected atoms
- expected relations
- likely stress points
- verdict

## 20-Spell Validation Set

1. `Aid`
2. `Alarm`
3. `Antimagic Field`
4. `Banishment`
5. `Bless`
6. `Counterspell`
7. `Dispel Magic`
8. `Find Familiar`
9. `Fly`
10. `Glyph of Warding`
11. `Haste`
12. `Hold Person`
13. `Hunter's Mark`
14. `Invisibility`
15. `Magic Weapon`
16. `Shield`
17. `Shield of Faith`
18. `Shocking Grasp`
19. `Sleep`
20. `Spiritual Weapon`

## Why This Set

This set deliberately mixes:

- immediate effects;
- triggered responses;
- concentration effects;
- non-concentration persistent effects;
- object/location anchoring;
- stored-spell behavior;
- explicit ownership / companion behavior;
- range / targeting / suppression rewrites;
- bonus-action and reaction windows.

## Expected Output Format Per Spell

Each spell validation pass should report:

1. root atoms used;
2. procedure atoms used;
3. attachment atoms used;
4. time/lifecycle/resource/effect atoms used;
5. relation edges needed;
6. what still leaks into prose;
7. whether the spell falsifies or strengthens any current atom or relation.

## Loop Plan

Validation should happen in repeated rounds:

- round 1: broad first-pass fit check;
- round 2: revise taxonomy from round 1 and re-check the same 20 spells;
- round 3: only if round 2 still leaves major unresolved residue, revise again and re-check.

Canonical rule:

- update the taxonomy after each aggregated round;
- do not silently keep a broken atom set just because it was already written once.
