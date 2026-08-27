import type { OracleTraceStep } from "./oracle-case-trace-schema.ts";

type LifecycleState =
  | "creation"
  | "built"
  | "sheet"
  | "battle"
  | "battleResolved"
  | "terminal";

export function validOracleTraceLifecycle(trace: {
  readonly steps: readonly OracleTraceStep[];
}): boolean {
  const first = trace.steps[0];
  if (first === undefined || first.tag !== "creationStarted") return false;

  let state: LifecycleState = "creation";
  for (const [stepIndex, step] of trace.steps.entries()) {
    if (state === "terminal") return false;

    switch (step.tag) {
      case "creationStarted":
        if (stepIndex !== 0) return false;
        break;
      case "creationProgressed":
        if (state !== "creation") return false;
        break;
      case "characterBuilt":
        if (state !== "creation") return false;
        state = "built";
        break;
      case "characterSheetConstructed":
        if (state !== "built") return false;
        state = "sheet";
        break;
      case "battleEntered":
        if (state !== "sheet") return false;
        state = "battle";
        break;
      case "battleProgressed":
        if (state !== "battle") return false;
        if (step.frontier.kind === "terminal") state = "battleResolved";
        break;
      case "battleAttemptRejected":
        if (state !== "battle") return false;
        break;
      case "battleResolved":
        if (state !== "battle") return false;
        state = "battleResolved";
        break;
      case "creationFillRejected":
      case "creationFinalizationRejected":
        if (state !== "creation") return false;
        state = "terminal";
        break;
      case "characterSheetConstructionRejected":
        if (state !== "built") return false;
        state = "terminal";
        break;
      case "battleEntryRejected":
        if (state !== "sheet") return false;
        state = "terminal";
        break;
      case "workflowRejected":
        if (
          (state === "creation" &&
            step.reason.code === "creationInputExhausted") ||
          (state === "built" && step.reason.code === "creationInputSurplus") ||
          ((state === "battle" || state === "battleResolved") &&
            step.reason.code === "battleInputSurplus")
        ) {
          state = "terminal";
        } else {
          return false;
        }
        break;
    }
  }

  return (
    state === "battle" || state === "battleResolved" || state === "terminal"
  );
}
