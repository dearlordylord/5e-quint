import {
  BANDIT,
  BANDIT_CAPTAIN,
  BERSERKER,
  COMMONER,
  CULTIST,
  CULTIST_FANATIC,
  GLADIATOR,
  GUARD,
  GUARD_CAPTAIN,
  KNIGHT,
  KOBOLD_WARRIOR,
  MAGE,
  NOBLE,
  OGRE,
  PIRATE,
  PIRATE_CAPTAIN,
  PRIEST,
  SAHUAGIN_WARRIOR,
  SCOUT,
  SPY,
  TOUGH,
  TOUGH_BOSS,
  WARRIOR_INFANTRY,
  WARRIOR_VETERAN,
} from "#/monster-catalog-srd-expanded.ts";
import { ABOLETH } from "#/monster-catalog-aboleths.ts";
import { CENTAUR_TROOPER } from "#/monster-catalog-centaurs.ts";
import {
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
} from "#/monster-catalog-goblins.ts";
import { CANONICAL_SRD_MONSTER_PROVENANCE } from "#/monster-catalog-helpers.ts";
import { HARPY } from "#/monster-catalog-harpies.ts";
import { PSEUDODRAGON } from "#/monster-catalog-pseudodragons.ts";
import { type StatBlock } from "#/monster-types.ts";

export { CENTAUR_TROOPER } from "#/monster-catalog-centaurs.ts";
export { ABOLETH } from "#/monster-catalog-aboleths.ts";
export {
  GOBLIN_BOSS,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
} from "#/monster-catalog-goblins.ts";
export { HARPY } from "#/monster-catalog-harpies.ts";
export { PSEUDODRAGON } from "#/monster-catalog-pseudodragons.ts";
export {
  BANDIT,
  BANDIT_CAPTAIN,
  BERSERKER,
  COMMONER,
  CULTIST,
  CULTIST_FANATIC,
  GLADIATOR,
  GUARD,
  GUARD_CAPTAIN,
  KNIGHT,
  KOBOLD_WARRIOR,
  MAGE,
  NOBLE,
  OGRE,
  PIRATE,
  PIRATE_CAPTAIN,
  PRIEST,
  SAHUAGIN_WARRIOR,
  SCOUT,
  SPY,
  TOUGH,
  TOUGH_BOSS,
  WARRIOR_INFANTRY,
  WARRIOR_VETERAN,
} from "#/monster-catalog-srd-expanded.ts";

export const MONSTER_STAT_BLOCK_IDS = [
  "aboleth",
  "bandit",
  "banditCaptain",
  "berserker",
  "centaurTrooper",
  "commoner",
  "cultist",
  "cultistFanatic",
  "gladiator",
  "goblinMinion",
  "goblinWarrior",
  "goblinBoss",
  "guard",
  "guardCaptain",
  "harpy",
  "knight",
  "koboldWarrior",
  "mage",
  "noble",
  "ogre",
  "pirate",
  "pirateCaptain",
  "pseudodragon",
  "priest",
  "sahuaginWarrior",
  "scout",
  "spy",
  "tough",
  "toughBoss",
  "warriorInfantry",
  "warriorVeteran",
] as const;
export type MonsterStatBlockId = (typeof MONSTER_STAT_BLOCK_IDS)[number];

export const MONSTER_STAT_BLOCK_PROVENANCE = {
  defaultSource: ".references/srd-5.2.1/",
  defaultSourceName: CANONICAL_SRD_MONSTER_PROVENANCE.sourceName,
  defaultSourceKind: CANONICAL_SRD_MONSTER_PROVENANCE.sourceKind,
  defaultLicense: CANONICAL_SRD_MONSTER_PROVENANCE.license,
  externalSourcePolicy:
    "Any non-SRD corpus requires explicit owner approval before it becomes a catalog source of truth.",
  researchOnlySources:
    "5etools and similar corpora remain research-only until a later plan change explicitly promotes them.",
  ownership:
    "Core owns named monster stat blocks. MCP and other adapters must reference catalog IDs rather than restate RAW literals.",
  quintFixtures:
    "Existing named stat blocks in creature.qnt are MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.",
} as const;

export const MONSTER_STAT_BLOCKS: Readonly<
  Record<MonsterStatBlockId, StatBlock>
> = {
  aboleth: ABOLETH,
  bandit: BANDIT,
  banditCaptain: BANDIT_CAPTAIN,
  berserker: BERSERKER,
  centaurTrooper: CENTAUR_TROOPER,
  commoner: COMMONER,
  cultist: CULTIST,
  cultistFanatic: CULTIST_FANATIC,
  gladiator: GLADIATOR,
  goblinMinion: GOBLIN_MINION,
  goblinWarrior: GOBLIN_WARRIOR,
  goblinBoss: GOBLIN_BOSS,
  guard: GUARD,
  guardCaptain: GUARD_CAPTAIN,
  harpy: HARPY,
  knight: KNIGHT,
  koboldWarrior: KOBOLD_WARRIOR,
  mage: MAGE,
  noble: NOBLE,
  ogre: OGRE,
  pirate: PIRATE,
  pirateCaptain: PIRATE_CAPTAIN,
  pseudodragon: PSEUDODRAGON,
  priest: PRIEST,
  sahuaginWarrior: SAHUAGIN_WARRIOR,
  scout: SCOUT,
  spy: SPY,
  tough: TOUGH,
  toughBoss: TOUGH_BOSS,
  warriorInfantry: WARRIOR_INFANTRY,
  warriorVeteran: WARRIOR_VETERAN,
};

export function getMonsterStatBlock(id: MonsterStatBlockId): StatBlock {
  return MONSTER_STAT_BLOCKS[id];
}
