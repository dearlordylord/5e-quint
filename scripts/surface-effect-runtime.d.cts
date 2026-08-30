export type SurfaceEffectRuntimePaths = {
  readonly effectDirectory: string;
  readonly effectEntry: string;
  readonly schemaAstEntry: string;
};

export function resolveSurfaceEffectRuntimePaths(options: {
  readonly surfacePackageDirectory: string;
  readonly resolveModule: (specifier: string) => string;
  readonly realpath: (path: string) => string;
}): SurfaceEffectRuntimePaths;

export const surfaceEffect: typeof import("effect");
export const surfaceSchemaAst: typeof import("effect/SchemaAST");
