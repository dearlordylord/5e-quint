import { discoverInterpretedActs } from "#/reducer-interpretation.ts";
import type { State } from "#/reducer-state.ts";
import type { AvailableAct } from "#/reducer-types.ts";

export function discoverAvailableActs(
  state: State,
): ReadonlyArray<AvailableAct> {
  return discoverInterpretedActs(state).map(
    ({ initialHoles, label, subject, summary }) => ({
      subject,
      label,
      summary,
      initialHoles,
    }),
  );
}
