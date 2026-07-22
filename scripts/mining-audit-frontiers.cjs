const miningAuditCharacterLevels = [7, 8, 9, 10, 11, 12];

const miningAuditFrontiers = miningAuditCharacterLevels.map(
  (maxCharacterLevel) => ({
    id: `level1-${maxCharacterLevel}`,
    maxCharacterLevel,
    title: `Character Levels 1-${maxCharacterLevel} Mining Audit`,
    jsonFilename: `level1-${maxCharacterLevel}-mining-audit.json`,
    reportFilename: `LEVEL1_${maxCharacterLevel}_MINING_AUDIT.md`,
  }),
);

module.exports = { miningAuditFrontiers };
