import { Effect, Result, PubSub, Schema, Stream } from "effect";

import {
  AdminMirrorProjectionEnvelopeSchema,
  type AdminMirrorPresentationTimelineEntry,
  type AdminMirrorProjectionEnvelope,
  type AdminMirrorPublisherInstanceId,
  type AdminMirrorSequence,
  type AdminMirrorSessionId,
  type AdminMirrorSessionState,
} from "./admin-mirror-contract.ts";
import { createAdminMirrorPresentationTimelineEntry } from "./admin-mirror-presentation-timeline.ts";

export type AdminMirrorStore = {
  readonly updates: Stream.Stream<AdminMirrorSessionState>;
  publish(envelope: AdminMirrorProjectionEnvelope): boolean;
  latest(): readonly AdminMirrorSessionState[];
  latestFor(
    mirrorSessionId: AdminMirrorSessionId,
  ): AdminMirrorSessionState | null;
};

const PUBLISHER_FRESHNESS_WINDOW_MS = 30_000;
const MAX_MIRROR_SESSIONS = 32;
const MAX_PUBLISHERS_PER_SESSION = 8;
const MAX_PRESENTATION_TIMELINE_ENTRIES_PER_SESSION = 96;
const MIRROR_UPDATE_BUFFER_SIZE = 256;
type PublisherFreshness = {
  readonly lastReceivedAtEpochMs: number;
  readonly lastSequence: AdminMirrorSequence;
};

export function createAdminMirrorStore(): AdminMirrorStore {
  const latestBySession = new Map<string, AdminMirrorSessionState>();
  const presentationTimelineBySession = new Map<
    string,
    readonly AdminMirrorPresentationTimelineEntry[]
  >();
  const publishersBySession = new Map<
    string,
    Map<AdminMirrorPublisherInstanceId, PublisherFreshness>
  >();
  const updates = Effect.runSync(
    PubSub.sliding<AdminMirrorSessionState>(MIRROR_UPDATE_BUFFER_SIZE),
  );

  return {
    updates: Stream.fromPubSub(updates),
    publish(envelope): boolean {
      const receivedAtEpochMs = Date.now();
      const publishers = publishersForSession(
        publishersBySession,
        envelope.mirrorSessionId,
      );
      const previousPublisher = publishers.get(envelope.publisherInstanceId);
      if (
        previousPublisher !== undefined &&
        envelope.sequence <= previousPublisher.lastSequence
      ) {
        return false;
      }

      publishers.set(envelope.publisherInstanceId, {
        lastReceivedAtEpochMs: receivedAtEpochMs,
        lastSequence: envelope.sequence,
      });
      pruneStalePublishers(publishers, receivedAtEpochMs);
      prunePublisherCapacity(publishers);

      const nextSession = {
        envelope,
        presentationTimeline: nextPresentationTimeline(
          presentationTimelineBySession.get(envelope.mirrorSessionId),
          createAdminMirrorPresentationTimelineEntry(
            envelope,
            receivedAtEpochMs,
            latestBySession.get(envelope.mirrorSessionId)?.envelope,
          ),
        ),
        multiSource: publishers.size > 1,
        receivedAtEpochMs,
      };
      presentationTimelineBySession.set(
        envelope.mirrorSessionId,
        nextSession.presentationTimeline,
      );
      latestBySession.set(envelope.mirrorSessionId, nextSession);
      pruneSessionCapacity(
        latestBySession,
        publishersBySession,
        presentationTimelineBySession,
      );
      Effect.runSync(PubSub.publish(updates, nextSession));
      return true;
    },
    latest(): readonly AdminMirrorSessionState[] {
      return Array.from(latestBySession.values()).sort(
        (left, right) => right.receivedAtEpochMs - left.receivedAtEpochMs,
      );
    },
    latestFor(
      mirrorSessionId: AdminMirrorSessionId,
    ): AdminMirrorSessionState | null {
      return latestBySession.get(mirrorSessionId) ?? null;
    },
  };
}

function prunePublisherCapacity(
  publishers: Map<AdminMirrorPublisherInstanceId, PublisherFreshness>,
): void {
  while (publishers.size > MAX_PUBLISHERS_PER_SESSION) {
    const entries = publishers.entries();
    // The loop guard establishes that this iterator is non-empty.
    const [firstPublisherId, firstFreshness] = entries.next().value!;
    let oldestPublisherId = firstPublisherId;
    let oldestReceivedAtEpochMs = firstFreshness.lastReceivedAtEpochMs;
    for (const [publisherInstanceId, freshness] of entries) {
      if (freshness.lastReceivedAtEpochMs < oldestReceivedAtEpochMs) {
        oldestReceivedAtEpochMs = freshness.lastReceivedAtEpochMs;
        oldestPublisherId = publisherInstanceId;
      }
    }
    publishers.delete(oldestPublisherId);
  }
}

function pruneSessionCapacity(
  latestBySession: Map<string, AdminMirrorSessionState>,
  publishersBySession: Map<
    string,
    Map<AdminMirrorPublisherInstanceId, PublisherFreshness>
  >,
  presentationTimelineBySession: Map<
    string,
    readonly AdminMirrorPresentationTimelineEntry[]
  >,
): void {
  while (latestBySession.size > MAX_MIRROR_SESSIONS) {
    const entries = latestBySession.entries();
    // The loop guard establishes that this iterator is non-empty.
    const [firstSessionId, firstSession] = entries.next().value!;
    let oldestSessionId = firstSessionId;
    let oldestReceivedAtEpochMs = firstSession.receivedAtEpochMs;
    for (const [mirrorSessionId, session] of entries) {
      if (session.receivedAtEpochMs < oldestReceivedAtEpochMs) {
        oldestReceivedAtEpochMs = session.receivedAtEpochMs;
        oldestSessionId = mirrorSessionId;
      }
    }
    latestBySession.delete(oldestSessionId);
    publishersBySession.delete(oldestSessionId);
    presentationTimelineBySession.delete(oldestSessionId);
  }
}

function publishersForSession(
  publishersBySession: Map<
    string,
    Map<AdminMirrorPublisherInstanceId, PublisherFreshness>
  >,
  mirrorSessionId: AdminMirrorSessionId,
): Map<AdminMirrorPublisherInstanceId, PublisherFreshness> {
  const existing = publishersBySession.get(mirrorSessionId);
  if (existing !== undefined) return existing;
  const publishers = new Map<
    AdminMirrorPublisherInstanceId,
    PublisherFreshness
  >();
  publishersBySession.set(mirrorSessionId, publishers);
  return publishers;
}

function pruneStalePublishers(
  publishers: Map<AdminMirrorPublisherInstanceId, PublisherFreshness>,
  receivedAtEpochMs: number,
): void {
  for (const [publisherInstanceId, freshness] of publishers.entries()) {
    if (
      receivedAtEpochMs - freshness.lastReceivedAtEpochMs >
      PUBLISHER_FRESHNESS_WINDOW_MS
    ) {
      publishers.delete(publisherInstanceId);
    }
  }
}

function nextPresentationTimeline(
  current: readonly AdminMirrorPresentationTimelineEntry[] | undefined,
  next: AdminMirrorPresentationTimelineEntry,
): readonly AdminMirrorPresentationTimelineEntry[] {
  return [next, ...(current ?? [])].slice(
    0,
    MAX_PRESENTATION_TIMELINE_ENTRIES_PER_SESSION,
  );
}

export function decodeAdminMirrorProjectionEnvelope(
  value: unknown,
): Result.Result<AdminMirrorProjectionEnvelope, string> {
  const decoded = Schema.decodeUnknownResult(
    AdminMirrorProjectionEnvelopeSchema,
  )(value);
  return Result.mapError(decoded, (error) => error.message);
}
