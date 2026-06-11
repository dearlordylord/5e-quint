# Admin Mirror Spark Fight Scenario

Status: validated manually through the MCP tool protocol on 2026-06-11.

Purpose: give a smaller Spark-class model a deterministic, presentation-friendly fight script that exercises character creation, battle state updates, presentation timeline updates, martial features, spells, and SRD stat blocks without inventing unsupported battle behavior.

## Runtime Setup

Use the running admin mirror and publish into the presentation session:

```sh
DND_ADMIN_MIRROR_URL=http://127.0.0.1:8787
DND_ADMIN_MIRROR_SESSION_ID=live-demo
```

For a 1-3 minute presentation, wait about 3-6 seconds between state-changing MCP calls. For quick validation, shorter delays are fine.

Use neutral combatant `side: "demo"` for every combatant. Do not introduce party/opposition semantics into this demo script.

## Cast

Create and finalize two character sessions:

- Orc Soldier Fighter 2
  - progression: Fighter level 1 plus Fighter level 2 fixed HP gain
  - important battle features: Flail attack, Action Surge, Second Wind
  - equipment: Chain Mail, Shield, Flail

- Elf Soldier Wizard 2
  - progression: Wizard level 1 plus Wizard level 2 fixed HP gain
  - cantrips: Light, Fire Bolt, Ray of Frost
  - spellbook includes: Detect Magic, Mage Armor, Magic Missile, Shield, Sleep, Thunderwave, Chromatic Orb, Feather Fall
  - prepared spells include: Mage Armor, Magic Missile, Shield, Thunderwave, Chromatic Orb
  - important battle actions: Ray of Frost, Magic Missile

Start one battle with:

- `fighter`, initiative 18
- `wizard`, initiative 14
- `skeleton-a`, `stat_block_skeleton`, initiative 8
- `skeleton-b`, `stat_block_skeleton`, initiative 7
- `goblin`, `stat_block_goblin_warrior`, initiative 6

## Fight Beats

1. Fighter attacks `skeleton-a` with Flail.
   - Use target, attack-roll, and damage fills returned by the attack flow.
   - Validated damage hole: `battle:attack:damage-result:1d8+3-bludgeoning`.
   - A small roll such as `[1]` is useful because Skeleton vulnerability makes the HP change visually obvious.

2. Fighter uses Action Surge.
   - Discover acts first and require `Action Surge`.
   - Resolve it with subject `{ tag: "unitFeature", actorId: "fighter", unitId: "fighter_action_surge" }`.

3. Fighter attacks `skeleton-a` again with Flail and misses.
   - Use a low attack roll such as total 1 / natural 1.
   - Important protocol detail: a miss resolves immediately after the attack-roll fill. Do not submit a damage fill after a resolved miss.

4. Fighter ends turn.

5. Wizard casts Ray of Frost on `skeleton-b`.
   - Discover acts first and require `Ray of Frost`.
   - Use the spell target, attack roll, and cold damage fills.
   - Validated damage hole: `battle:spell:damage-result:ray_of_frost:1d8-cold`.

6. Wizard ends turn.

7. `skeleton-a` ends turn without acting.
   - This keeps the demo moving and avoids overloading the presentation.

8. `skeleton-b` attacks Fighter with Shortsword.
   - Validated damage hole: `battle:attack:damage-result:1d6+3-piercing`.
   - Echo `rollMode` from the attack-roll hole if present.

9. `skeleton-b` ends turn.

10. Goblin attacks Fighter with Scimitar.
    - Validated damage hole: `battle:attack:damage-result:1d6+2-slashing`.
    - Echo `rollMode` from the attack-roll hole if present.

11. Goblin ends turn.

12. Fighter uses Second Wind.
    - Discover acts first and require `Second Wind`.
    - Important protocol detail: this is not a no-hole `resolve_battle_act`.
    - Fill the healing roll through `fill_battle_hole` with subject `{ tag: "unitFeature", actorId: "fighter", unitId: "fighter_second_wind" }`.
    - Validated healing hole: `battle:unit-feature:fighter_second_wind:healing-roll`.

13. Fighter ends turn.

14. Wizard casts Magic Missile on `skeleton-b`.
    - Discover acts first and require `Magic Missile`.
    - Allocate all three darts to `skeleton-b`.
    - Validated allocation hole: `battle:spell:target-allocation:magic_missile`.
    - Validated damage hole: `battle:spell:damage-result:magic_missile:3d4+3-force`.

## Spark Instructions

Spark should not infer executable support from Surface alone. On every combatant turn, call `discover_battle_acts` and select only from returned acts.

When filling attack rolls, read the returned attack-roll hole and copy `rollMode` into the fill if the hole includes it.

When an attack roll returns `result.tag: "resolved"`, treat that as a completed miss or no-damage result and continue to the next planned beat. Do not send a stale damage fill.

For `Second Wind`, use `fill_battle_hole`, not `resolve_battle_act`, because the feature has a healing-roll hole.

The scenario is intentionally deterministic. Spark should not choose alternate targets or alternate spells unless a required act is absent; if an act is absent, it should stop and report the missing act instead of inventing a fallback.

## Validation Notes

The scenario was tested with a short per-step delay through the real MCP tool handler and completed successfully as:

`battle:admin-spark-scenario-1781207075269`

The validation published to the `live-demo` mirror session and exercised character creation projections, battle projections, presentation timeline updates, Action Surge, Second Wind, Ray of Frost, Magic Missile, Skeleton attacks, and Goblin attacks.
