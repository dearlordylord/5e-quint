import { realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { Either } from "effect";

function containedBy(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) &&
      relativePath !== ".." &&
      !relativePath.startsWith(sep))
  );
}

/**
 * Resolve a repository-owned authority for reading. Lexical path checks alone
 * are insufficient because an in-repository symlink can resolve outside the
 * repository; both the repository root and candidate are canonicalized before
 * containment is accepted.
 */
export function canonicalRepositoryReadPath(
  repositoryRoot: string,
  candidatePath: string,
): Either.Either<string, string> {
  if (candidatePath.includes("\0")) {
    return Either.left("Repository authority path contains a NUL byte.");
  }
  try {
    const canonicalRoot = realpathSync(repositoryRoot);
    const lexicalCandidate = resolve(repositoryRoot, candidatePath);
    if (!containedBy(canonicalRoot, lexicalCandidate)) {
      return Either.left("Repository authority path escapes the repository.");
    }
    const canonicalCandidate = realpathSync(lexicalCandidate);
    if (!containedBy(canonicalRoot, canonicalCandidate)) {
      return Either.left(
        "Repository authority symlink escapes the repository.",
      );
    }
    return Either.right(canonicalCandidate);
  } catch (error) {
    return Either.left(
      `Repository authority path is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
