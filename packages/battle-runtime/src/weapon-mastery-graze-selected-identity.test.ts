// UNIT-IDENTITY-EVIDENCE: selected-identity-replay GH530-WEAPON-MASTERY-GRAZE mastery_graze
// UNIT-IDENTITY-REPLAY: GH530-WEAPON-MASTERY-GRAZE mastery_graze doResolveGrazeMasteryMiss
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";
import { grazeSelectedIdentityReplay } from "./weapon-mastery-graze-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(grazeSelectedIdentityReplay);
