-- Defender — SRD 5.2.1 magic item (Legendary, requires attunement).
--
-- Honest authored subset:
--   • passive held-item +3 bonus to attack rolls made with the weapon
--   • passive held-item +3 bonus to damage rolls made with the weapon
--
-- Omitted / proposal-backed gap:
--   • Bonus Transfer: "the first time you attack with the weapon on each
--     of your turns, you can transfer some or all of the weapon's bonus
--     to your Armor Class." The player chooses a split (0–3) between
--     attack/damage and AC each turn; the AC share lasts until the start
--     of the attacker's next turn.
--
--     This mechanic requires two surface concepts not yet present:
--     (a) a "first attack of my turn" trigger (not in OngoingTrigger,
--         ClassFeatureActivationCost, or MasteryTrigger)
--     (b) a "dynamic integer split" effect — transferring N points from
--         the existing attack/damage bonus to a turn-scoped AC bonus —
--         which has no v4 atom equivalent.
--     See proposal-magic_item_defender.md for widening proposals.

let SpecificItemFilter = { kind : Text, itemId : Text }

let PassiveEffect =
      { kind : Text
      , delta : { kind : Text, dice : Natural, dieSize : Natural, sign : Text }
      , on : Optional (List Text)
      , weaponFilter : Optional SpecificItemFilter
      }

let defender =
      { kind = "magic_item"
      , id = "magic_item_defender"
      , name = "Defender"
      , rarity = "legendary"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Defender"
          }
      , description =
          "You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. The first time you attack with the weapon on each of your turns, you can transfer some or all of the weapon's bonus to your Armor Class. For example, you could reduce the bonus to your attack rolls and damage rolls to +1 and gain a +2 bonus to Armor Class. The adjusted bonuses remain in effect until the start of your next turn, although you must hold the weapon to gain a bonus to AC from it."
      , mechanics =
          { family = "passive"
          , condition = { kind = "holding_item" }
          , grants =
              [ { kind = "modify_roll_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 3
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = Some [ "attack_roll" ]
                , weaponFilter =
                    Some
                      { kind = "specific_item"
                      , itemId = "magic_item_defender"
                      }
                } : PassiveEffect
              , { kind = "modify_damage_numeric"
                , delta =
                    { kind = "fixed_dice"
                    , dice = 3
                    , dieSize = 1
                    , sign = "+"
                    }
                , on = None (List Text)
                , weaponFilter =
                    Some
                      { kind = "specific_item"
                      , itemId = "magic_item_defender"
                      }
                } : PassiveEffect
              ]
          }
      , destruction = { kind = "none" }
      }

in  defender
