process.stderr.write(
  [
    "pnpm quality is intentionally guarded because the full gate reruns workspace tests and coverage.",
    "During implementation, run the smallest relevant typecheck and focused tests.",
    "Run pnpm quality:milestone once on the stable integration revision after reviewer convergence.",
    "Raw Swarm deterministic verification is scheduled separately by its path-filtered workflow.",
  ].join("\n") + "\n",
);
process.exitCode = 64;
