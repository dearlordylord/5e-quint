import { Schema } from "effect";

import {
  ResolvedActionTokenSchema,
  type AuthoredBattleResolvedActionToken,
  type ResolvedActionToken,
} from "@dnd/core/available-actions.ts";

import { errorContent } from "./server-shared.ts";

type SchemaAstNode = {
  readonly _tag: string;
  readonly types?: ReadonlyArray<SchemaAstNode>;
  readonly from?: SchemaAstNode;
  readonly propertySignatures?: ReadonlyArray<{
    readonly name: PropertyKey;
    readonly type: SchemaAstNode;
  }>;
  readonly literal?: unknown;
};

function addResolvedActionTypesFromAst(
  ast: SchemaAstNode,
  actionTypes: Set<string>,
): void {
  if (ast._tag === "Union" && ast.types) {
    for (const type of ast.types) {
      addResolvedActionTypesFromAst(type, actionTypes);
    }
    return;
  }

  if (ast._tag === "Transformation" && ast.from) {
    addResolvedActionTypesFromAst(ast.from, actionTypes);
    return;
  }

  if (ast._tag !== "TypeLiteral" || !ast.propertySignatures) {
    return;
  }

  for (const property of ast.propertySignatures) {
    if (property.name !== "type") continue;
    if (property.type._tag !== "Literal") continue;
    if (typeof property.type.literal !== "string") continue;
    actionTypes.add(property.type.literal);
  }
}

function resolvedActionTypesFromSchema(): ReadonlySet<string> {
  const actionTypes = new Set<string>();
  addResolvedActionTypesFromAst(
    ResolvedActionTokenSchema.ast as SchemaAstNode,
    actionTypes,
  );
  return actionTypes;
}

const RESOLVED_ACTION_TYPES = resolvedActionTypesFromSchema();
const AUTHORED_BATTLE_ACTION_TYPES = new Set<string>([
  "USE_ACTION_SURGE",
  "ENTER_RAGE",
  "DECLARE_RECKLESS",
  "USE_UNCANNY_DODGE",
]);

function unknownActionTypeContent(
  toolName: "execute_action" | "preview_action",
  type: unknown,
) {
  const messageType =
    typeof type === "string" ? type : type == null ? "(missing)" : String(type);
  return errorContent(`Unknown ${toolName} type: ${messageType}`, {
    code: "UNKNOWN_ACTION_TYPE",
    type: typeof type === "string" ? type : null,
  });
}

export function decodeResolvedActionInput(
  toolName: "execute_action" | "preview_action",
  args: unknown,
): ResolvedActionToken | ReturnType<typeof errorContent> {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return unknownActionTypeContent(toolName, null);
  }

  const type = Reflect.get(args, "type");
  if (typeof type !== "string") {
    return unknownActionTypeContent(toolName, type);
  }
  if (!RESOLVED_ACTION_TYPES.has(type)) {
    return unknownActionTypeContent(toolName, type);
  }

  const decoded = Schema.decodeUnknownEither(ResolvedActionTokenSchema)(args);
  if (decoded._tag === "Left") {
    return errorContent(`Invalid ${toolName} input`, String(decoded.left));
  }

  const scope = Reflect.get(args, "scope");
  if (scope === "authoredBattle" && AUTHORED_BATTLE_ACTION_TYPES.has(type)) {
    return {
      ...decoded.right,
      ...(args as Record<string, unknown>),
      scope,
    } as AuthoredBattleResolvedActionToken;
  }

  return decoded.right;
}
