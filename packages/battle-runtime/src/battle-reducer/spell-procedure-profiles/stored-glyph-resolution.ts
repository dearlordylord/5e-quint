import type { BattleResolutionResult } from "../../battle-state-execution.ts";
import { Match } from "effect";
import { resolveStoredGlyphAreaOngoingSpellRelease } from "../spells-resolve-area-effects.ts";
import {
  resolveGreaseGroundHazardSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateDamageSpellRelease,
} from "../spells-resolve-save-gates.ts";
import { resolveSpellRelease } from "../spells-resolve-release.ts";
import {
  spellProcedureExecutionFor,
  type SpellProcedureExecutionRegistry,
} from "./execution-registry.ts";
import { resolveStoredGlyphAreaControlSpellRelease } from "./hypnotic-pattern.ts";
import type { StoredGlyphSpellProcedureResolution } from "./resolution-contract.ts";
import { resolveStoredGlyphSelfTransformationModeSpellRelease } from "./self-transformation-mode.ts";

const byReleaseKind = Match.discriminator("kind");
const byProcedure = Match.discriminator("procedure");

export function executeStoredGlyphSpellProcedure(
  resolution: StoredGlyphSpellProcedureResolution,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const { input, actorId, fillSet, replay } = resolution;
  const glyphInput = {
    ...input,
    glyphStoredSpellReleaseReplay: replay,
  } as const;
  return Match.value(resolution.release).pipe(
    byReleaseKind("areaOngoing", (release) =>
      resolveStoredGlyphAreaOngoingSpellRelease({
        input: glyphInput,
        actorId,
        invocation: release.invocation,
        fillSet,
        selfOriginAreaAnchorId: release.anchorId,
      }),
    ),
    byReleaseKind("areaControl", (release) =>
      resolveStoredGlyphAreaControlSpellRelease({
        input: glyphInput,
        actorId,
        invocation: release.invocation,
        fillSet,
        selfOriginAreaAnchorId: release.anchorId,
      }),
    ),
    byReleaseKind("greaseGroundHazard", (release) =>
      resolveGreaseGroundHazardSpellAct({
        input: glyphInput,
        actorId,
        invocation: release.invocation,
        fillSet,
        spendsCastResources: false,
      }),
    ),
    byReleaseKind("saveGatedCondition", (release) =>
      resolveSaveGateConditionSpellAct({
        input: glyphInput,
        actorId,
        invocation: release.invocation,
        fillSet,
        spendsCastResources: false,
      }),
    ),
    byReleaseKind("fullDurationSaveGatedDamage", (release) =>
      resolveSaveGateDamageSpellRelease({
        input: glyphInput,
        actorId,
        invocation: release.invocation,
        fillSet,
        opensSpellCastReactionWindow: false,
        startsOrdinaryConcentration: false,
      }),
    ),
    byReleaseKind("singleCreatureActiveEffect", (release) => {
      const releaseInput = {
        input: glyphInput,
        actorId,
        fillSet,
        storedGlyphRelease: { kind: "storedGlyphSpellRelease" },
      } as const;
      return Match.value(release.invocation).pipe(
        byProcedure("scalarBuff", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("rollModifier", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("creatureSizeIncrease", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("creatureSizeDecrease", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("levitatedCreature", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("directCondition", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("hastePositive", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure("creatureTypeProtection", (invocation) =>
          spellProcedureExecutionFor(
            executionRegistry,
            invocation.procedure,
          ).resolve({ ...releaseInput, invocation }),
        ),
        byProcedure(
          "conditionImmunityAndTurnStartTemporaryHitPoints",
          (invocation) =>
            spellProcedureExecutionFor(
              executionRegistry,
              invocation.procedure,
            ).resolve({ ...releaseInput, invocation }),
        ),
        Match.exhaustive,
      );
    }),
    byReleaseKind("selfTransformation", (release) =>
      resolveStoredGlyphSelfTransformationModeSpellRelease({
        state: glyphInput.state,
        subject: glyphInput.subject,
        targetId: release.targetId,
        sourceCombatantId: actorId,
        invocation: release.invocation,
        fills: glyphInput.fills,
        fillSet,
      }),
    ),
    byReleaseKind("ordinaryArea", (release) =>
      resolveSpellRelease(glyphInput, release.invocation, {
        selfOriginAreaAnchorId: release.anchorId,
        opensSpellCastReactionWindow: false,
      }),
    ),
    byReleaseKind("ordinaryTriggeringCreature", (release) =>
      resolveSpellRelease(glyphInput, release.invocation, {
        storedGlyphTriggeringCreatureTargetId: release.targetId,
        opensSpellCastReactionWindow: false,
      }),
    ),
    Match.exhaustive,
  );
}
