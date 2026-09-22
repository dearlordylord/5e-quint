# MCP starting equipment and weapon support

Research date: 2026-09-13. Source revision: `743715d0b`. This is an
implementation investigation, not a new rules or architecture contract. See
[context ownership](../../CONTEXT-MAP.md) and the
[creation equipment contract](../../packages/character-creation-runtime/README.md#equipment).

The weapons exist, but catalog presence, starting inventory, mastery selection,
and equipped battle weapons have different admission paths. The reported
published `@dearlordylord/dnd-mcp@0.1.1` trials exposed gaps between them and
verified one working armed path. The source paths inspected below still contain
those gaps. The live trials were performed by the parallel play agent; this
note combines its results with source inspection, not a claim of a new fix.

## Rules context

The local [Fighter rules](../../.references/srd-5.2.1/classes.md)
(line 13) offer A: Chain Mail, Greatsword, Flail, eight Javelins, a pack, and
4 GP; B: Studded Leather Armor, Scimitar, Shortsword, Longbow, ammunition,
Quiver, a pack, and 11 GP; or C: 155 GP. Flail is not Whip. Longsword is
not in either fixed bundle, but starting coins may immediately buy equipment
([Character Creation](../../.references/srd-5.2.1/character-creation.md), lines
81–85). The [equipment table](../../.references/srd-5.2.1/equipment.md), lines
149 and 154, prices Longsword at 15 GP and Shortsword at 10 GP.

## What the implementation actually exposes

| Boundary                        | Evidence and consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog                         | [Longsword](../../packages/surface/content/weapon_longsword.json), [Shortsword](../../packages/surface/content/weapon_shortsword.json), and [Flail](../../packages/surface/content/weapon_flail.json) are authored weapon records. Their existence does not establish creation or battle admission.                                                                                                                                                                                                                                                                                                                                                         |
| Fighter bundles                 | [class_fighter.json](../../packages/surface/content/class_fighter.json), lines 105–169, represents A/B items as `draft_owned_item` with names, without weapon Unit references. [Finalization](../../packages/character-creation-runtime/src/finalization.ts), lines 4508–4514, preserves these as `authoredStartingItem` inventory.                                                                                                                                                                                                                                                                                                                         |
| Initial loadout discovery       | [discovery.ts](../../packages/character-creation-runtime/src/discovery.ts), lines 1462–1472, collects starting equipment Unit IDs only from `unit_ref` and `unit_ref_with_spellcasting_focus`. Thus neither Fighter bundle itself supplies loadout candidates, including its named Flail or armor. This explains an empty loadout after choosing a bundle.                                                                                                                                                                                                                                                                                                  |
| Purchases                       | [phase1-manifest.ts](../../packages/character-creation-runtime/src/phase1-manifest.ts), lines 150–157, admits Fighter purchases of Chain Mail, Longsword, Dagger, Quarterstaff, Flail, and Shield. Shortsword is absent. [discovery.ts](../../packages/character-creation-runtime/src/discovery.ts), lines 1332–1350, offers one to three purchase selections.                                                                                                                                                                                                                                                                                              |
| Purchase discovery prerequisite | [discovery.ts](../../packages/character-creation-runtime/src/discovery.ts), lines 1517–1542, requires both class and background selections to be `coin_grant`. Fighter C plus Soldier A therefore offers no purchase hole; Fighter C plus Soldier B meets this gate. This is an implementation restriction beyond simply having enough starting coins.                                                                                                                                                                                                                                                                                                      |
| Equipping during creation       | [support-gates.ts](../../packages/character-creation-runtime/src/support-gates.ts), lines 446–483, permits Chain Mail, Shield, and one-handed Longsword, Flail, or Quarterstaff. [discovery.ts](../../packages/character-creation-runtime/src/discovery.ts), lines 1355–1384, offers matching owned Unit candidates. Purchased Dagger is therefore not an available initial weapon loadout choice either.                                                                                                                                                                                                                                                   |
| Mastery selection               | [phase1-manifest.ts](../../packages/character-creation-runtime/src/phase1-manifest.ts), lines 200–211, offers Longsword, Dagger, Shortsword, Spear, Flail, Greataxe, and Quarterstaff. Choosing mastery does not give or equip that weapon.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Battle admission                | [battle-support-profiles.ts](../../packages/character-battle-runtime/src/battle-support-profiles.ts), lines 446–490, admits definitions for every selected mastery weapon. [weapon-definition.ts](../../packages/battle-runtime/src/procedure-admission/weapon-definition.ts), lines 70–80, rejects unsupported referenced mastery procedures. [weapon-mastery.ts](../../packages/battle-runtime/src/procedure-admission/weapon-mastery.ts), lines 37–44, admits Sap, Topple, Cleave, Push, and Slow. Dagger references Nick; Shortsword references Vex. Their offered creation masteries therefore fail this battle admission even without being equipped. |
| Actual attacks                  | [battle-character-build-projection.ts](../../packages/character-battle-runtime/src/battle-character-build-projection.ts), lines 564–576, derives weapon requests from the loadout's main/off-hand entries. Named inventory alone creates no weapon attack.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Later equipment changes         | The MCP [character-session operation union](../../packages/mcp/src/character-session-operation-tool-input.ts), lines 288–303, exposes no equip/loadout operation. The inspected API provides no session operation to repair this after finalization.                                                                                                                                                                                                                                                                                                                                                                                                        |

## Where weapons were added

Nick specifically is represented in the
[authored record](../../packages/surface/content/mastery_nick.json), lines 4–15,
parsed by [the Surface schema](../../packages/surface/src/surface/schema-nonspell.ts)
at line 2828, and handled by the
[Surface tracer](../../packages/surface/src/interpreter/tracer-mastery.ts) at
line 35. That is representation support, not executable Battle support:
[mastery admission](../../packages/battle-runtime/src/procedure-admission/weapon-mastery.ts),
lines 143–150, rejects its family because it is not `on_hit_trigger`. Ordinary
Light-property extra attacks are implemented separately and still spend a Bonus
Action ([attack-offhand.ts](../../packages/battle-runtime/src/battle-reducer/attack-offhand.ts),
lines 991–1000). Their existence does not implement Nick's timing replacement.

Located history distinguishes content additions from executable paths:

- [`9c48d2a00`](https://github.com/dearlordylord/5e-quint/commit/9c48d2a00)
  (2026-04-28), “Add equipment AC surface units,” added weapon content including
  Longsword and Dagger.
- [`c408edeb2`](https://github.com/dearlordylord/5e-quint/commit/c408edeb2)
  (2026-04-28), “Add SRD equipment surface coverage,” expanded equipment content.
- [`8764e123d`](https://github.com/dearlordylord/5e-quint/commit/8764e123d)
  (2026-08-12), “Support canonical starting equipment bundles,” preserved
  canonical starting inventory through creation.
- [`635156256`](https://github.com/dearlordylord/5e-quint/commit/635156256)
  (2026-08-13), “Expose authored starting loadout choices,” introduced discovery
  for referenced starting items; its content change specifically connected
  Wizard equipment, not Fighter's named bundle items.
- [`51a7f350d`](https://github.com/dearlordylord/5e-quint/commit/51a7f350d)
  (2026-09-02), “fix(mcp): admit battle-safe mastery scenarios,” adjusted MCP
  acceptance choices and added Quarterstaff to mastery choices. That scenario
  adjustment did not remove Dagger/Shortsword from creation discovery.
- [`0cf26d33b`](https://github.com/dearlordylord/5e-quint/commit/0cf26d33b)
  (2026-09-08), “feat: admit weapon definitions for character battle (#478),”
  added the strict weapon-definition admission path involved in this failure.

## Verified armed path and acceptance coverage

The parallel play agent completed a real stdio journey with
`pnpm dlx @dearlordylord/dnd-mcp@0.1.1`: choose Fighter C and Soldier B, purchase
Chain Mail/Longsword/Shield, fill the returned loadout holes, and select
Flail/Spear/Longsword masteries. The level-1 dwarf Fighter entered battle with
13 HP and AC 19. A Longsword attack dealt 8 slashing damage, reducing the Goblin
Warrior from 10 HP to 2 HP; ending the encounter retained the Fighter's 13 HP.
This working path supplies the armed README example. Temporary trial evidence
is in `/tmp/dnd-readme-armed-summary.md` and
`/tmp/dnd-readme-armed-redacted.jsonl`; these files are session artifacts, not
repository acceptance owners.

The starting-gold restriction is tracked in
[#501](https://github.com/dearlordylord/5e-quint/issues/501). Its issue owns the
follow-up requirements; this note records the observed boundary without
duplicating the bug report.

Existing acceptance already exercises purchases and equipping through the MCP:
[end-user-vertical.acceptance.test.ts](../../packages/mcp/src/end-user-vertical.acceptance.test.ts),
lines 92–130 and 175–217, and
[mcp-acceptance-scenarios.ts](../../packages/mcp/test-support/mcp-acceptance-scenarios.ts),
lines 750–789 and 882–911, use the same all-gold path and resolve a Longsword hit.
That proves the path exists; it does not cover every bundle or mixed-gold branch.

The [level-support gate](../../plans/unit-profile-coverage/LEVEL1_10_FULL_SUPPORT.md),
lines 58–69, combines four lower-level closure/readiness checks. Its equipment
readiness rows at lines 84–89 check that concrete references resolve, not that
every named starting item produces an executable loadout. The separate
[MCP scenario evidence](../../plans/unit-profile-coverage/mcp-scenario-evidence.json)
records representative journeys, while the
[packed MCP smoke](../../scripts/distribution/mcp-smoke.mjs), lines 15–24,
checks tool discovery and session creation. None of these cited checks alone
establishes complete end-user equipment coverage.

A bounded follow-up should extend those existing acceptance owners across
bundle, mixed-gold, and all-gold branches, checking inventory through loadout,
sheet, battle attack, and resolution, plus selected mastery admission and a
representative packed stdio journey. No new coverage registry or runtime changes
were introduced in this investigation.

## Nick: why the mismatch survives the gates

The missing RAW mechanic is specific: after the qualifying Light-weapon attack,
Nick permits the extra attack within the Attack action instead of spending a
Bonus Action, at most once per turn. The normal different-Light-weapon and
damage-modifier requirements remain part of the Light property. This was
checked by a bounded hidden/ignored-inclusive search followed by direct reading
of [equipment.md](../../.references/srd-5.2.1/equipment.md), lines 54–56,
83–85, and 97–99. The mastery also requires the character to have unlocked it.

There are independently maintained **admission decisions**, not two competing
Nick execution algorithms:

1. The authored weapon-to-mastery reference and parsed Nick timing shape are
   legitimate content facts. They do not promise runtime execution.
2. Creation's [weapon option list](../../packages/character-creation-runtime/src/phase1-manifest.ts),
   lines 200–211, independently admits Dagger as a selected mastery weapon.
   [support-gates.ts](../../packages/character-creation-runtime/src/support-gates.ts),
   line 441, uses that list as supported creation options. This establishes
   choice/finalization support, but does not carry Battle admission evidence.
3. Battle's [procedure admission](../../packages/battle-runtime/src/procedure-admission/weapon-mastery.ts),
   lines 143–150, independently requires an `on_hit_trigger` mastery and rejects
   Nick's timing family. The character-to-battle boundary then applies this
   check to selected mastery weapons, as documented above.
4. The manually authored [Unit claims](../../plans/unit-profile-coverage/unit-claims.jsonl),
   line 221, explicitly records Nick as `unsupported-profile`, with an
   `outside-battle-runtime` closure and a future timing owner. Line 74 describes
   Fighter Weapon Mastery as supported only for choice counts, advancement,
   and reselection, explicitly delegating selected mastery execution elsewhere.
   Generated reports project these claims; they are not independent execution
   implementations.

The local distinctions are coherent, but the product implication is not
enforced: an offered, finalized mastery choice need not be usable in Battle.
Calling all of these records the same duplicated “support fact” would obscure
the actual missing invariant across their owners.

Tests currently preserve the rejection. The
[mastery admission test](../../packages/battle-runtime/src/procedure-admission/weapon-mastery.test.ts),
lines 20–24 and 51–64, explicitly expects Nick to remain unsupported. The
[weapon definition test](../../packages/battle-runtime/src/procedure-admission/weapon-definition.test.ts),
starting at line 83, expects six admitted weapons out of nine canonical roots
after all nine references resolve. These are useful tests of truthful rejection,
but they cannot prove that every publicly offered mastery works.

The level-support denominator is the decisive reporting gap. The inspected
[SRD inventory](../../plans/unit-profile-coverage/srd-unit-inventory.json) has
no `mastery_nick` row; its Fighter mastery row is the level-1 selection container.
The [report generator](../../scripts/level1-full-support-report.cjs), lines
264–279 and 1390–1397, groups candidate Unit IDs from inventory rows in selected
level bands. It does not expand those candidates through the creation choices
to weapon-to-mastery references. Consequently Nick is absent from the strict
candidate denominator rather than counted as executable support. Additionally,
the same generator at lines 181–185 treats explicitly outside-Battle closures
as strict-closed, and its stronger unsupported-profile prohibition at lines
1300–1322 applies only to level-9/10 and spell-level-5 source rows. Merely adding
a level-1 Nick row with the existing closure would therefore not establish the
requested fail-on-missing-execution contract.

No Nick-specific Quint owner was found in the inspected `.qnt` corpus, nor a
Nick timing obligation in the existing obligation/profile inventories. The
[creation obligation](../../plans/rules-kernel-coverage/obligations.jsonl),
line 95, explicitly owns selected references without mastery-property behavior.
The existing reusable
[Light extra attack core](../../packages/shared-algebras/proofs/rule-core/action-turn-procedures.qnt),
lines 280–292, requires and spends `BonusActionCost`; it has no Nick timing
alternative. Its
[focused test](../../packages/shared-algebras/proofs/rule-core/action-turn-procedures-tests.qnt),
lines 5–20, tests that ordinary Bonus Action behavior. Thus ordinary Light
coverage is not a misplaced proof of Nick support: the timing extension is
missing from both inspected execution and formal ownership.

## Scope measurement before choosing a fix

The user prefers local fixes when fewer than ten distinct missing mechanics are
involved. The evidence here does **not** establish ten, or establish that a
general architectural change is necessary.

The fully traced creation mastery set contains seven weapon choices resolving
to five distinct mastery mechanics. Three mechanics admit (Sap, Cleave, Topple);
two do not (Nick, Vex). That is **exactly two distinct missing mechanics in this
bounded set**, not seven weapon gaps or one gap per affected layer. Graze is
excluded because no weapon offering its mastery was established in that set.

A read-only automated join also inspected all eight authored classes whose
spellcasting starts at level 1. It gathered cantrip IDs and spell IDs of level 1
from their canonical spell-access fields, deduplicated the IDs, and joined them
to existing Unit claims. The resulting 84 unique spell references comprised
59 supported claims, three partial claims, 15 unsupported claims, and seven
references without a matching standalone record/claim. The discovery path is
[discovery.ts](../../packages/character-creation-runtime/src/discovery.ts),
lines 371–522; the corresponding spell-choice keys admit all discovered options
in [support-gates.ts](../../packages/character-creation-runtime/src/support-gates.ts),
lines 533–565. This was an authored-choice/claim join, not a replay proving every
choice can finalize and enter a public encounter.

All 15 unsupported spell claims explicitly describe presentation/exploration
ownership; the three partial claims defer social knowledge, exploration, or
companion-control scope. They were excluded from the count of missing promised
Battle mechanics rather than used to inflate it. The seven absent-record
references are unresolved data/reachability candidates, not seven established
mechanics failures. This spell pass therefore added **zero confirmed distinct
missing Battle mechanics**. It does not prove that no other gaps exist.

The defensible project-wide statement remains a lower bound of two, with no
complete total established. This bounded pass excludes later levels,
multiclassing, other feature selections, and combinations of state. It cannot
justify a claim that the total is at least ten. Assess Nick/Vex implementation
locality before selecting a remedy; if they are isolated, local corrections are
the preferred next step. A separate disagreement-mechanism issue can capture
the general enforcement concern without making it a prerequisite for those
fixes. No separate general-enforcement issue was created in this investigation.

The locality review found bounded implementation paths: Vex can extend the
existing on-hit/active-effect machinery with a target-qualified next-attack
benefit; Nick can extend the existing Light extra-attack timing/cost contract
and its shared rule-core model. Nick needs particular care around interrupts
and once-per-turn usage because that resolver also serves other Bonus Action
attacks. Neither is just an admission-list edit, but neither demonstrated a
prerequisite for system-wide redesign.

Existing [equipment reconciliation issue #465](https://github.com/dearlordylord/5e-quint/issues/465)
records the owner-local admission work and deliberate unsupported mastery
rejections. Reuse that history when scoping follow-up work.

Mechanic implementation is now tracked in
[Nick #502](https://github.com/dearlordylord/5e-quint/issues/502) and
[Vex #503](https://github.com/dearlordylord/5e-quint/issues/503). Both retain
public MCP journey acceptance dependent on usable equipment/loadout and
handoff paths coordinated with #465, #466, and #472. Local runtime support
does not discharge that vertical requirement. No runtime fixes were made here.

## Conditional structural direction

Nick is a counterexample to a general contract, but its existence alone does
not establish that structural changes are the proportionate fix. If a broader
audit or local implementation exposes a repeated mechanism, the investigation
found reusable machinery already present:

- [Surface mechanics admission](../../packages/surface/src/surface/mechanics-admission.ts),
  lines 66–80, defines runtime-owned `admitUnit` and `admitStatBlock` callbacks.
  [Catalog installation](../../packages/surface/src/surface/catalog-install.ts),
  lines 191–212, applies supplied admission to every decoded root and rejects
  the installation atomically on issues. This is a general static admission
  boundary, not a guarantee that every public journey uses the same evidence.
- Spells provide a useful contrast:
  [admission-registry.ts](../../packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/admission-registry.ts),
  lines 44–59, derives static readers from the canonical runtime profile
  declarations. It expressly avoids a second ownership table. The
  [spell mechanics evidence](../../packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts),
  lines 61–78, distinguishes complete consumed-path evidence from partial roots
  with unowned paths. These mechanisms can ground general completeness checks;
  they are not evidence that all spells or all combinations currently work.
- The [catalog reference resolver](../../packages/surface/src/surface/unit-catalog-core.ts)
  has typed reference resolution and a weapon/mastery graph inspection at lines
  87–133. This proves reference integrity for that relationship. It does not
  itself establish a universal executable dependency closure across public
  creation, sheets, and encounters.

Independent decisions still meet without a shared end-to-end requirement:
creation's [support profile](../../packages/character-creation-runtime/src/support-gates.ts)
maintains option IDs, purchases, and loadout admissions; runtime procedure
readers establish executable facts; manually authored Unit claims and inventory
rows choose coverage scope. MCP
[creation discovery](../../packages/mcp/src/character-tools.ts), lines 116–130,
passes the creation profile to its projection rather than establishing Battle
admission for the resulting choices. The
[rules-kernel support join](../../scripts/rules-kernel-profile-join.cjs), lines
202–218, explicitly counts supported-claim Units with applicable profiles;
it cannot detect every reachable mechanic omitted from those claims. The
missing connection is between what the public workflow promises and the closure
of execution dependencies required to fulfill it, not another list of supported
features.

A possible general enforcement design would have three different obligations:

1. **Procedure shapes:** require explicit ownership/accounting for parsed
   mechanics branches using the existing procedure declarations and consumed/
   unowned evidence. Exhaustive matching prevents unnoticed schema branches;
   it does not make an explicit `unsupported` result implemented.
2. **Advertised data and dependencies:** derive the reachable authored graph
   from canonical records and actual public discovery/selection contracts, then
   require runtime admission evidence for the promised uses. Feed that same
   result into build checks and support reports. Do not maintain another
   per-feature support table, treat future-owner dispositions as successful
   execution, or silently hide choices to make the check pass. The existing
   catalog-admission and report owners are the relevant extension points.
3. **Stateful journeys:** drive generated public workflows from their discovered
   operations and typed inputs, asserting that accepted transitions preserve
   the admitted obligations through creation, sheet projection, battle entry,
   execution, and persistence. Extend the existing MCP acceptance/MBT owners;
   vary mechanics shapes and state transitions rather than writing one script
   per named feature. Valid generic input generation and environmental/table
   prerequisites still need explicit modeling. Static admission and TypeScript
   exhaustiveness alone cannot prove arbitrary semantic combinations.

The user's requested outcome is a build/test failure when an advertised journey
requires an unimplemented mechanic. The alternatives above explain possible
enforcement boundaries; they are not a recommendation to redesign the system
before fixing two isolated gaps. Defining a general shared admission carrier
would require additional design and proportionality evidence. This investigation
does not claim that a universal traversal or generated journey runner is already
complete. No new registry, feature filter, gate, or runtime implementation was
introduced.
