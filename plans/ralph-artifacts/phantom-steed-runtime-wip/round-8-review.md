## Verdict: reject

## Findings

1. [packages/battle-runtime/src/battle-reducer/spells-resolve.ts](/workspace/typescript/dnd/.worktrees/ralph/l5-c-20260618123501-launch/.worktrees/ralph/l5-c-20260618123501/task-23-attempt-1/implementation/packages/battle-runtime/src/battle-reducer/spells-resolve.ts:3223): `resolveCompletedLongCastSpellAct` skips the shared `spellActTurnResourceAvailable` gate used by ordinary action/bonus-action spell resolution. It checks spell-slot availability, but it does not reject the Quickened level-1+ same-turn lock or other turn-resource gates before delegating to the profile. A manually supplied `completedLongCastSpell` subject can therefore complete Phantom Steed after a Quickened level-1+ cast in the same turn, diverging from the existing spellcasting protocol. Add the same gate used by action spell resolution before parsing fills/delegating.

2. [packages/battle-runtime/src/battle-reducer/spell-created-mount-state.ts](/workspace/typescript/dnd/.worktrees/ralph/l5-c-20260618123501-launch/.worktrees/ralph/l5-c-20260618123501/task-23-attempt-1/implementation/packages/battle-runtime/src/battle-reducer/spell-created-mount-state.ts:40) and [packages/battle-runtime/src/battle-reducer/battle-codecs.ts](/workspace/typescript/dnd/.worktrees/ralph/l5-c-20260618123501-launch/.worktrees/ralph/l5-c-20260618123501/task-23-attempt-1/implementation/packages/battle-runtime/src/battle-reducer/battle-codecs.ts:208): the lifecycle type/codec permits `spellActive` or `fadingAfterSpellEnd` states with `0` ticks remaining. The reducer helpers expire at `<= 0`, so those states are not meaningful durable lifecycle states; accepting them leaves an active/fading mount that should already have transitioned or been removed. Use a positive tick type/schema for remaining spell duration and grace, or split the zero boundary into the transition/removal result so invalid lifecycle states are unrepresentable.

## Missing verification

I did not run tests or MBT because the rejection is based on static review findings. After fixes, run the focused Phantom Steed runtime test and the focused MBT lane per AGENTS.md, with the required process checks before MBT.

## Merge notes

Task-base check passed. `master` is `bc6fafcca`, `HEAD` is `04ccdbb2b`, and `04ccdbb2b336d228accecdadf99aef25d05c5602` is an ancestor of `HEAD`.

The worktree has untracked `node_modules` directories. Keep those out of the submitted patch.

## Plan Impact

The implementation does not appear to implement created equipment cleanup or table travel pace prematurely. It does add/record new follow-ups for long-cast progress and mounted-control state; that looks like an honest split, but the plan should be updated intentionally if those task IDs are kept.