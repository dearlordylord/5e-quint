# L3 Follow-Up Antimagic Magical Area Clipping

Task 12 closes Antimagic Field's magical area clipping clause without reducer,
Quint, or MBT changes.

## RAW And Language Check

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 208-223 for
  Antimagic Field.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 79-90 for Area of Effect and
  Total Cover blocking.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 263-267, 299-313, 430-436,
  660-664, and 924-928 for Cone, Cube, Cylinder, Emanation, Line, and Sphere.
- `UBIQUITOUS_LANGUAGE.md` Area of Effect, Cover, Movement, Illumination, and
  Obscurement terms.

Relevant RAW facts:

- Antimagic Field says areas of effect created by spells or other magic cannot
  extend into the aura.
- The Area of Effect rules define geometric shapes with points of origin and
  Total Cover line blocking.
- Emanations can move with a creature or object origin.

## Existing Facts Searched

Searched existing runtime facts before deciding not to add fields:

- `BattleSpellAreaIdentityChoice` carries table-supplied area ids for Fog Cloud,
  Darkness, Antimagic Field, Web, Flaming Sphere, Spike Growth, Moonbeam, and
  Gust of Wind.
- `BattleSpellAreaChoice` carries table-supplied affected target ids and, for
  selected procedures, object or creature witnesses. It does not carry map
  coordinates, polygons, ranges from arbitrary points, Total Cover line tests,
  or partial clipped geometry.
- `BattleAntimagicFieldAuraMembership` carries the caller-supplied
  origin-inclusion choice and non-origin combatants inside an active aura. It is
  combatant membership, not a geometric area representation.
- Task 10's magical-effect delivery owner rejects selected targets and
  caller-supplied affected creatures inside an active aura. That prevents
  represented combatants from being affected inside the aura, but it does not
  prove or mutate the shape of the area itself.
- Darkness overlap facts identify tracked spell-light occurrences that the
  table says overlap the Darkness area. They do not define reusable geometry
  overlap or clipping.
- Light emitter projection facts consume object identity, distance, and
  opaque-cover witnesses. They do not store object position, line of sight, map
  illumination, or area clipping.
- Movement and area-trigger owners consume movement/path or enter/exit/end-turn
  witnesses. They do not own pathfinding, area occupancy derivation, or map
  geometry.

## Shape Closure

The current runtime can consume already-adjudicated area identities and affected
membership for every supported shape, but cannot honestly clip the shape:

| Shape | Current supported runtime use | Task 12 closure |
| --- | --- | --- |
| Cone | Caller-supplied affected targets for cone save/damage procedures. | The table supplies the post-Antimagic affected membership; no cone direction, width-by-distance geometry, or clipped cone surface is stored. |
| Cube | Caller-supplied area or affected membership for Cube procedures such as Web, Hypnotic Pattern, and Thunderwave. | The table supplies the post-Antimagic Cube membership; no cube face-origin placement or clipped cube volume is stored. |
| Cylinder | Caller-supplied area identity and affected membership for Cylinder procedures such as Moonbeam. | The table supplies the post-Antimagic Cylinder membership; no radius/height placement or clipped cylinder volume is stored. |
| Emanation | Antimagic Field stores its own self-origin aura id and caller-supplied aura membership. | The table supplies aura membership and any other Emanation's post-Antimagic area; the runtime does not store object/creature-origin geometry or moving clipped boundaries. |
| Line | Caller-supplied line area id, direction id, affected membership, and movement/path witnesses for Line procedures such as Gust of Wind. | The table supplies the post-Antimagic line membership and movement witnesses; no path geometry, Total Cover line blocking, or clipped line segment is stored. |
| Sphere | Caller-supplied area identity or affected membership for Sphere procedures such as Fog Cloud, Darkness, Flaming Sphere, Spike Growth, Fireball, and Shatter. | The table supplies the post-Antimagic Sphere membership; no center point, radius overlap, Total Cover blocking, or clipped sphere volume is stored. |

## Decision

Close the Antimagic Field magical area clipping follow-up as a table-spatial
derivation for all currently supported area shapes.

Promoting a reducer owner now would require adding generic map geometry,
area-overlap, Total Cover, path, and partial-area clipping state that no current
runtime layer owns. Adding those fields only for Antimagic Field would duplicate
the caller-supplied area membership and spatial witnesses that existing spell
profiles already consume.

The promoted battle runtime remains responsible for:

- Antimagic Field aura identity, Concentration, duration, aura membership, action
  interdiction, magical-effect target/effect delivery interdiction, and tracked
  ongoing Spell Effect suppression.
- Existing spell-specific area identities, affected target facts, movement/path
  witnesses, and overlap facts supplied by the table.

The table remains responsible for:

- deriving whether an area shape would extend into Antimagic Field;
- clipping that area before supplying runtime area identity, affected target, or
  movement/path facts;
- applying Total Cover line blocking and geometric overlap rules;
- retaining map presentation, object position, and moving-origin geometry.

## No Runtime Change

No reducer behavior, QNT owner, MBT driver, or runtime test changed. Existing
caller-supplied area membership facts remain single-sourced.

## Reviewer Loop Convergence

- Round 1 RAW/ubiquitous-language pass: the closure traces to Antimagic Field,
  Area of Effect, shape, Total Cover, Cover, Movement, Illumination, and
  Obscurement terminology in the local SRD and ubiquitous language.
- Round 1 architecture/connascence pass: rejected Antimagic-only geometry fields
  because area identity, membership, movement/path witnesses, Total Cover, and
  overlap would need to change together across table, map, and runtime layers.
- Round 2 code-review pass: no production behavior changed; the unit claim now
  records this clause as a durable table-spatial closure instead of an active
  follow-up.

## Plan Impact

- Task 12 can be marked done as an explicit runtime-detached closure.
- Task 13, Task 14, Task 15, and Task 16 remain unchanged.
- A future generic map/area geometry owner may reopen area clipping, but it
  should be planned as a shared geometry owner rather than an Antimagic-only
  reducer field.
