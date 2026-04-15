# Stress Test: Closed Extension Surface v1 Against More Spell Shapes

Purpose:

- test [`CANDIDATE_closed_extension_surface_v1.md`](./CANDIDATE_closed_extension_surface_v1.md) against additional spell shapes beyond the first pilot;
- identify where `v1` fits cleanly and where it is still too flat;
- keep this grounded in local SRD spell text rather than abstract taxonomy debate.

Primary inputs:

- [`CANDIDATE_closed_extension_surface_v1.md`](./CANDIDATE_closed_extension_surface_v1.md)
- [`ENRICHED_spells_pilot.md`](./ENRICHED_spells_pilot.md)
- local SRD spell descriptions:
  - [`Descriptions-A-D.md`](../srd-5.2.1/Spells/Descriptions-A-D.md)
  - [`Descriptions-E-L.md`](../srd-5.2.1/Spells/Descriptions-E-L.md)

Representative extra spells:

- `Aid`
- `Alarm`
- `Antimagic Field`
- `Banishment`
- `Find Familiar`
- `Glyph of Warding`

## Short Answer

`v1` mostly survives.

The added spell sample does not force a second execution model, but it does expose two places where `v1` is still too flat:

- anchored delayed-trigger payloads;
- bound long-lived summoned companions that persist without concentration.

## Fit Check

## Aid

- Shape:
  - action cast;
  - fixed-duration buff with no concentration;
  - increases maximum and current Hit Points;
  - scales by slot level.
- `v1` fit:
  - root: `spell`
  - payload family: `ongoing_effect`
  - timing: `action`
  - operations: `healing` plus a still-unnamed max-HP modifier operation
  - cleanup: timed duration end
- Result:
  - `fits v1, but operation vocabulary wants a more explicit max-HP operation`

## Alarm

- Shape:
  - 1-minute or ritual cast;
  - fixed-duration ward anchored to a door, window, or area;
  - delayed trigger chosen at cast time;
  - trigger exclusions for designated creatures;
  - on trigger, produces either audible or mental alert.
- `v1` fit:
  - could be forced into `ongoing_effect`
  - but that hides the important difference between:
    - passive persistent buff/debuff ownership
    - anchored delayed-trigger wards
- Result:
  - `reveals missing anchored-trigger family`

## Antimagic Field

- Shape:
  - concentration aura;
  - suppresses spellcasting, magic actions, magic-item properties, ongoing spells, teleportation, planar travel, and area extension into the aura;
  - suppression is temporary, and suppressed duration still counts down.
- `v1` fit:
  - root: `spell`
  - payload family: `rewrite` plus `ongoing_effect`
  - target families: `spell`, `item`, `resource`
  - cleanup: concentration end
- Result:
  - `fits v1, but confirms rewrite needs explicit suppression semantics, not only additive modification semantics`

## Banishment

- Shape:
  - concentration exile effect with save;
  - target is incapacitated while absent;
  - normal case returns target on end;
  - extraplanar case upgrades to non-return if full minute completes.
- `v1` fit:
  - root: `spell`
  - payload family: `ongoing_effect`
  - timing: `action`
  - resolution: `save`
  - cleanup: concentration end or full-duration completion
- Result:
  - `fits v1`
  - but confirms cleanup needs completion-sensitive branch semantics, not only simple expiry.

## Find Familiar

- Shape:
  - long-cast or ritual summon;
  - instantaneous duration, but persistent owned familiar remains;
  - telepathic link, touch-delivery reaction, dismissal/resummon behavior, form replacement, one-familiar cap.
- `v1` fit:
  - can partly fit as `grant` or `ongoing_effect`
  - but neither name captures “persistent owned companion with explicit command/link/resummon rules”
- Result:
  - `reveals missing bound-companion shape`
  - likely still one closed surface, but not cleanly named by current `v1` payload families.

## Glyph of Warding

- Shape:
  - hour cast and expensive consumed component;
  - anchored ward with delayed trigger and selective exclusions;
  - choose between explosive rune and stored spell glyph;
  - can embed another prepared spell and release it later;
  - special rule for stored concentration spell: it lasts full duration after trigger.
- `v1` fit:
  - like `Alarm`, forcing this into `ongoing_effect` is too lossy;
  - stored spell embedding also exceeds a simple one-level operation vocabulary.
- Result:
  - `strong evidence for anchored-trigger family`
  - also supports keeping typed embedded payload links rather than flattening everything into raw operations.

## What v1 Still Gets Right

The stress test reinforces these `v1` choices:

- one closed typed surface is still enough;
- root identity still matters;
- rewrites still need typed target-family visibility;
- cleanup and duration ownership remain first-class;
- open scripting still looks unnecessary and harmful.

## Where v1 Needs Revision Pressure

### 1. Add anchored delayed-trigger payload support

The corpus now clearly supports a distinct payload shape for:

- wards
- delayed trigger runes
- stored spell release on trigger

Candidate name:

- `anchored_trigger`

Why it should be distinct:

- it is not merely a passive ongoing effect;
- it is not a reaction taken by a creature;
- it owns a location or object anchor, trigger logic, exclusions, and one-shot or persistent release semantics.

### 2. Add or clarify bound companion support

The corpus also supports a distinct persistent-owned-conjuration shape:

- familiar
- steed-like owned summon families
- similar long-lived spell-created companions

Candidate direction:

- either add `bound_companion` as its own payload family;
- or explicitly allow `summon` operations under `ongoing_effect` and `grant`, with a stronger ownership/link schema than `v1` currently spells out.

### 3. Expand rewrite semantics to include suppression

`Antimagic Field` shows rewrite is not only:

- add modifier
- swap mode
- preserve charge

It is also:

- suppress ability to cast or activate;
- suppress ongoing magical effects while durations continue counting;
- suppress magic-item properties conditionally by location.

So `rewrite` needs explicit support for:

- disable
- suppress
- block-targeting
- block-traversal or block-entry

## Suggested v1.1 changes

Minimal revision path:

1. add payload family `anchored_trigger`;
2. either add payload family `bound_companion` or clarify owned-summon/link semantics under existing families;
3. add rewrite operations or rewrite modes for suppression and prohibition;
4. add explicit completion-branch cleanup language for effects like `Banishment`.

## Current Working Conclusion

The extra spell sample does not overturn `v1`.

It narrows the revision list:

- `v1` is structurally right;
- it is still missing a clean home for anchored trigger spells;
- it is underspecified for persistent bound companions;
- and its rewrite vocabulary needs suppression semantics, not only positive modification semantics.
