import { lstatSync, realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { Result } from "effect";

export function relativePathWithinRoot(
  root: string,
  candidate: string,
): string | undefined {
  const relativePath = relative(root, candidate);
  return relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath.startsWith(sep)
    ? undefined
    : relativePath;
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
): Result.Result<string, string> {
  if (candidatePath.includes("\0")) {
    return Result.fail(`${authority.role} path contains a NUL byte.`);
  }
  try {
    const canonicalRoot = realpathSync(ownerRoot);
    const lexicalCandidate = resolve(ownerRoot, candidatePath);
    if (relativePathWithinRoot(canonicalRoot, lexicalCandidate) === undefined) {
      return Result.fail(
        `${authority.role} path escapes ${authority.boundary}.`,
      );
    }
    const canonicalCandidate = realpathSync(lexicalCandidate);
    if (
      relativePathWithinRoot(canonicalRoot, canonicalCandidate) === undefined
    ) {
      return Result.fail(
        `${authority.role} symlink escapes ${authority.boundary}.`,
      );
    }
    return Result.succeed(canonicalCandidate);
  } catch (error) {
    return Result.fail(
      `${authority.role} path is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function canonicalRepositoryReadPath(
  repositoryRoot: string,
  candidatePath: string,
): Result.Result<string, string> {
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
): Result.Result<string, string> {
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
): Result.Result<string, string> {
  const canonical = canonicalRepositoryReadPath(repositoryRoot, candidatePath);
  if (Result.isFailure(canonical)) return canonical;
  try {
    return Result.succeed(
      relative(realpathSync(repositoryRoot), canonical.success),
    );
  } catch (error) {
    return Result.fail(
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
): Result.Result<string, string> {
  if (candidatePath.includes("\0")) {
    return Result.fail("Repository authority path contains a NUL byte.");
  }
  try {
    const canonicalRoot = realpathSync(repositoryRoot);
    const lexicalCandidate = resolve(repositoryRoot, candidatePath);
    if (relativePathWithinRoot(canonicalRoot, lexicalCandidate) === undefined) {
      return Result.fail("Repository authority path escapes the repository.");
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
          return Result.fail(
            "Repository authority destination has no existing ancestor.",
          );
        }
        nearestExisting = parent;
      }
    }
    const canonicalNearest = realpathSync(nearestExisting);
    if (relativePathWithinRoot(canonicalRoot, canonicalNearest) === undefined) {
      return Result.fail(
        "Repository authority symlink escapes the repository.",
      );
    }
    try {
      lstatSync(lexicalCandidate);
      const canonicalCandidate = realpathSync(lexicalCandidate);
      if (
        relativePathWithinRoot(canonicalRoot, canonicalCandidate) === undefined
      ) {
        return Result.fail(
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
    return Result.succeed(lexicalCandidate);
  } catch (error) {
    return Result.fail(
      `Repository authority path is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
