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
  type StatBlockCatalog,
} from "./stat-block-catalog.ts";
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
> =
  | { readonly tag: "admitted" }
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
> =
  | { readonly tag: "admitted" }
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
> = {
  readonly admitUnit: (input: {
    readonly unit: SrdUnitRecord;
    readonly surface: SrdSurface;
  }) => UnitMechanicsAdmissionResult<UnitMechanicsPath>;
  readonly admitStatBlock: (input: {
    readonly statBlock: SrdStatBlockRecord;
    readonly surface: SrdSurface;
  }) => StatBlockMechanicsAdmissionResult<StatBlockMechanicsPath>;
};

export type SurfaceCatalogDecodeIssue =
  | {
      readonly kind: "portable-surface";
      readonly issue: PortableSrdSurfaceIssue;
    }
  | {
      readonly kind: "unit-catalog";
      readonly issue: UnitCatalogBuildIssue;
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

/** The only executable state exposed after a successful installation. */
export type InstalledSrdSurfaceCatalog = {
  readonly unitCatalog: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
};

export type SurfaceCatalogInstallResult<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> =
  | {
      readonly tag: "accepted";
      readonly catalog: InstalledSrdSurfaceCatalog;
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
> = {
  readonly raw: unknown;
  readonly mechanicsAdmission: SurfaceMechanicsAdmission<
    UnitMechanicsPath,
    StatBlockMechanicsPath
  >;
};

export type InstallSrdSurfaceTextInput<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath = SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath =
    SurfaceStatBlockMechanicsPath,
> = {
  readonly text: string;
  readonly mechanicsAdmission: SurfaceMechanicsAdmission<
    UnitMechanicsPath,
    StatBlockMechanicsPath
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
>(
  input: InstallSrdSurfaceInput<UnitMechanicsPath, StatBlockMechanicsPath>,
): SurfaceCatalogInstallResult<UnitMechanicsPath, StatBlockMechanicsPath> {
  return installSrdSurfaceFromPortableDecode(
    () => decodePortableSrdSurface(input.raw),
    input.mechanicsAdmission,
  );
}

/** Text entrypoint for the same atomic install operation. */
export function installSrdSurfaceText<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
>(
  input: InstallSrdSurfaceTextInput<UnitMechanicsPath, StatBlockMechanicsPath>,
): SurfaceCatalogInstallResult<UnitMechanicsPath, StatBlockMechanicsPath> {
  return installSrdSurfaceFromPortableDecode(
    () => decodePortableSrdSurfaceText(input.text),
    input.mechanicsAdmission,
  );
}

function installSrdSurfaceFromPortableDecode<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
  StatBlockMechanicsPath extends SurfaceStatBlockMechanicsPath,
>(
  decode: () => PortableSrdSurfaceDecodeResult,
  mechanicsAdmission: SurfaceMechanicsAdmission<
    UnitMechanicsPath,
    StatBlockMechanicsPath
  >,
): SurfaceCatalogInstallResult<UnitMechanicsPath, StatBlockMechanicsPath> {
  const decoded = decode();
  if (decoded.tag === "rejected") {
    return rejected(
      mapNonEmpty(decoded.issues, (issue) => ({
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
  ];

  const admissionIssues: SurfaceCatalogInstallIssue<
    UnitMechanicsPath,
    StatBlockMechanicsPath
  >[] = [
    ...surface.units.flatMap((unit) =>
      unitAdmissionIssues(mechanicsAdmission.admitUnit({ unit, surface }), {
        kind: "unit",
        id: unit.id,
      }),
    ),
    ...surface.statBlocks.flatMap((statBlock) =>
      statBlockAdmissionIssues(
        mechanicsAdmission.admitStatBlock({ statBlock, surface }),
        { kind: "statBlock", id: statBlock.id },
      ),
    ),
  ];

  const [firstIssue, ...remainingIssues] = [
    ...decodeIssues,
    ...admissionIssues,
  ];
  if (firstIssue !== undefined) {
    return rejected([firstIssue, ...remainingIssues]);
  }

  /* v8 ignore start -- @preserve -- accepted portable decode proves every Stat Block builder invariant because canonicalSurface only removes rulesExcerpt; empty projected Unit issues prove the Unit build succeeded */
  if (unitBuild.tag !== "ok" || statBlockBuild.tag !== "ok") {
    throw new Error("Catalog install builders changed after issue projection");
  }
  /* v8 ignore stop */

  return {
    tag: "accepted",
    catalog: {
      unitCatalog: unitBuild.catalog,
      statBlockCatalog: statBlockBuild.catalog,
    },
  };
}

function unitAdmissionIssues<
  UnitMechanicsPath extends SurfaceUnitMechanicsPath,
>(
  result: UnitMechanicsAdmissionResult<UnitMechanicsPath>,
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
>(
  result: StatBlockMechanicsAdmissionResult<StatBlockMechanicsPath>,
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
>(
  issues: readonly [
    SurfaceCatalogInstallIssue<UnitMechanicsPath, StatBlockMechanicsPath>,
    ...SurfaceCatalogInstallIssue<UnitMechanicsPath, StatBlockMechanicsPath>[],
  ],
): SurfaceCatalogInstallResult<UnitMechanicsPath, StatBlockMechanicsPath> {
  return { tag: "rejected", issues };
}
