# Stat Block Execution Reconciliation

> Generated planning and coverage evidence. Production code must not import this directory. Regenerate with `pnpm generate:stat-block-execution-reconciliation`.

Every one of the **2602** #350 structural rows is assigned exactly once. The checked state remains distinct from authored catalog presence and from GitHub execution status.

## State totals

| State        | Rows |
| ------------ | ---: |
| executable   | 1084 |
| missingOwner |  552 |
| textOnly     |  912 |
| tableOwned   |   54 |
| malformed    |    0 |

## Generic families

| Family                                         | Runtime state | Formal evidence | Rows | Stat Blocks | Profile                                  | Obligation                                      | Follow-up |
| ---------------------------------------------- | ------------- | --------------- | ---: | ----------: | ---------------------------------------- | ----------------------------------------------- | --------: |
| stat-block.action-lifecycle                    | executable    | covered         |  329 |         329 | stat-block.action-lifecycle              | BATTLE.STAT_BLOCK.ACTION_LIFECYCLE              |         — |
| stat-block.bonus-action-lifecycle              | executable    | covered         |   78 |          72 | stat-block.bonus-action-lifecycle        | BATTLE.STAT_BLOCK.BONUS_ACTION_LIFECYCLE        |         — |
| stat-block.legendary-action-lifecycle          | executable    | covered         |    6 |           3 | stat-block.legendary-action-lifecycle    | BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE    |         — |
| stat-block.attack-procedure                    | executable    | needs-qnt-owner |  252 |         213 | stat-block.attack-procedure              | BATTLE.STAT_BLOCK.ATTACK_PROCEDURE              |      #427 |
| stat-block.multiattack                         | executable    | covered         |   89 |          44 | stat-block.multiattack                   | BATTLE.STAT_BLOCK.MULTIATTACK                   |         — |
| stat-block.resource-lifecycle                  | executable    | covered         |  330 |         122 | stat-block.resource-lifecycle            | BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE            |         — |
| stat-block.spell-invocation.unrestricted       | missingOwner  | not-applicable  |  286 |          50 | stat-block.spell-invocation.unrestricted | BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED |      #418 |
| stat-block.spellcasting.procedure              | missingOwner  | not-applicable  |   58 |          51 | stat-block.spellcasting.procedure        | BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE        |      #419 |
| stat-block.spellcasting.limited-group          | missingOwner  | not-applicable  |   59 |          48 | stat-block.spellcasting.limited-group    | BATTLE.STAT_BLOCK.SPELLCASTING_LIMITED_GROUP    |      #420 |
| stat-block.save-procedure                      | missingOwner  | not-applicable  |   48 |          48 | stat-block.save-procedure                | BATTLE.STAT_BLOCK.SAVE_PROCEDURE                |      #421 |
| stat-block.spellcasting.at-will-group          | missingOwner  | not-applicable  |   48 |          47 | stat-block.spellcasting.at-will-group    | BATTLE.STAT_BLOCK.SPELLCASTING_AT_WILL_GROUP    |      #422 |
| stat-block.reaction-lifecycle                  | missingOwner  | not-applicable  |   24 |          24 | stat-block.reaction-lifecycle            | BATTLE.STAT_BLOCK.REACTION_LIFECYCLE            |      #423 |
| stat-block.spell-invocation.restricted         | missingOwner  | not-applicable  |   23 |          21 | stat-block.spell-invocation.restricted   | BATTLE.STAT_BLOCK.SPELL_INVOCATION_RESTRICTED   |      #424 |
| stat-block.attack-additional-effect            | missingOwner  | not-applicable  |    4 |           4 | stat-block.attack-additional-effect      | BATTLE.STAT_BLOCK.ATTACK_ADDITIONAL_EFFECT      |      #425 |
| stat-block.standard-action-option              | missingOwner  | not-applicable  |    2 |           2 | stat-block.standard-action-option        | BATTLE.STAT_BLOCK.STANDARD_ACTION_OPTION        |      #426 |
| stat-block.text-only.procedure                 | textOnly      | not-applicable  |  585 |         240 | —                                        | —                                               |         — |
| stat-block.text-only.trait                     | textOnly      | not-applicable  |  327 |         196 | —                                        | —                                               |         — |
| stat-block.table-owned.legendary-lair-presence | tableOwned    | not-applicable  |   27 |          27 | —                                        | —                                               |         — |
| stat-block.table-owned.legendary-lair-section  | tableOwned    | not-applicable  |   27 |          27 | —                                        | —                                               |         — |
| stat-block.malformed                           | malformed     | not-applicable  |    0 |           0 | —                                        | —                                               |         — |

The JSON companion owns the complete row-to-family assignments and each family's complete member-row list. GitHub #114 owns the nine missing-owner child issues; #351 is their reconciliation blocker until this checked mapping is integrated.
