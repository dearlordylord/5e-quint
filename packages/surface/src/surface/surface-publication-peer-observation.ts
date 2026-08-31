const STAT_BLOCK_PUBLICATION_RECORD_KIND = "statBlock" as const;
const OTHER_PUBLICATION_RECORD_KIND = "other" as const;
const UNKNOWN_PUBLICATION_RECORD_KIND = "unknown" as const;
const SURFACE_PUBLICATION_RECORD_KINDS = [
  STAT_BLOCK_PUBLICATION_RECORD_KIND,
  OTHER_PUBLICATION_RECORD_KIND,
  UNKNOWN_PUBLICATION_RECORD_KIND,
] as const;

export type SurfacePublicationRecordKind =
  (typeof SURFACE_PUBLICATION_RECORD_KINDS)[number];

export type SurfacePublicationKnownRecordKind = Exclude<
  SurfacePublicationRecordKind,
  "unknown"
>;

type PublicationPeerObservationForKind<K extends SurfacePublicationRecordKind> =
  | {
      readonly tag: "present";
      readonly recordKind: K;
      readonly sourcePath: string;
      readonly peerPath: string;
    }
  | {
      readonly tag: "missing";
      readonly recordKind: K;
      readonly sourcePath: string;
      readonly peerPath: string;
    }
  | {
      readonly tag: "orphaned";
      readonly recordKind: K;
      readonly peerPath: string;
    }
  | {
      readonly tag: "out-of-sync";
      readonly recordKind: K;
      readonly sourcePath: string;
      readonly peerPath: string;
    }
  | {
      readonly tag: "source-failed";
      readonly reason: "compile";
      readonly recordKind: K;
      readonly sourcePath: string;
      readonly peerPath: string;
      readonly message: string;
    }
  | {
      readonly tag: "generated-peer-failed";
      readonly reason: "decode" | "read";
      readonly recordKind: K;
      readonly sourcePath: string;
      readonly peerPath: string;
      readonly message: string;
    }
  | {
      readonly tag: "committed-peer-failed";
      readonly reason: "decode" | "read";
      readonly recordKind: K;
      readonly sourcePath: string;
      readonly peerPath: string;
      readonly message: string;
    }
  | {
      readonly tag: "orphaned-peer-failed";
      readonly reason: "decode" | "read";
      readonly recordKind: K;
      readonly peerPath: string;
      readonly message: string;
    }
  | {
      readonly tag: "peer-family-mismatch";
      readonly role: "generated" | "committed";
      readonly recordKind: K;
      readonly actualRecordKind: SurfacePublicationKnownRecordKind;
      readonly sourcePath: string;
      readonly peerPath: string;
      readonly message: string;
    };

export type SurfacePublicationPeerObservation =
  SurfacePublicationRecordKind extends infer K
    ? K extends SurfacePublicationRecordKind
      ? PublicationPeerObservationForKind<K>
      : never
    : never;

export type SrdStatBlockPeerObservation =
  PublicationPeerObservationForKind<"statBlock">;

export function projectSrdStatBlockPeerObservation(
  observation: SurfacePublicationPeerObservation,
): SrdStatBlockPeerObservation | undefined {
  return Match.value(observation).pipe(
    Match.when(
      { recordKind: STAT_BLOCK_PUBLICATION_RECORD_KIND },
      (statBlock) => statBlock,
    ),
    Match.when({ recordKind: OTHER_PUBLICATION_RECORD_KIND }, () => undefined),
    Match.when(
      { recordKind: UNKNOWN_PUBLICATION_RECORD_KIND },
      () => undefined,
    ),
    Match.exhaustive,
  );
}
import { Match } from "effect";
