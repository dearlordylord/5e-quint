const SURFACE_PUBLICATION_RECORD_KINDS = [
  "statBlock",
  "other",
  "unknown",
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
      { recordKind: SURFACE_PUBLICATION_RECORD_KINDS[0] },
      (statBlock) => statBlock,
    ),
    Match.when(
      { recordKind: SURFACE_PUBLICATION_RECORD_KINDS[1] },
      () => undefined,
    ),
    Match.when(
      { recordKind: SURFACE_PUBLICATION_RECORD_KINDS[2] },
      () => undefined,
    ),
    Match.exhaustive,
  );
}
import { Match } from "effect";
