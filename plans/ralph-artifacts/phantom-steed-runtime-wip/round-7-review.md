## Verdict: reject

## Findings

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-created-mount.ts:357` resolves the mount by calling `expendSpellSlot` directly. That bypasses the shared spell-cast resource path in `spells-resolve-resources.ts:65`, which spends the Magic action and marks spell-slot use for the turn. Result: Phantom Steed can leave `currentTurnResources` unchanged, allowing another Magic action or slotted spell in the same turn, and stale subjects can resolve after turn resources were spent.

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-created-mount.ts:223` exposes `completedLongCastSpell` as an ordinary discovered act. `spells-discovery.ts:104` offers it whenever the actor has spell resources, but SRD 5.2.1 longer casting requires Magic actions on each turn and Concentration while casting (`.references/srd-5.2.1/Spells/Gaining-and-Casting.md:102`). This creates the mount in one resolution with no long-cast state, completion witness, or concentration-failure path.

- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-created-mount.ts:357` adds the steed as a normal stat-block combatant, and `api-lifecycle.ts:361` inserts it into Initiative. Generic discovery then grants stat-block actors Attack/Multiattack surfaces (`battle-discovery.ts:327`, `battle-discovery.ts:1721`). That contradicts the generated claim that mounted control is deferred and “does not unlock the mount's separate turn” (`plans/unit-profile-coverage/srd-unit-inventory.json:39860`).

- `plans/rules-kernel-coverage/obligations.jsonl:42` marks `BATTLE.SPELL.SPELL_CREATED_MOUNT_LIFECYCLE` covered, but lists only a runtime test as parity evidence. Task 23 requires promoted Quint/runtime parity and focused MBT for battle-runtime behavior changes; there is no focused `*.mbt.qnt` / `*.mbt.test.ts` for this owner.

## Missing verification

- Ran focused runtime test: `pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission-phantom-steed.test.ts` passed.
- Ran QNT run-block proof: `pnpm --filter @dnd/battle-runtime exec quint test battle-runtime-spell-created-mount.qnt` passed.
- Missing required focused MBT parity lane. I checked for live `vitest` and `quint_evaluator` processes before finalizing; none were running.
- Shared lane / generated coverage check was not run.

## Merge notes

- Base check passed: `master` is `bc6fafcca`; `HEAD` is `04ccdbb2`, equal to the task Base SHA, and the Base SHA is an ancestor.
- Implementation changes are uncommitted. Several new implementation files are untracked, along with untracked `node_modules` directories.

## Plan Impact

Task 23 should not be accepted until mount creation is gated behind a real long-cast completion boundary, spell-cast resources are committed through the normal resource path, the mount cannot act independently unless mounted-control is actually implemented, and the matrix parity claim is backed by focused MBT evidence or downgraded.