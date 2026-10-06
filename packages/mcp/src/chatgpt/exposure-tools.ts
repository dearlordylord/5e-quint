import { Match } from "effect";
import {
  CHATGPT_OPERATION_EXPOSURE,
  type ChatGptToolName,
} from "./operation-tool-plan.ts";
import type {
  ChatGptExposure,
  ChatGptExposureAccounting,
} from "./operation-exposure.ts";

const accounting: ChatGptExposureAccounting = CHATGPT_OPERATION_EXPOSURE;

export function chatGptToolsForExposure(
  exposure: ChatGptExposure,
): readonly ChatGptToolName[] {
  const tools = Match.value(exposure).pipe(
    Match.when({ kind: "tools" }, (route) => route.tools),
    Match.when({ kind: "refine" }, (route) =>
      Object.values(accounting[route.family]).flatMap((child) =>
        chatGptToolsForExposure(child),
      ),
    ),
    Match.when({ kind: "refineOperations" }, (route) => {
      const children: Readonly<Record<string, ChatGptExposure>> =
        accounting[route.family];
      return route.operations.flatMap((operation) =>
        chatGptToolsForExposure(children[operation]),
      );
    }),
    Match.when({ kind: "boundContinuation" }, () => []),
    Match.when({ kind: "internal" }, () => []),
    Match.when({ kind: "unavailable" }, () => []),
    Match.exhaustive,
  );
  return [...new Set(tools)];
}
