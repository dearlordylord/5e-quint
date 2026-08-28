# Stat Block Procedure Pressure

> Generated planning evidence. Runtime code must not import this directory. Regenerate with `pnpm generate:stat-block-procedure-pressure`.

The SRD catalog contributes **330 records** and **2602 procedure-bearing occurrences**. The proposed capability leaves are frequency-ranked planning pressure, not a support registry or completion ledger.

## Occurrence coverage

| Occurrence kind     | Count |
| ------------------- | ----: |
| section             |   455 |
| procedure           |   989 |
| trait               |   337 |
| reactionTrigger     |     0 |
| spellcastingGroup   |   107 |
| spellReference      |   309 |
| resourceDeclaration |   195 |
| resourceReference   |   165 |
| procedureReference  |    45 |

## Dispositions

| Disposition  | Count |
| ------------ | ----: |
| executable   |  1142 |
| textOnly     |   912 |
| tableOwned   |    54 |
| missingOwner |   494 |
| malformed    |     0 |

## Bounded generic capability proposals

Pressure score is occurrence count plus distinct Stat Block count. At most 24 proposals are emitted.

| Rank | Occurrence        | Surface shape                                             | Failed facts                           | Occurrences | Records | Pressure | Source examples                                                                                                                                                                                                                                                           |
| ---: | ----------------- | --------------------------------------------------------- | -------------------------------------- | ----------: | ------: | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | spellReference    | {"kind":"spellReference","restrictionPresence":"absent"}  | missingStatBlockSpellInvocationOwner   |         286 |      50 |      336 | [Adult Black Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L724-L772), [Ancient Black Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L776-L824), [Adult Blue Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L962-L1008)        |
|    2 | spellcastingGroup | {"kind":"spellcastingGroup","groupKind":"limited"}        | missingStatBlockSpellcastingGroupOwner |          59 |      48 |      107 | [Adult Black Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L724-L772), [Ancient Black Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L776-L824), [Adult Blue Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L962-L1008)        |
|    3 | procedure         | {"kind":"procedure","procedureKind":"save"}               | missingSaveProcedureOwner              |          48 |      48 |       96 | [Ankheg](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L180-L207), [Behir](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L583-L618), [Black Dragon Wyrmling](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L654-L685)                                |
|    4 | spellcastingGroup | {"kind":"spellcastingGroup","groupKind":"at_will"}        | missingStatBlockSpellcastingGroupOwner |          48 |      47 |       95 | [Adult Black Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L724-L772), [Ancient Black Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L776-L824), [Adult Blue Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L962-L1008)        |
|    5 | section           | {"kind":"reactionSection"}                                | reactionTriggerAndResourceLifecycle    |          24 |      24 |       48 | [Giant Octopus](../../.references/srd-5.2.1/Animals.md#L1053-L1081), [Octopus](../../.references/srd-5.2.1/Animals.md#L1757-L1788), [Bandit Captain](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L442-L473)                                                      |
|    6 | spellReference    | {"kind":"spellReference","restrictionPresence":"present"} | missingStatBlockSpellInvocationOwner   |          23 |      21 |       44 | [Adult Brass Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L1166-L1214), [Ancient Brass Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L1218-L1266), [Adult Bronze Dragon](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L1346-L1396) |
|    7 | procedure         | {"kind":"procedure","procedureKind":"attack_roll"}        | unsupportedAttackEffect                |           4 |       4 |        8 | [Giant Vulture](../../.references/srd-5.2.1/Animals.md#L1322-L1347), [Cloud Giant](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md#L228-L261), [Couatl](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md#L479-L515)                                              |
|    8 | procedure         | {"kind":"procedure","procedureKind":"action_option"}      | unsupportedStandardAction              |           2 |       2 |        4 | [Assassin](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md#L211-L247), [Spy](../../.references/srd-5.2.1/Monsters/Monsters-P-S.md#L1513-L1539)                                                                                                                       |

The JSON companion contains every occurrence with a stable structural row ID, its identity-free structural shape, closed disposition, source witness, structural frequency group, and the same bounded proposal ranking. Every group and proposal carries the complete member-row relationship; example witnesses remain a short presentation aid rather than the membership authority.
