import {
  decodePortableSrdSurface,
  decodePortableSrdSurfaceText,
  type PortableSrdSurfaceDecodeResult,
  type PortableSrdSurfaceIssue,
} from "./portable-surface.ts";
import type { PublishedSrdSurface, SrdSurface } from "./schema.ts";
import {
  buildStatBlockCatalog,
  type SrdStatBlockCollection,
  type SrdStatBlockCatalog,
  type StatBlockCatalogBuildIssue,
} from "./stat-block-catalog.ts";
import { Option } from "effect";
import type { SrdStatBlockRecord, SrdUnitRecord } from "./types.ts";
import type {
  StatBlockMechanicsPath as SurfaceStatBlockMechanicsPath,
  UnitMechanicsPath as SurfaceUnitMechanicsPath,
} from "./mechanics-graph-path.ts";
import {
  buildUnitCatalog,
  type SrdUnitCollection,
  type UnitCatalog,
  type UnitCatalogBuildIssue,
} from "./unit-catalog.ts";

/** Reasons a mechanics admission profile can reject an authored record. */
export const SURFACE_MECHANICS_ADMISSION_REASONS = [
  "unsupported_mechanics",
  "ambiguous_mechanics",
  "incomplete_graph",
  "no_admitted_procedure",
] as const;

export type SurfaceMechanicsAdmissionReason =
  (typeof SURFACE_MECHANICS_ADMISSION_REASONS)[number];

/** A typed identity root for a mechanics issue. */
export type SurfaceAuthoredRecordRoot =
  | { readonly kind: "unit"; readonly id: SrdUnitRecord["id"] }
  | { readonly kind: "statBlock"; readonly id: SrdStatBlockRecord["id"] };

/**
 * A mechanics issue returned by a static admission profile before the install
 * operation attaches the authored-record root.
 *
 * The path is relative to the record's typed mechanics value. It is not a
 * persisted diagnostic path: it exists only in a rejected install result.
 */
export type UnitMechanicsAdmissionIssueDraft<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
> = {
  readonly reason: SurfaceMechanicsAdmissionReason;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type StatBlockMechanicsAdmissionIssueDraft<
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> = {
  readonly reason: SurfaceMechanicsAdmissionReason;
  readonly mechanicsPath: StatBlockMechanicsPath;
  readonly message: string;
};

export type UnitMechanicsAdmissionResult<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  UnitExecutionProjection = unknown,
> =
  | {
      readonly tag: "admitted";
      readonly execution: UnitExecutionProjection;
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>,
        ...UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>[],
      ];
    };

export type StatBlockMechanicsAdmissionResult<
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
  StatBlockExecutionProjection = unknown,
> =
  | {
      readonly tag: "admitted";
      readonly execution: StatBlockExecutionProjection;
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        StatBlockMechanicsAdmissionIssueDraft<StatBlockMechanicsPath>,
        ...StatBlockMechanicsAdmissionIssueDraft<StatBlockMechanicsPath>[],
      ];
    };

/**
 * Context-independent mechanics checks supplied by the owning runtime
 * packages. The operation calls each family-specific check against the same
 * call-local decoded surface. A record with no matching executable profile
 * must return `rejected` with a `no_admitted_procedure` issue; an empty issue
 * collection is not a successful admission state.
 */
export type SurfaceMechanicsAdmission<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection = unknown,
  StatBlockExecutionProjection = unknown,
> = {
  readonly admitUnit: (input: {
    readonly unit: SrdUnitRecord;
    readonly surface: SrdSurface;
  }) => UnitMechanicsAdmissionResult<
    UnitMechanicsPath,
    UnitExecutionProjection
  >;
  readonly admitStatBlock: (input: {
    readonly statBlock: SrdStatBlockRecord;
    readonly surface: SrdSurface;
  }) => StatBlockMechanicsAdmissionResult<
    StatBlockMechanicsPath,
    StatBlockExecutionProjection
  >;
};

export type SurfaceCatalogDecodeIssue =
  | {
      readonly kind: "portable-surface";
      readonly issue: PortableSrdSurfaceIssue;
    }
  | {
      readonly kind: "unit-catalog";
      readonly issue: UnitCatalogBuildIssue;
    }
  | {
      readonly kind: "stat-block-catalog";
      readonly issue: StatBlockCatalogBuildIssue;
    };

export type SurfaceCatalogInstallIssue<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> =
  | {
      readonly phase: "decode";
      readonly issue: SurfaceCatalogDecodeIssue;
    }
  | ({
      readonly phase: "admission";
      readonly root: Extract<SurfaceAuthoredRecordRoot, { kind: "unit" }>;
    } & UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>)
  | ({
      readonly phase: "admission";
      readonly root: Extract<SurfaceAuthoredRecordRoot, { kind: "statBlock" }>;
    } & StatBlockMechanicsAdmissionIssueDraft<StatBlockMechanicsPath>);

export type InstalledUnitMechanicsGraph<UnitExecutionProjection> = {
  readonly kind: "unit";
  readonly authored: SrdUnitRecord;
  readonly execution: UnitExecutionProjection;
};

export type InstalledStatBlockMechanicsGraph<StatBlockExecutionProjection> = {
  readonly kind: "statBlock";
  readonly authored: SrdStatBlockRecord;
  readonly execution: StatBlockExecutionProjection;
};

export type InstalledUnitCatalog<UnitExecutionProjection> = UnitCatalog & {
  readonly getInstalledUnit: (
    id: string,
  ) => Option.Option<InstalledUnitMechanicsGraph<UnitExecutionProjection>>;
  readonly listInstalledUnits: () => readonly InstalledUnitMechanicsGraph<UnitExecutionProjection>[];
};

export type InstalledStatBlockCatalog<StatBlockExecutionProjection> =
  SrdStatBlockCatalog & {
    readonly getInstalledStatBlock: (
      id: SrdStatBlockRecord["id"],
    ) => Option.Option<
      InstalledStatBlockMechanicsGraph<StatBlockExecutionProjection>
    >;
    readonly listInstalledStatBlocks: () => readonly InstalledStatBlockMechanicsGraph<StatBlockExecutionProjection>[];
  };

declare const InstalledSrdSurfaceCatalogTypeId: unique symbol;

/** The only executable state exposed after a successful installation. */
export type InstalledSrdSurfaceCatalog<
  UnitExecutionProjection = unknown,
  StatBlockExecutionProjection = unknown,
> = {
  readonly unitLibrary: InstalledUnitCatalog<UnitExecutionProjection>;
  readonly statBlockCatalog: InstalledStatBlockCatalog<StatBlockExecutionProjection>;
  readonly [InstalledSrdSurfaceCatalogTypeId]: typeof InstalledSrdSurfaceCatalogTypeId;
};

export type SurfaceCatalogInstallResult<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection = unknown,
  StatBlockExecutionProjection = unknown,
> =
  | {
      readonly tag: "accepted";
      readonly catalog: InstalledSrdSurfaceCatalog<
        UnitExecutionProjection,
        StatBlockExecutionProjection
      >;
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        SurfaceCatalogInstallIssue<UnitMechanicsPath, StatBlockMechanicsPath>,
        ...SurfaceCatalogInstallIssue<
          UnitMechanicsPath,
          StatBlockMechanicsPath
        >[],
      ];
    };

export type InstallSrdSurfaceInput<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection = unknown,
  StatBlockExecutionProjection = unknown,
> = {
  readonly raw: unknown;
  readonly mechanicsAdmission: SurfaceMechanicsAdmission<
    UnitMechanicsPath,
    StatBlockMechanicsPath,
    UnitExecutionProjection,
    StatBlockExecutionProjection
  >;
};

export type InstallSrdSurfaceTextInput<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection = unknown,
  StatBlockExecutionProjection = unknown,
> = {
  readonly text: string;
  readonly mechanicsAdmission: SurfaceMechanicsAdmission<
    UnitMechanicsPath,
    StatBlockMechanicsPath,
    UnitExecutionProjection,
    StatBlockExecutionProjection
  >;
};

/**
 * Decode, structurally validate, statically admit, and install one Surface.
 *
 * The catalog builders and admission checks operate on call-local values. A
 * rejected result contains every independently discovered issue and exposes
 * no catalog or other partial installation state.
 */
export function installSrdSurface<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection,
>(
  input: InstallSrdSurfaceInput<
    UnitMechanicsPath,
    StatBlockMechanicsPath,
    UnitExecutionProjection,
    StatBlockExecutionProjection
  >,
): SurfaceCatalogInstallResult<
  UnitMechanicsPath,
  StatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection
> {
  return installSrdSurfaceFromPortableDecode(
    () => decodePortableSrdSurface(input.raw),
    input.mechanicsAdmission,
  );
}

/** Text entrypoint for the same atomic install operation. */
export function installSrdSurfaceText<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection,
>(
  input: InstallSrdSurfaceTextInput<
    UnitMechanicsPath,
    StatBlockMechanicsPath,
    UnitExecutionProjection,
    StatBlockExecutionProjection
  >,
): SurfaceCatalogInstallResult<
  UnitMechanicsPath,
  StatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection
> {
  return installSrdSurfaceFromPortableDecode(
    () => decodePortableSrdSurfaceText(input.text),
    input.mechanicsAdmission,
  );
}

function installSrdSurfaceFromPortableDecode<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection,
>(
  decode: () => PortableSrdSurfaceDecodeResult,
  mechanicsAdmission: SurfaceMechanicsAdmission<
    UnitMechanicsPath,
    StatBlockMechanicsPath,
    UnitExecutionProjection,
    StatBlockExecutionProjection
  >,
): SurfaceCatalogInstallResult<
  UnitMechanicsPath,
  StatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection
> {
  const decoded = decode();
  if (decoded.tag === "rejected") {
    return rejected<
      UnitMechanicsPath,
      StatBlockMechanicsPath,
      UnitExecutionProjection,
      StatBlockExecutionProjection
    >(
      decoded.issues.map((issue) => ({
        phase: "decode" as const,
        issue: { kind: "portable-surface" as const, issue },
      })),
    );
  }

  const surface = canonicalSurface(decoded.surface);
  const unitCollection = srdUnitCollection(surface);
  const statBlockCollection = srdStatBlockCollection(surface);
  const unitBuild = buildUnitCatalog({ collections: [unitCollection] });
  const statBlockBuild = buildStatBlockCatalog({
    collections: [statBlockCollection],
  });

  const decodeIssues: SurfaceCatalogInstallIssue<
    UnitMechanicsPath,
    StatBlockMechanicsPath
  >[] = [
    ...(unitBuild.tag === "invalid"
      ? unitBuild.issues.map((issue) => ({
          phase: "decode" as const,
          issue: { kind: "unit-catalog" as const, issue },
        }))
      : []),
    ...(statBlockBuild.tag === "invalid"
      ? statBlockBuild.issues.map((issue) => ({
          phase: "decode" as const,
          issue: { kind: "stat-block-catalog" as const, issue },
        }))
      : []),
  ];

  const unitAdmissions = surface.units.map((unit) => ({
    unit,
    result: mechanicsAdmission.admitUnit({ unit, surface }),
  }));
  const statBlockAdmissions = surface.statBlocks.map((statBlock) => ({
    statBlock,
    result: mechanicsAdmission.admitStatBlock({ statBlock, surface }),
  }));
  const admissionIssues: SurfaceCatalogInstallIssue<
    UnitMechanicsPath,
    StatBlockMechanicsPath
  >[] = [
    ...unitAdmissions.flatMap(({ unit, result }) =>
      unitAdmissionIssues(result, {
        kind: "unit",
        id: unit.id,
      }),
    ),
    ...statBlockAdmissions.flatMap(({ statBlock, result }) =>
      statBlockAdmissionIssues(result, { kind: "statBlock", id: statBlock.id }),
    ),
  ];

  const issues = [...decodeIssues, ...admissionIssues];
  if (issues.length > 0) {
    return rejected<
      UnitMechanicsPath,
      StatBlockMechanicsPath,
      UnitExecutionProjection,
      StatBlockExecutionProjection
    >(issues);
  }

  /* v8 ignore start -- the preceding issue projection proves both builders succeeded */
  if (unitBuild.tag !== "ok" || statBlockBuild.tag !== "ok") {
    throw new Error("Catalog install builders changed after issue projection");
  }
  /* v8 ignore stop */

  const installedUnits = new Map<
    string,
    InstalledUnitMechanicsGraph<UnitExecutionProjection>
  >(
    unitAdmissions.map(({ unit, result }) => {
      if (result.tag !== "admitted") {
        throw new Error("Rejected Unit admission survived issue projection");
      }
      const installed: InstalledUnitMechanicsGraph<UnitExecutionProjection> = {
        kind: "unit",
        authored: unit,
        execution: result.execution,
      };
      return [unit.id, installed] as const;
    }),
  );
  const installedStatBlocks = new Map<
    SrdStatBlockRecord["id"],
    InstalledStatBlockMechanicsGraph<StatBlockExecutionProjection>
  >(
    statBlockAdmissions.map(({ statBlock, result }) => {
      if (result.tag !== "admitted") {
        throw new Error(
          "Rejected Stat Block admission survived issue projection",
        );
      }
      const installed: InstalledStatBlockMechanicsGraph<StatBlockExecutionProjection> =
        {
          kind: "statBlock",
          authored: statBlock,
          execution: result.execution,
        };
      return [statBlock.id, installed] as const;
    }),
  );
  const catalog = {
    unitLibrary: {
      getUnit: (id: string) =>
        Option.map(
          Option.fromNullable(installedUnits.get(id)),
          (entry) => entry.authored,
        ),
      listUnits: () =>
        Array.from(installedUnits.values(), (entry) => entry.authored),
      requireUnit: (id: string) => installedUnits.get(id)!.authored,
      getInstalledUnit: (id: string) =>
        Option.fromNullable(installedUnits.get(id)),
      listInstalledUnits: () => Array.from(installedUnits.values()),
    },
    statBlockCatalog: {
      getStatBlock: (id: SrdStatBlockRecord["id"]) =>
        Option.map(
          Option.fromNullable(installedStatBlocks.get(id)),
          (entry) => entry.authored,
        ),
      listStatBlocks: () =>
        Array.from(installedStatBlocks.values(), (entry) => entry.authored),
      getInstalledStatBlock: (id: SrdStatBlockRecord["id"]) =>
        Option.fromNullable(installedStatBlocks.get(id)),
      listInstalledStatBlocks: () => Array.from(installedStatBlocks.values()),
    },
  };
  return {
    tag: "accepted",
    // Brands are erased at runtime. The local value has every public field;
    // only this successful atomic operation may establish its private brand.
    catalog: catalog as unknown as InstalledSrdSurfaceCatalog<
      UnitExecutionProjection,
      StatBlockExecutionProjection
    >,
  };
}

function unitAdmissionIssues<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  UnitExecutionProjection,
>(
  result: UnitMechanicsAdmissionResult<
    UnitMechanicsPath,
    UnitExecutionProjection
  >,
  root: Extract<SurfaceAuthoredRecordRoot, { kind: "unit" }>,
): readonly SurfaceCatalogInstallIssue<UnitMechanicsPath, never>[] {
  return result.tag === "rejected"
    ? result.issues.map((issue) => ({
        phase: "admission" as const,
        root,
        ...issue,
      }))
    : [];
}

function statBlockAdmissionIssues<
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
  StatBlockExecutionProjection,
>(
  result: StatBlockMechanicsAdmissionResult<
    StatBlockMechanicsPath,
    StatBlockExecutionProjection
  >,
  root: Extract<SurfaceAuthoredRecordRoot, { kind: "statBlock" }>,
): readonly SurfaceCatalogInstallIssue<never, StatBlockMechanicsPath>[] {
  return result.tag === "rejected"
    ? result.issues.map((issue) => ({
        phase: "admission" as const,
        root,
        ...issue,
      }))
    : [];
}

function srdUnitCollection(surface: SrdSurface): SrdUnitCollection {
  return {
    kind: "srdUnitCollection",
    provenance: { kind: "srd-5.2.1" },
    units: surface.units,
  };
}

function srdStatBlockCollection(surface: SrdSurface): SrdStatBlockCollection {
  return {
    kind: "srdStatBlockCollection",
    provenance: { kind: "srd-5.2.1" },
    statBlocks: surface.statBlocks,
  };
}

function canonicalSurface(published: PublishedSrdSurface): SrdSurface {
  return {
    kind: "srd-5.2.1-surface-catalog",
    units: mapNonEmpty(published.units, withoutRulesExcerpt),
    statBlocks: mapNonEmpty(published.statBlocks, withoutRulesExcerpt),
  };
}

type WithoutRulesExcerpt<T> = T extends {
  readonly rulesExcerpt: string;
}
  ? Omit<T, "rulesExcerpt">
  : never;

function withoutRulesExcerpt<T extends { readonly rulesExcerpt: string }>(
  record: T,
): WithoutRulesExcerpt<T> {
  const { rulesExcerpt: _rulesExcerpt, ...canonical } = record;
  // Portable decoding proved the record shape; removing its derived
  // publication field leaves the corresponding canonical record variant.
  return canonical as WithoutRulesExcerpt<T>;
}

function mapNonEmpty<T, U>(
  values: readonly [T, ...T[]],
  map: (value: T) => U,
): readonly [U, ...U[]] {
  const [first, ...rest] = values;
  return [map(first), ...rest.map(map)];
}

function rejected<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection,
>(
  issues: readonly SurfaceCatalogInstallIssue<
    UnitMechanicsPath,
    StatBlockMechanicsPath
  >[],
): SurfaceCatalogInstallResult<
  UnitMechanicsPath,
  StatBlockMechanicsPath,
  UnitExecutionProjection,
  StatBlockExecutionProjection
> {
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error("Catalog install rejection requires at least one issue");
  }
  return { tag: "rejected", issues: [first, ...rest] };
}
