export type ReviewEvidenceCatalog = {
  readonly sequences: ReadonlySet<number>;
  readonly setupLineCount: number;
  readonly charactersLineCount: number;
  readonly hasTranscriptHeader: boolean;
};

export function reviewEvidenceIsExact(
  evidence: string,
  catalog: ReviewEvidenceCatalog,
): boolean {
  const sequenceRefs = [
    ...evidence.matchAll(
      /\bseq(?:uence)?s?[\s#:]+(\d+(?:(?:\s*(?:,|and|-)\s*)\d+)*)/gi,
    ),
  ].flatMap((match) => match[1]?.match(/\d+/g)?.map(Number) ?? []);
  const setupRefs = [
    ...evidence.matchAll(/\bsetup\.ts:(\d+)(?:-(\d+))?\b/gi),
  ].flatMap((match) =>
    [match[1], match[2]].flatMap((value) =>
      value === undefined ? [] : [Number(value)],
    ),
  );
  const characterRefs = [
    ...evidence.matchAll(/\bcharacters\.ts:(\d+)(?:-(\d+))?\b/gi),
  ].flatMap((match) =>
    [match[1], match[2]].flatMap((value) =>
      value === undefined ? [] : [Number(value)],
    ),
  );
  const header = /\btranscript header\b/i.test(evidence);
  return (
    sequenceRefs.length +
      setupRefs.length +
      characterRefs.length +
      (header ? 1 : 0) >
      0 &&
    sequenceRefs.every((seq) => catalog.sequences.has(seq)) &&
    setupRefs.every((line) => line > 0 && line <= catalog.setupLineCount) &&
    characterRefs.every(
      (line) => line > 0 && line <= catalog.charactersLineCount,
    ) &&
    (!header || catalog.hasTranscriptHeader)
  );
}
