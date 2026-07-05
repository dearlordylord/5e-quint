// UNIT-IDENTITY-QNT-REPLAY: B24-LIGHTNING-BOLT-IDENTITY-WITNESS lightning_bolt doDiscoverLightningBoltSaveGatedDamage
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";

import { lightningBoltSelectedIdentityQntReplay } from "./lightning-bolt-selected-identity.qnt-replay.test-support.ts";

defineSelectedIdentityQntReplay(lightningBoltSelectedIdentityQntReplay);
