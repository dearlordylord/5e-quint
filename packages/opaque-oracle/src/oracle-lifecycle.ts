import { Match } from "effect";
import type { OracleTraceStep } from "./oracle-case-trace-schema.ts";

type LifecycleState =
  | "creation"
  | "built"
  | "sheet"
  | "battle"
  | "battleResolved"
  | "terminal";

type LifecycleTransition =
  | { readonly accepted: false }
  | { readonly accepted: true; readonly state: LifecycleState };

export function validOracleTraceLifecycle(trace: {
  readonly steps: readonly OracleTraceStep[];
}): boolean {
  const first = trace.steps[0];
  if (first === undefined || first.tag !== "creationStarted") return false;

  let state: LifecycleState = "creation";
  for (const [stepIndex, step] of trace.steps.entries()) {
    if (state === "terminal") return false;

    const currentState: LifecycleState = state;
    const transition = Match.value(step).pipe(
      Match.discriminatorsExhaustive("tag")({
        creationStarted: (): LifecycleTransition =>
          stepIndex === 0
            ? { accepted: true, state: "creation" }
            : { accepted: false },
        creationProgressed: (): LifecycleTransition =>
          currentState === "creation"
            ? { accepted: true, state: currentState }
            : { accepted: false },
        characterBuilt: (): LifecycleTransition =>
          currentState === "creation"
            ? { accepted: true, state: "built" }
            : { accepted: false },
        characterSheetConstructed: (): LifecycleTransition =>
          currentState === "built"
            ? { accepted: true, state: "sheet" }
            : { accepted: false },
        battleEntered: (): LifecycleTransition =>
          currentState === "sheet"
            ? { accepted: true, state: "battle" }
            : { accepted: false },
        battleProgressed: (value): LifecycleTransition => {
          if (currentState !== "battle") return { accepted: false };
          const nextState: LifecycleState = Match.value(value.frontier).pipe(
            Match.discriminatorsExhaustive("kind")({
              acts: (): LifecycleState => "battle",
              ordinaryHoles: (): LifecycleState => "battle",
              interruptDecision: (): LifecycleState => "battle",
              terminal: (): LifecycleState => "battleResolved",
            }),
          );
          return { accepted: true, state: nextState };
        },
        battleAttemptRejected: (): LifecycleTransition =>
          currentState === "battle"
            ? { accepted: true, state: currentState }
            : { accepted: false },
        battleResolved: (): LifecycleTransition =>
          currentState === "battle"
            ? { accepted: true, state: "battleResolved" }
            : { accepted: false },
        creationFillRejected: (): LifecycleTransition =>
          currentState === "creation"
            ? { accepted: true, state: "terminal" }
            : { accepted: false },
        creationFinalizationRejected: (): LifecycleTransition =>
          currentState === "creation"
            ? { accepted: true, state: "terminal" }
            : { accepted: false },
        characterSheetConstructionRejected: (): LifecycleTransition =>
          currentState === "built"
            ? { accepted: true, state: "terminal" }
            : { accepted: false },
        battleEntryRejected: (): LifecycleTransition =>
          currentState === "sheet"
            ? { accepted: true, state: "terminal" }
            : { accepted: false },
        workflowRejected: (value) =>
          Match.value(value.reason).pipe(
            Match.discriminatorsExhaustive("code")({
              creationInputExhausted: (): LifecycleTransition =>
                currentState === "creation"
                  ? { accepted: true, state: "terminal" }
                  : { accepted: false },
              creationInputSurplus: (): LifecycleTransition =>
                currentState === "built"
                  ? { accepted: true, state: "terminal" }
                  : { accepted: false },
              battleInputSurplus: (): LifecycleTransition =>
                currentState === "battle" || currentState === "battleResolved"
                  ? { accepted: true, state: "terminal" }
                  : { accepted: false },
            }),
          ),
      }),
    );
    if (!transition.accepted) return false;
    state = transition.state;
  }

  return (
    state === "battle" || state === "battleResolved" || state === "terminal"
  );
}
