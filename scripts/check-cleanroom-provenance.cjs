#!/usr/bin/env node

const { buildAudit } = require("./srd521-surface-authored-corpus-audit.cjs");

const result = buildAudit();

if (result.status === "rejected") {
  for (const issue of result.issues) {
    console.error(
      `cleanroom provenance: ${issue.code}: ${issue.contentPath}: ${issue.message}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `cleanroom provenance: redistributable corpus audit passed (${result.metrics.recordsAudited} records, ${result.metrics.warnings} warning(s))`,
  );
}
