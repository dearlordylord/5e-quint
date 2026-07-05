// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B24-LIGHTNING-BOLT-IDENTITY-WITNESS lightning_bolt
// UNIT-IDENTITY-REPLAY: B24-LIGHTNING-BOLT-IDENTITY-WITNESS lightning_bolt doDiscoverLightningBoltSaveGatedDamage
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

import { lightningBoltSelectedIdentityReplay } from "./lightning-bolt-selected-identity.replay-data.test-support.ts";

defineSelectedIdentityReplayWitness(lightningBoltSelectedIdentityReplay);
