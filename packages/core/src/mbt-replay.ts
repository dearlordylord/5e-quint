/**
 * Replay MBT traces from pre-generated ITF files.
 *
 * Generate traces:
 *   npx quint run --seed=0xf00dcafe --max-samples=10 --max-steps=5 --mbt \
 *     --n-traces=1 --out-itf='traces/trace_{seq}.itf.json' \
 *     battle.qnt --main=battle --init=bInit --step=battleStep
 *
 * Replay (skips Quint evaluator — instant):
 *   MBT_REPLAY_DIR=../traces npx vitest run src/battle.mbt.test.ts
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  type SimpleActionMap,
  type SimpleDriver,
  transformITFValue,
} from "@firfi/quint-connect";

export interface ItfTraceRaw {
  readonly vars: ReadonlyArray<string>;
  readonly states: ReadonlyArray<Record<string, unknown>>;
  readonly "#meta"?: Record<string, unknown>;
}

/** Read ITF trace files from a directory. */
export async function loadTracesFromDir(
  dir: string,
): Promise<ReadonlyArray<ItfTraceRaw>> {
  const files = await readdir(dir);
  const itfFiles = files.filter((f) => f.endsWith(".itf.json")).sort();
  const traces = await Promise.all(
    itfFiles.map(
      async (file) =>
        JSON.parse(await readFile(join(dir, file), "utf-8")) as ItfTraceRaw,
    ),
  );
  return traces;
}

/** Replay pre-generated ITF traces through a driver + state check.
 *  Returns the number of traces replayed. Throws on mismatch. */
export async function replayFromDir<S, Actions extends SimpleActionMap>(opts: {
  dir: string;
  driver: () => SimpleDriver<S, Actions> | Promise<SimpleDriver<S, Actions>>;
  stateCheck?: {
    deserializeState: (raw: unknown) => S;
    compareState: (spec: S, impl: S) => boolean;
  };
}): Promise<{ tracesReplayed: number }> {
  const traces = await loadTracesFromDir(opts.dir);
  if (traces.length === 0)
    throw new Error(`No .itf.json files found in ${opts.dir}`);

  for (let ti = 0; ti < traces.length; ti++) {
    const trace = traces[ti];
    const drv = await Promise.resolve(opts.driver());

    for (let si = 0; si < trace.states.length; si++) {
      const rawState = trace.states[si];
      const action = rawState["mbt::actionTaken"] as string | undefined;
      const rawPicks = rawState["mbt::nondetPicks"] as
        | Record<string, unknown>
        | undefined;

      if (!action || action === "q::init") continue; // skip Quint init (no mbt metadata)

      // Build picks map (raw ITF values — schema decoding handles transformation)
      const picks = new Map<string, unknown>();
      if (rawPicks) {
        for (const [k, v] of Object.entries(rawPicks)) {
          picks.set(k, v);
        }
      }

      // Dispatch action through driver
      if (drv.step) {
        await Promise.resolve(drv.step(action, picks));
      } else if (action in drv.actions) {
        const actionDef = drv.actions[action] as {
          picks?: Record<
            string,
            { "~standard": { validate: (v: unknown) => { value: unknown } } }
          >;
          handler: (picks: Record<string, unknown>) => void | Promise<void>;
        };
        // Unwrap ITF Option (Some/None) and validate through the action's schema.
        const picksObj: Record<string, unknown> = {};
        if (actionDef.picks) {
          for (const [k, schema] of Object.entries(actionDef.picks)) {
            const raw = picks.get(k);
            if (raw === undefined) continue;
            // Unwrap ITF Option
            const opt = raw as { tag?: string; value?: unknown };
            if (opt.tag === "None") continue;
            const unwrapped = opt.tag === "Some" ? opt.value : raw;
            const transformed = transformITFValue(unwrapped);
            const result = schema["~standard"].validate(transformed) as {
              value?: unknown;
              issues?: unknown;
            };
            if (result.issues) continue; // validation failed, use default
            picksObj[k] = result.value;
          }
        }
        await Promise.resolve(actionDef.handler(picksObj));
      } else if (si > 0 && action !== "init" && action !== "step") {
        throw new Error(`Unknown action: ${action} at trace ${ti} step ${si}`);
      }

      // State comparison
      if (opts.stateCheck && drv.getState) {
        // Strip metadata keys, then transform entire object (matches quint-connect's pipeline)
        const stripped: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawState)) {
          if (k.startsWith("#") || k.startsWith("mbt::")) continue;
          stripped[k] = v;
        }
        const transformed = transformITFValue(stripped) as Record<
          string,
          unknown
        >;
        const specState = opts.stateCheck.deserializeState(transformed);
        const implState = drv.getState();

        if (!opts.stateCheck.compareState(specState, implState)) {
          const err = new Error(
            `State mismatch at trace ${ti}, step ${si}, action "${action}" (replay)\n` +
              `Expected: ${JSON.stringify(specState)}\nActual: ${JSON.stringify(implState)}`,
          );
          err.name = "StateMismatchError";
          throw err;
        }
      }
    }
  }

  return { tracesReplayed: traces.length };
}
