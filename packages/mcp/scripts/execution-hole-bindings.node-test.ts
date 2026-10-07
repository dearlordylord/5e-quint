import { constructionKinds } from "./execution-type-projection.ts";
import { API } from "@typescript/native/unstable/sync";
import {
  isCallExpression as isNativeCallExpression,
  isObjectLiteralExpression as isNativeObjectLiteralExpression,
} from "@typescript/native/unstable/ast/is";
import type { Node as NativeNode } from "@typescript/native/unstable/ast";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  nativeProjectionOperations,
  registryFactoryCall,
  genericFrontierResults,
} from "./operation-accounting-compiler.ts";
import { executionGenericOrdinaryFrontierCalls } from "./execution-owner-frontiers.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
import { resolve } from "node:path";
import {
  executionHoleConstructions,
  namedCallImplementation,
} from "./execution-hole-constructions.ts";

function fixtureProgram(
  source: string,
  main = resolve("/synthetic-bindings/main.ts"),
): ts.Program {
  const owner = resolve("/synthetic-bindings/owner.ts");
  const files = new Map([
    [
      owner,
      "export function named(value: string): string; export function named(value: number): number; export function named(value: string | number) { return value; }",
    ],
    [main, source],
  ]);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noLib: true,
  };
  const host = ts.createCompilerHost(options);
  host.fileExists = (file) => files.has(file);
  host.readFile = (file) => files.get(file);
  host.directoryExists = () => true;
  host.getSourceFile = (file, languageVersion) => {
    const text = files.get(file);
    return text === undefined
      ? undefined
      : ts.createSourceFile(file, text, languageVersion, true);
  };
  const program = ts.createProgram([main, owner], options, host);
  return program;
}

function bindings(source: string): ReadonlyMap<string, string | undefined> {
  const program = fixtureProgram(source);
  const checker = program.getTypeChecker();
  const result = new Map<string, string | undefined>();
  const root = program.getSourceFile(resolve("/synthetic-bindings/main.ts"));
  assert.ok(root);
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const implementation = namedCallImplementation(node, checker);
      result.set(node.expression.getText(), implementation?.name?.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return result;
}

test("named owner bindings preserve imports, namespace, const and property aliases and overload bodies", () => {
  const result = bindings(`
    import { named as renamed } from './owner.ts';
    import * as namespace from './owner.ts';
    function local() {}
    const alias = renamed;
    const second = alias;
    const holder = { run: renamed };
    const propertyAlias = holder.run;
    const spread = { ...holder };
    const mixed = { run: renamed, ...{ other: 1 } };
    const nested = { inner: { run: renamed } };
    const { run: destructured } = holder;
    local(); renamed('x'); namespace.named(1); alias('x'); second(1);
    holder.run('x'); holder['run'](1); propertyAlias('x'); destructured(1); spread.run('x'); mixed.run('x'); nested.inner.run('x');
  `);
  assert.equal(result.get("local"), "local");
  for (const name of [
    "renamed",
    "namespace.named",
    "alias",
    "second",
    "holder.run",
    "holder['run']",
    "propertyAlias",
    "destructured",
    "spread.run",
    "mixed.run",
    "nested.inner.run",
  ])
    assert.equal(result.get(name), "named", name);
});

test("cyclic, ambiguous and opaque callbacks do not claim a named implementation", () => {
  const result = bindings(`
    import { named } from './owner.ts';
    const a = b; const b = a;
    const choose = true ? named : (() => 1);
    function caller(callback: typeof named, receiver: { run: typeof named }, key: string) {
      callback('x'); receiver.run('x'); receiver[key]('x');
    }
    a('x'); choose('x');
  `);
  for (const name of [
    "a",
    "choose",
    "callback",
    "receiver.run",
    "receiver[key]",
  ])
    assert.equal(result.get(name), undefined, name);
});

test("hole candidates retain explicit, spread and computed constructions", () => {
  const path = resolve(
    import.meta.dirname,
    "../..",
    "battle-runtime/src/synthetic-hole-bindings.ts",
  );
  const program = fixtureProgram(
    `
    function owner() {
      const explicit = { kind: 'choice', holeId: 'id', holeInstanceKey: 'key' } as const;
      const allSpread = { ...explicit };
      const mixedSpread = { ...explicit, kind: 'roll' as const };
      const key = 'kind' as const;
      const computed = { [key]: 'computed' as const, holeId: 'id', holeInstanceKey: 'key' };
      const incomplete = { kind: 'incomplete', holeId: 'id' };
    }
  `,
    path,
  );
  const constructions = executionHoleConstructions(program);
  assert.equal(constructions.length, 4);
  assert.deepEqual(
    constructions.map((entry) => entry.kinds),
    [
      { kind: "finite", values: ["choice"] },
      { kind: "finite", values: ["choice"] },
      { kind: "finite", values: ["roll"] },
      { kind: "finite", values: ["computed"] },
    ],
  );
});

test("generic frontier evidence retains structural and type-parameter producers without instantiating guards", () => {
  const path = resolve(
    import.meta.dirname,
    "../..",
    "battle-runtime/src/synthetic-generic-frontiers.ts",
  );
  const program = fixtureProgram(
    `
    interface Array<T> { readonly [index: number]: T; }
    interface ReadonlyArray<T> { readonly [index: number]: T; }
    function guard<T>(value: T): value is T { return true; }
    function primitive<T>(value: T): boolean { return true; }
    function producer<H extends string>(kind: H) {
      return { tag: 'needsHoles' as const, frontier: {
        kind: 'holes' as const,
        holes: [{ kind }] as const,
        replaySubject: { tag: 'runtimeCommand' as const, command: 'synthetic' as const },
      }};
    }
    function identity<T>(value: T): T { return value; }
    function contextual<T>(value: T, other: { copy: T }): T { return value; }
    guard({ nested: 'data' }); primitive({ nested: 'data' });
    const value = producer('roll');
    identity(value); identity<typeof value>(value); contextual(value, { copy: value });
  `,
    path,
  );
  const checker = program.getTypeChecker();
  const original = checker.getTypeAtLocation.bind(checker);
  let contextualCalls = 0;
  checker.getTypeAtLocation = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["guard", "primitive"].includes(node.expression.text)
    )
      assert.fail(
        "Primitive generic call should not require argument instantiation",
      );
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "contextual"
    )
      contextualCalls++;
    return original(node);
  };
  const calls = executionGenericOrdinaryFrontierCalls(program);
  assert.deepEqual(calls.map((call) => call.producer.symbol).sort(), [
    "contextual",
    "identity",
    "identity",
    "producer",
  ]);
  assert.ok(
    contextualCalls > 0,
    "Nested parameter relationships retain canonical call inference",
  );
  for (const call of calls)
    assert.deepEqual(call.result, {
      kind: "finite",
      frontiers: [
        { subjects: ["runtimeCommand.synthetic"], holeKinds: ["roll"] },
      ],
    });
});

test("typed aliases retain widened and reordered frontier signatures", () => {
  const path = resolve(
    import.meta.dirname,
    "../..",
    "battle-runtime/src/synthetic-frontier-signatures.ts",
  );
  const program = fixtureProgram(
    `
    interface Array<T> { readonly [index: number]: T; }
    interface ReadonlyArray<T> { readonly [index: number]: T; }
    type Frontier = { tag: 'needsHoles'; frontier: { kind: 'holes'; holes: readonly {kind: 'roll' | 'choice'}[]; replaySubject: {tag: 'runtimeCommand'; command: 'synthetic'} } };
    function identity<T>(value: T): T { return value; }
    const narrow = { tag: 'needsHoles' as const, frontier: { kind: 'holes' as const, holes: [{kind: 'roll' as const}] as const, replaySubject: { tag: 'runtimeCommand' as const, command: 'synthetic' as const } } };
    const alias: (value: Frontier) => Frontier = identity;
    const reordered: <B, A>(value: A) => A = identity;
    alias(narrow); reordered<string, Frontier>(narrow);
  `,
    path,
  );
  const calls = executionGenericOrdinaryFrontierCalls(program);
  assert.equal(calls.length, 2);
  for (const call of calls)
    assert.deepEqual(call.result, {
      kind: "finite",
      frontiers: [
        {
          subjects: ["runtimeCommand.synthetic"],
          holeKinds: ["choice", "roll"],
        },
      ],
    });
});

test("native call and object types project actual structural evidence without guessing unresolved fields", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "accounting-native-calls-"));
  const sourcePath = resolve(directory, "source.ts");
  const configPath = resolve(directory, "tsconfig.json");
  writeFileSync(
    configPath,
    JSON.stringify({ compilerOptions: { noLib: true }, files: [sourcePath] }),
  );
  writeFileSync(
    sourcePath,
    `
    declare function ordinary(): {procedure: 'synthetic'};
    declare function positive(): {tag: 'needsHoles'};
    declare function wrapped(): {tag: 'resolution'};
    declare function unknownResult(): unknown;
    declare function mixed(): {tag: 'resolved'} | {tag: 'needsHoles'};
    type Mapped<T> = { [K in keyof T]: T[K] };
    declare function mapped<T>(): Mapped<T> & {procedure: 'synthetic'};
    declare function concrete(): {procedure: 'synthetic'} & {value: number};
    ordinary(); positive(); wrapped(); unknownResult(); mixed();
    function generic<T>() { mapped<T>(); }
    concrete();
    declare function frontier<T>(value: T): {tag: 'needsHoles'; frontier: {kind: 'holes'; holes: {[index: number]: {kind: 'roll' | 'choice'}}; replaySubject: {tag: 'runtimeCommand'; command: 'synthetic'; mode: {tag: 'selected'}}}};
    frontier(1);
    declare const hole: {kind: 'roll'; holeId: string; holeInstanceKey: string};
    declare const ordinaryObject: {value: number};
    const explicitHole = {kind: 'roll', holeId: 'id', holeInstanceKey: 'key'};
    const spreadHole = {...hole};
    const mixedHole = {...hole, value: 1};
    const computedHole = {['kind']: 'roll', holeId: 'id', holeInstanceKey: 'key'};
    const ordinarySpread = {...ordinaryObject};
    const incompleteHole = {...ordinaryObject, kind: 'roll', holeId: 'id'};
    function uncertainObject<T>(value: Mapped<T>) { const candidate = {...value, procedure: 'synthetic'}; }
  `,
  );
  const api = new API({ cwd: directory });
  const snapshot = api.updateSnapshot({ openProjects: [configPath] });
  try {
    const project = (() => {
      const value = snapshot.getProject(configPath);
      assert.ok(value);
      return value;
    })();
    const source = project.program.getSourceFile(sourcePath);
    assert.ok(source);
    const candidates: boolean[] = [];
    const objectCandidates: boolean[] = [];
    const frontiers: ReturnType<typeof genericFrontierResults>[] = [];
    function visit(node: NativeNode): void {
      if (isNativeCallExpression(node)) {
        const type = project.checker.getTypeAtLocation(node);
        assert.ok(type);
        candidates.push(
          genericFrontierResults(
            nativeProjectionOperations(project, node),
            type,
          ).length > 0,
        );
        frontiers.push(
          genericFrontierResults(
            nativeProjectionOperations(project, node),
            type,
          ),
        );
      }
      if (isNativeObjectLiteralExpression(node)) {
        const type = project.checker.getTypeAtLocation(node);
        assert.ok(type);
        objectCandidates.push(
          constructionKinds(nativeProjectionOperations(project, node), type)
            .kind === "hole",
        );
      }
      node.forEachChild(visit);
    }
    visit(source);
    assert.deepEqual(candidates, [
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    assert.deepEqual(frontiers.at(-1), [
      {
        resultPath: [],
        result: {
          kind: "finite",
          frontiers: [
            {
              subjects: ["runtimeCommand.synthetic.selected"],
              holeKinds: ["choice", "roll"],
            },
          ],
        },
      },
    ]);
    assert.deepEqual(objectCandidates, [
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  } finally {
    try {
      snapshot.dispose();
    } finally {
      api.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("registry factory bindings preserve local const aliases and reject dynamic or cyclic owners", () => {
  const program = fixtureProgram(`
 declare function registeredSpellProcedureDeclaration(value: {procedure: 'owner'}): {procedure: 'owner'};
 const profile = {procedure: 'owner'};
 const registration = registeredSpellProcedureDeclaration(profile);
 const alias = (registration);
 let mutable = registration;
 const cycleA = cycleB; const cycleB = cycleA;
 const table = {direct: registeredSpellProcedureDeclaration(profile), named: registration, alias: alias, dynamic: mutable, cyclic: cycleA};
 `);
  const source = program.getSourceFile(resolve("/synthetic-bindings/main.ts"));
  assert.ok(source);
  const checker = program.getTypeChecker();
  const results: boolean[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          property.name.getText() === "direct",
      )
    ) {
      for (const property of node.properties) {
        const expression = ts.isPropertyAssignment(property)
          ? property.initializer
          : ts.isShorthandPropertyAssignment(property)
            ? property.name
            : undefined;
        assert.ok(expression);
        results.push(registryFactoryCall(expression, checker) !== undefined);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual(results, [true, true, true, false, false]);
});
