import { Either } from "effect";

import {
  capabilityContextForRole,
  parseCapabilityRole,
} from "./capability-projection.ts";

const [roleInput, ...unexpected] = process.argv.slice(2);
if (roleInput === undefined || unexpected.length > 0) {
  throw new Error("Usage: capability-projection-cli.ts <role>");
}
const role = parseCapabilityRole(roleInput);
if (Either.isLeft(role))
  throw new Error(`Unknown capability role: ${roleInput}`);
process.stdout.write(`${capabilityContextForRole(role.right)}\n`);
