// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B23-FIREBALL-IDENTITY-WITNESS fireball
// UNIT-IDENTITY-REPLAY: B23-FIREBALL-IDENTITY-WITNESS fireball doDiscoverFireballSaveGatedDamage
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";

import { fireballSelectedIdentityReplay } from "./fireball-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(fireballSelectedIdentityReplay);
