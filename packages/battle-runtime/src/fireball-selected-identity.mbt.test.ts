// UNIT-IDENTITY-QNT-REPLAY: B23-FIREBALL-IDENTITY-WITNESS fireball doDiscoverFireballSaveGatedDamage
import { defineSelectedIdentityQntReplay } from "./selected-identity-witness.ts";

import { fireballSelectedIdentityQntReplay } from "./fireball-selected-identity.qnt-replay.test-support.ts";

defineSelectedIdentityQntReplay(fireballSelectedIdentityQntReplay);
