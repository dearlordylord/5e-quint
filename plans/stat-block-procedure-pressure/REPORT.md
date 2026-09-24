# Stat Block Procedure Pressure

> Generated planning evidence. Runtime code must not import this directory. Regenerate with `pnpm generate:stat-block-procedure-pressure`.

The SRD catalog contributes **330 records** and **2604 procedure-bearing occurrences**. The proposed capability leaves are frequency-ranked planning pressure, not a support registry or completion ledger.

## Occurrence coverage

| Occurrence kind     | Count |
| ------------------- | ----: |
| section             |   454 |
| procedure           |   992 |
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
| executable   |  1149 |
| textOnly     |   906 |
| tableOwned   |    54 |
| missingOwner |   495 |
| malformed    |     0 |

## Unrestricted spell-reference classification

The current catalog join is identity-free: each row carries only its structural row ID, definition/profile status, group kind, source section, cast-level presence, casting-time kind, and duration kind. Authored spell IDs, names, and provenance are consulted at the catalog boundary and are not emitted in this join.

| Join view     | Rows | Definitions | Unresolved definitions | Shipped | Unresolved | Profiled | Unprofiled | Long casting | Shipped Concentration |
| ------------- | ---: | ----------: | ---------------------: | ------: | ---------: | -------: | ---------: | -----------: | --------------------: |
| current       |  286 |         101 |                      0 |     286 |          0 |      104 |        182 |           36 |                   126 |
| preResolution |  286 |         101 |                     35 |     215 |         71 |      104 |        182 |           21 |                   104 |

The pre-resolution view is the pinned SRD baseline in `plans/stat-block-procedure-pressure/pre-resolution-baseline.json`, used to prove the #418 partition: 286 = 104 shipped/profiled + 111 shipped/unprofiled + 71 unresolved, with 21 long-casting rows and 104 shipped Concentration rows. The current view reflects the admitted SRD definitions; these rows remain non-executable until a typed owner admits them.

## Bounded generic capability proposals

Pressure score is occurrence count plus distinct Stat Block count. At most 24 proposals are emitted.

| Rank | Occurrence        | Surface shape                                             | Failed facts                                        | Occurrences | Records | Pressure | Source examples                                                                                                                                                                                                                                |
| ---: | ----------------- | --------------------------------------------------------- | --------------------------------------------------- | ----------: | ------: | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | spellReference    | {"kind":"spellReference","restrictionPresence":"absent"}  | missingStatBlockSpellInvocationOwner                |         286 |      50 |      336 | [Adult Black Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L1657-L1752), [Ancient Black Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L1754-L1849), [Adult Blue Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L2162-L2255)   |
|    2 | spellcastingGroup | {"kind":"spellcastingGroup","groupKind":"limited"}        | missingStatBlockSpellcastingGroupOwner              |          59 |      48 |      107 | [Adult Black Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L1657-L1752), [Ancient Black Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L1754-L1849), [Adult Blue Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L2162-L2255)   |
|    3 | procedure         | {"kind":"procedure","procedureKind":"save"}               | missingSaveProcedureOwner                           |          48 |      48 |       96 | [Ankheg](../../.references/srd-5.2.1/monsters-A-Z.md#L398-L471), [Behir](../../.references/srd-5.2.1/monsters-A-Z.md#L1339-L1419), [Black Dragon Wyrmling](../../.references/srd-5.2.1/monsters-A-Z.md#L1499-L1576)                            |
|    4 | spellcastingGroup | {"kind":"spellcastingGroup","groupKind":"at_will"}        | missingStatBlockSpellcastingGroupOwner              |          48 |      47 |       95 | [Adult Black Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L1657-L1752), [Ancient Black Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L1754-L1849), [Adult Blue Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L2162-L2255)   |
|    5 | section           | {"kind":"reactionSection"}                                | reactionTriggerAndResourceLifecycle                 |          24 |      24 |       48 | [Giant Octopus](../../.references/srd-5.2.1/animals.md#L2808-L2886), [Octopus](../../.references/srd-5.2.1/animals.md#L4652-L4732), [Bandit Captain](../../.references/srd-5.2.1/monsters-A-Z.md#L1014-L1091)                                  |
|    6 | spellReference    | {"kind":"spellReference","restrictionPresence":"present"} | missingStatBlockSpellInvocationOwner                |          23 |      21 |       44 | [Adult Brass Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L2586-L2681), [Ancient Brass Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L2683-L2778), [Adult Bronze Dragon](../../.references/srd-5.2.1/monsters-A-Z.md#L2944-L3042) |
|    7 | procedure         | {"kind":"procedure","procedureKind":"attack_roll"}        | unsupportedAttackEffect, unsupportedAttackMechanics |           5 |       5 |       10 | [Giant Vulture](../../.references/srd-5.2.1/animals.md#L3491-L3564), [Cloud Giant](../../.references/srd-5.2.1/monsters-A-Z.md#L3901-L3981), [Couatl](../../.references/srd-5.2.1/monsters-A-Z.md#L4475-L4560)                                 |
|    8 | procedure         | {"kind":"procedure","procedureKind":"action_option"}      | unsupportedStandardAction                           |           2 |       2 |        4 | [Assassin](../../.references/srd-5.2.1/monsters-A-Z.md#L475-L559), [Spy](../../.references/srd-5.2.1/monsters-A-Z.md#L16338-L16413)                                                                                                            |

The JSON companion contains every occurrence with a stable structural row ID, its identity-free structural shape, closed disposition, source witness, structural frequency group, and the same bounded proposal ranking. Every group and proposal carries the complete member-row relationship; example witnesses remain a short presentation aid rather than the membership authority.
