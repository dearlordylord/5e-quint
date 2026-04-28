-- Defender — SRD 5.2.1 magic weapon template.
let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let WeaponFilter = { kind : Text, itemId : Optional Text }

let SourceItemFilter = { kind = "source_item", itemId = None Text }

let Effect =
      { kind : Text
      , delta : Optional Delta
      , on : Optional (List Text)
      , weaponFilter : Optional WeaponFilter
      , maxBonus : Optional Natural
      , from : Optional Text
      , trigger : Optional Text
      , duration : Optional Text
      }

let attackBonus =
      { kind = "modify_roll_numeric"
      , delta = Some { kind = "fixed_dice", dice = 3, dieSize = 1, sign = "+" }
      , on = Some [ "attack_roll" ]
      , weaponFilter = Some SourceItemFilter
      , maxBonus = None Natural
      , from = None Text
      , trigger = None Text
      , duration = None Text
      }

let damageBonus =
      { kind = "modify_damage_numeric"
      , delta = Some { kind = "fixed_dice", dice = 3, dieSize = 1, sign = "+" }
      , on = None (List Text)
      , weaponFilter = Some SourceItemFilter
      , maxBonus = None Natural
      , from = None Text
      , trigger = None Text
      , duration = None Text
      }

let acTransfer =
      { kind = "transfer_weapon_bonus_to_ac"
      , delta = None Delta
      , on = None (List Text)
      , weaponFilter = Some SourceItemFilter
      , maxBonus = Some 3
      , from = Some "attack_and_damage_bonus"
      , trigger = Some "first_attack_roll_each_turn"
      , duration = Some "start_of_next_turn"
      }

let defender =
      { kind = "weapon_template"
      , template = "any_weapon_magic"
      , id = "magic_item_defender"
      , name = "Defender"
      , provenance = { kind = "srd-5.2.1", section = "MagicItems#Defender" }
      , description =
          "You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. The first time you attack with it on each of your turns, you can transfer some or all of the bonus to your Armor Class while holding the weapon until the start of your next turn."
      , weaponApplicability.kind = "any_melee_weapon"
      , variants =
        [ { id = "magic_item_defender"
          , name = "Defender"
          , magic =
            { rarity = "legendary"
            , attunement.requiresAttunement = True
            , mechanics =
              { family = "passive"
              , condition = Some { kind = "holding_item" }
              , grants = [ attackBonus, damageBonus, acTransfer ] : List Effect
              }
            , destruction.kind = "none"
            }
          }
        ]
      }

in  defender
