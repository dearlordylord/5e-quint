#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const scaffoldRoot = path.join(root, "plans/cleanroom-scaffolds");
const selfTest = process.argv.includes("--self-test");
const dryRun = process.argv.includes("--dry-run");

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

function stableStringify(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function requireString(profile, field, issues) {
  if (typeof profile[field] !== "string" || profile[field].trim() === "") {
    issues.push(`${field} must be a non-empty string.`);
  }
}

function requireStringArray(profile, field, issues) {
  if (
    !Array.isArray(profile[field]) ||
    profile[field].length === 0 ||
    profile[field].some((item) => typeof item !== "string" || item === "")
  ) {
    issues.push(`${field} must be a non-empty string array.`);
  }
}

function validateProfile(profile) {
  const issues = [];
  if (!isRecord(profile)) return ["target profile must be an object."];
  if (profile.schemaVersion !== 1) {
    issues.push("schemaVersion must be 1.");
  }
  for (const field of [
    "targetProfileId",
    "targetLabel",
    "implementationKind",
    "enginePath",
    "packageManager",
  ]) {
    requireString(profile, field, issues);
  }
  if (
    typeof profile.enginePath === "string" &&
    (path.isAbsolute(profile.enginePath) ||
      profile.enginePath.split(/[\\/]/).includes(".."))
  ) {
    issues.push("enginePath must be a relative path inside the cleanroom repo.");
  }
  requireStringArray(profile, "allowedTargetDocs", issues);
  requireStringArray(profile, "sourceFileExtensions", issues);
  if (Array.isArray(profile.sourceFileExtensions)) {
    for (const extension of profile.sourceFileExtensions) {
      if (
        typeof extension === "string" &&
        (!extension.startsWith(".") || extension.includes("/") || extension.includes("\\"))
      ) {
        issues.push(`sourceFileExtensions entry ${extension} must be a file extension like .ext.`);
      }
    }
  }
  if (!Array.isArray(profile.verificationCommands)) {
    issues.push("verificationCommands must be an array.");
  } else {
    for (const [index, command] of profile.verificationCommands.entries()) {
      if (!isRecord(command)) {
        issues.push(`verificationCommands[${index}] must be an object.`);
        continue;
      }
      for (const field of ["label", "command"]) {
        if (
          typeof command[field] !== "string" ||
          command[field].trim() === ""
        ) {
          issues.push(
            `verificationCommands[${index}].${field} must be a non-empty string.`,
          );
        }
      }
    }
  }
  if (!isRecord(profile.quintBinding)) {
    issues.push("quintBinding must be an object.");
  } else {
    for (const field of [
      "name",
      "driverGuidanceMarkdown",
      "reproductionMarkdown",
    ]) {
      if (
        typeof profile.quintBinding[field] !== "string" ||
        profile.quintBinding[field].trim() === ""
      ) {
        issues.push(`quintBinding.${field} must be a non-empty string.`);
      }
    }
  }
  return issues;
}

function commandBlock(commands) {
  return [
    "```bash",
    ...commands.map((entry) => entry.command),
    "```",
  ].join("\n");
}

function commandChecklist(commands) {
  return commands.map((entry) => `  - \`${entry.command}\``).join("\n");
}

function commandResults(commands) {
  return commands.map((entry) => `- \`${entry.command}\` passed.`).join("\n");
}

function bulletList(items) {
  return items.map((item) => `  - ${item}`).join("\n");
}

function renderValues(profile) {
  return {
    allowedTargetDocsMarkdown: bulletList(profile.allowedTargetDocs),
    enginePath: profile.enginePath,
    implementationKind: profile.implementationKind,
    packageManager: profile.packageManager,
    quintBindingName: profile.quintBinding.name,
    quintDriverGuidanceMarkdown: profile.quintBinding.driverGuidanceMarkdown,
    quintReproductionMarkdown: profile.quintBinding.reproductionMarkdown,
    targetLabel: profile.targetLabel,
    targetProfileId: profile.targetProfileId,
    sourceFileExtensionsMarkdown: profile.sourceFileExtensions
      .map((extension) => `\`${extension}\``)
      .join(", "),
    verificationChecklistMarkdown: commandChecklist(
      profile.verificationCommands,
    ),
    verificationCommandsMarkdown: commandBlock(profile.verificationCommands),
    verificationResultsMarkdown: commandResults(profile.verificationCommands),
  };
}

const templateFiles = [
  "README.template.md",
  "BOOTSTRAP_QUERY.template.md",
  "AGENTS.template.md",
  "tasks/WORK_LOOP.template.md",
  "tasks/IMPLEMENTER_TASK.template.md",
  "tasks/REVIEWER_CHECKLIST.template.md",
  "tasks/DECIDER_CHECKLIST.template.md",
  "tasks/HANDBACK.template.md",
  "tasks/BLOCKERS.template.md",
  "tasks/LEVEL_1_2_SCOPE.snapshot.md",
  "tasks/VALIDATION_REPORT.example.md",
  "tasks/START_GATE.example.template.json",
  "tasks/ENGINE_DEPTH_MANIFEST.example.template.json",
  "tasks/STATE_OWNER_MANIFEST.example.template.json",
  "tasks/REVIEW_LOOP.example.template.json",
  "tasks/DECIDER_DECISION.example.template.json",
];

function destinationFor(templatePath) {
  return templatePath
    .replace(/\.example\.template\.json$/, ".example.json")
    .replace(/\.template\.json$/, ".json")
    .replace(/\.template\.md$/, ".md")
    .replace(/LEVEL_1_2_SCOPE\.snapshot\.md$/, "LEVEL_1_2_SCOPE.md")
    .replace(/VALIDATION_REPORT\.example\.md$/, "VALIDATION_REPORT.md");
}

function renderTemplate(text, values, context) {
  const rendered = text.replace(/{{([A-Za-z0-9_]+)}}/g, (match, key) => {
    if (!(key in values)) {
      throw new Error(`${context}: unknown template variable ${key}.`);
    }
    return values[key];
  });
  const unresolved = rendered.match(/{{[^}]+}}/g);
  if (unresolved !== null) {
    throw new Error(
      `${context}: unresolved template variables ${unresolved.join(", ")}.`,
    );
  }
  return rendered;
}

function renderScaffold({ profile, targetDir, shouldWrite }) {
  const profileIssues = validateProfile(profile);
  if (profileIssues.length > 0) {
    throw new Error(`invalid target profile:\n${profileIssues.join("\n")}`);
  }
  const values = renderValues(profile);
  const outputs = [];
  for (const templatePath of templateFiles) {
    const sourcePath = path.join(scaffoldRoot, templatePath);
    const rendered = renderTemplate(
      fs.readFileSync(sourcePath, "utf8"),
      values,
      templatePath,
    );
    const destination = destinationFor(templatePath);
    outputs.push({ destination, rendered });
    if (shouldWrite) {
      const outputPath = path.join(targetDir, destination);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, rendered);
    }
  }
  const profileOutput = {
    destination: "target-profile.json",
    rendered: stableStringify(profile),
  };
  outputs.push(profileOutput);
  if (shouldWrite) {
    const outputPath = path.join(targetDir, profileOutput.destination);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, profileOutput.rendered);
  }
  return outputs;
}

const genericTemplateForbiddenTerms = [
  "Cleanroom Rust",
  "Generic Rust",
  "Cargo",
  "cargo ",
  "cargo\n",
  "clippy",
  "quint_connect",
  "#[quint",
  "Rust implementation",
  "Rust tests",
  "Rust suite",
];

function assertNoGenericTargetLeak(text, context) {
  for (const term of genericTemplateForbiddenTerms) {
    if (text.includes(term)) {
      throw new Error(`${context}: target-specific term leaked: ${term}`);
    }
  }
}

function runSelfTest() {
  for (const templatePath of templateFiles) {
    assertNoGenericTargetLeak(
      fs.readFileSync(path.join(scaffoldRoot, templatePath), "utf8"),
      templatePath,
    );
  }
  const profilePaths = [
    path.join(scaffoldRoot, "target-profiles/synthetic-alpha.json"),
    path.join(scaffoldRoot, "target-profiles/synthetic-beta.json"),
  ];
  for (const profilePath of profilePaths) {
    const profile = readJson(profilePath);
    const targetDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "cleanroom-scaffold-render-"),
    );
    try {
      const outputs = renderScaffold({
        profile,
        targetDir,
        shouldWrite: true,
      });
      const joined = outputs.map((output) => output.rendered).join("\n");
      if (!joined.includes(profile.targetLabel)) {
        throw new Error(`${profilePath}: rendered output omits targetLabel.`);
      }
      for (const command of profile.verificationCommands) {
        if (!joined.includes(command.command)) {
          throw new Error(`${profilePath}: rendered output omits ${command.command}.`);
        }
      }
      assertNoGenericTargetLeak(joined, profilePath);
      for (const output of outputs) {
        const writtenPath = path.join(targetDir, output.destination);
        if (!fs.existsSync(writtenPath)) {
          throw new Error(`${profilePath}: missing rendered ${output.destination}.`);
        }
        if (output.destination.endsWith(".json")) {
          JSON.parse(fs.readFileSync(writtenPath, "utf8"));
        }
      }
    } finally {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }
  console.log("cleanroom scaffold renderer self-test OK.");
}

function main() {
  if (selfTest) {
    runSelfTest();
    return;
  }
  const profilePath = argValue("--profile");
  const targetDir = argValue("--target");
  if (profilePath === undefined || targetDir === undefined) {
    throw new Error("usage: render-cleanroom-scaffold --profile <json> --target <dir> [--dry-run]");
  }
  const profile = readJson(path.resolve(profilePath));
  const outputs = renderScaffold({
    profile,
    targetDir: path.resolve(targetDir),
    shouldWrite: !dryRun,
  });
  for (const output of outputs) {
    process.stdout.write(`${output.destination}\n`);
  }
}

main();
