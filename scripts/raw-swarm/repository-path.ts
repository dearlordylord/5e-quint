import { lstatSync, realpathSync } from "node:fs";
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
 * Resolve an authority for reading beneath its owning root. Lexical path
 * checks alone are insufficient because an owned symlink can resolve outside
 * that root; both the owner root and candidate are canonicalized before
 * containment is accepted.
 */
function canonicalOwnedReadPath(
  ownerRoot: string,
  candidatePath: string,
  authority: {
    readonly role: string;
    readonly boundary: string;
  },
): Either.Either<string, string> {
  if (candidatePath.includes("\0")) {
    return Either.left(`${authority.role} path contains a NUL byte.`);
  }
  try {
    const canonicalRoot = realpathSync(ownerRoot);
    const lexicalCandidate = resolve(ownerRoot, candidatePath);
    if (!containedBy(canonicalRoot, lexicalCandidate)) {
      return Either.left(
        `${authority.role} path escapes ${authority.boundary}.`,
      );
    }
    const canonicalCandidate = realpathSync(lexicalCandidate);
    if (!containedBy(canonicalRoot, canonicalCandidate)) {
      return Either.left(
        `${authority.role} symlink escapes ${authority.boundary}.`,
      );
    }
    return Either.right(canonicalCandidate);
  } catch (error) {
    return Either.left(
      `${authority.role} path is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function canonicalRepositoryReadPath(
  repositoryRoot: string,
  candidatePath: string,
): Either.Either<string, string> {
  return canonicalOwnedReadPath(repositoryRoot, candidatePath, {
    role: "Repository authority",
    boundary: "the repository",
  });
}

/**
 * Resolve a live runner authority beneath the exact temporary root owned by
 * that runner. This keeps provisional supervisor evidence distinct from
 * persisted repository authorities while enforcing the same symlink checks.
 */
export function canonicalRunnerOwnedReadPath(
  runnerRoot: string,
  candidatePath: string,
): Either.Either<string, string> {
  return canonicalOwnedReadPath(runnerRoot, candidatePath, {
    role: "Runner-owned authority",
    boundary: "its owner root",
  });
}

/**
 * Return the repository-relative spelling of a canonical read path. The
 * containment decision is made by canonicalRepositoryReadPath; this helper
 * only projects its accepted absolute path into the persisted authority form.
 */
export function canonicalRepositoryReadRelativePath(
  repositoryRoot: string,
  candidatePath: string,
): Either.Either<string, string> {
  const canonical = canonicalRepositoryReadPath(repositoryRoot, candidatePath);
  if (Either.isLeft(canonical)) return canonical;
  try {
    return Either.right(
      relative(realpathSync(repositoryRoot), canonical.right),
    );
  } catch (error) {
    return Either.left(
      `Repository authority path is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resolve a repository-owned destination before creating or publishing it.
 * The destination itself may not exist yet, so containment is checked against
 * its nearest existing ancestor as well as an existing leaf.
 */
export function canonicalRepositoryOutputPath(
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
    let nearestExisting = lexicalCandidate;
    while (true) {
      try {
        lstatSync(nearestExisting);
        break;
      } catch (error: unknown) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
        const parent = resolve(nearestExisting, "..");
        if (parent === nearestExisting) {
          return Either.left(
            "Repository authority destination has no existing ancestor.",
          );
        }
        nearestExisting = parent;
      }
    }
    const canonicalNearest = realpathSync(nearestExisting);
    if (!containedBy(canonicalRoot, canonicalNearest)) {
      return Either.left(
        "Repository authority symlink escapes the repository.",
      );
    }
    try {
      lstatSync(lexicalCandidate);
      const canonicalCandidate = realpathSync(lexicalCandidate);
      if (!containedBy(canonicalRoot, canonicalCandidate)) {
        return Either.left(
          "Repository authority symlink escapes the repository.",
        );
      }
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // A missing leaf is the expected prospective-output case.
      } else {
        throw error;
      }
    }
    return Either.right(lexicalCandidate);
  } catch (error) {
    return Either.left(
      `Repository authority path is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
