/**
 * Generates a throwaway XState machine whose state topology mirrors
 * the current interrupt stack depth. Fed to SubMachineViz for rendering —
 * never executed as a real actor.
 *
 * Each interrupt node contains child states for the available reaction
 * choices and resolution outcomes, so the viz shows the internal flow.
 */
import { setup } from "xstate";

import type {
  BattleContext,
  PendingInterrupt,
  SpellStackEntry,
} from "#/battle-machine-types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatesConfig = Record<string, any>;

/** Reaction choices and resolution substates for each interrupt type */
function interruptInternals(pi: PendingInterrupt): {
  label: string;
  states: StatesConfig;
} {
  switch (pi.tag) {
    case "PIAttackHit":
      return {
        label: "attackHits",
        states: {
          awaiting: {
            on: {
              SHIELD: "shieldApplied",
              PARRY: "parryApplied",
              CUTTING_WORDS: "cuttingWordsApplied",
              PASS: "resolved",
            },
          },
          shieldApplied: { on: { RECHECK_HIT: "resolved" } },
          parryApplied: { on: { RECHECK_HIT: "resolved" } },
          cuttingWordsApplied: { on: { RECHECK_HIT: "resolved" } },
          resolved: { type: "final" as const },
        },
      };
    case "PIAttackDamage":
      return {
        label: "attackDamage",
        states: {
          awaiting: {
            on: {
              UNCANNY_DODGE: "halved",
              DEFLECT_ATTACKS: "reduced",
              PASS: "fullDamage",
            },
          },
          halved: { on: { APPLY: "resolved" } },
          reduced: { on: { APPLY: "resolved" } },
          fullDamage: { on: { APPLY: "resolved" } },
          resolved: { type: "final" as const },
        },
      };
    case "PIAfterDamage":
      return {
        label: "afterDamage",
        states: {
          awaiting: {
            on: {
              HELLISH_REBUKE: "retaliationSave",
              FIRE_SHIELD: "retaliationDamage",
              RETALIATION_ATTACK: "retaliationAttack",
              PASS: "concCheck",
            },
          },
          retaliationSave: { on: { RESOLVE: "concCheck" } },
          retaliationDamage: { on: { RESOLVE: "concCheck" } },
          retaliationAttack: { on: { RESOLVE: "concCheck" } },
          concCheck: { on: { RESOLVE: "resolved" } },
          resolved: { type: "final" as const },
        },
      };
    case "PISpellCast":
      return {
        label: "spellCast",
        states: {
          awaiting: {
            on: {
              COUNTERSPELL: "counterWindow",
              PASS: "spellResolves",
            },
          },
          counterWindow: {
            on: {
              CHECK_SUCCEEDS: "spellCountered",
              CHECK_FAILS: "spellResolves",
              COUNTER_COUNTERSPELL: "chainDeeper",
            },
          },
          chainDeeper: {},
          spellCountered: { type: "final" as const },
          spellResolves: { type: "final" as const },
        },
      };
    case "PISaveFailed":
    case "PISaveFailedAoE":
      return {
        label: pi.tag === "PISaveFailed" ? "saveFailed" : "saveFailedAoE",
        states: {
          awaiting: {
            on: {
              LEGENDARY_RESISTANCE: "saveFlipped",
              PASS: "effectApplied",
            },
          },
          saveFlipped: { type: "final" as const },
          effectApplied: { type: "final" as const },
        },
      };
  }
}

function counterspellInternals(
  entry: SpellStackEntry,
  depth: number,
): { label: string; states: StatesConfig } {
  return {
    label: `counterspell_${depth}`,
    states: {
      awaiting: {
        on: {
          COUNTERSPELL: "counterWindow",
          PASS: `${entry.spellName}_resolves`,
        },
      },
      counterWindow: {
        on: {
          CHECK_SUCCEEDS: "spellCountered",
          CHECK_FAILS: `${entry.spellName}_resolves`,
          COUNTER_COUNTERSPELL: "chainDeeper",
        },
      },
      chainDeeper: {},
      spellCountered: { type: "final" as const },
      [`${entry.spellName}_resolves`]: { type: "final" as const },
    },
  };
}

/** Wrap a node's states inside its parent, nesting from bottom of chain up */
function wrapChain(
  nodes: ReadonlyArray<{ label: string; states: StatesConfig }>,
  depth: number,
): StatesConfig {
  const node = nodes[depth];
  if (depth === nodes.length - 1) {
    // Deepest — show full internals
    return { [node.label]: { initial: "awaiting", states: node.states } };
  }
  // This node contains the next level nested inside its "chainDeeper" or as a child
  const childStates = wrapChain(nodes, depth + 1);
  const childKey = nodes[depth + 1].label;

  // Build patched states: replace "chainDeeper" placeholder with the nested child,
  // and rewrite transitions that pointed to "chainDeeper" to point to childKey.
  const patchedEntries = Object.entries(node.states)
    .filter(([k]) => k !== "chainDeeper")
    .map(([sk, sv]): [string, StatesConfig] => {
      if (sv && typeof sv === "object" && sv.on) {
        const patchedOn = Object.fromEntries(
          Object.entries(sv.on as Record<string, string>).map(([ek, ev]) => [
            ek,
            ev === "chainDeeper" ? childKey : ev,
          ]),
        );
        return [sk, { ...sv, on: patchedOn }];
      }
      return [sk, sv as StatesConfig];
    });

  const patchedStates: StatesConfig = {
    ...Object.fromEntries(patchedEntries),
    [childKey]: {
      initial: "awaiting",
      states: childStates[childKey].states,
    },
  };

  return { [node.label]: { initial: "awaiting", states: patchedStates } };
}

/** Empty machine — no interrupts active */
const IDLE_MACHINE = setup({}).createMachine({
  id: "interrupt",
  initial: "activeTurn",
  states: { activeTurn: {} },
});

export function buildInterruptVisMachine(ctx: BattleContext) {
  if (!ctx.awaitCtx) return IDLE_MACHINE;

  // Build chain: root interrupt, then counterspell stack entries
  const nodes: ReadonlyArray<{ label: string; states: StatesConfig }> = [
    interruptInternals(ctx.awaitCtx.interrupt),
    ...ctx.spellStack.map((entry, i) => counterspellInternals(entry, i + 1)),
  ];

  const wrapped = wrapChain(nodes, 0);
  const rootKey = nodes[0].label;

  return setup({}).createMachine({
    id: "interrupt",
    initial: "activeTurn",
    states: {
      activeTurn: {
        initial: rootKey,
        states: wrapped,
      },
    },
  });
}

export function deepestInterruptKey(ctx: BattleContext): string {
  if (!ctx.awaitCtx) return "activeTurn";
  return "awaiting";
}
