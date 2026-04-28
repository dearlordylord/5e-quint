-- Defender — SRD 5.2.1 magic weapon template.
-- The dynamic AC transfer remains outside the current surface; the passive +3 attack and damage bonus is represented.
let Delta = { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let Effect = { kind : Text, delta : Delta, on : Optional (List Text) }

let attackBonus =
      { kind = "modify_roll_numeric"
      , delta = { kind = "fixed_dice", dice = 3, dieSize = 1, sign = "+" }
      , on = Some [ "attack_roll" ]
      }

let damageBonus =
      { kind = "modify_damage_numeric"
      , delta = { kind = "fixed_dice", dice = 3, dieSize = 1, sign = "+" }
      , on = None (List Text)
      }

let defender =
      { kind = "weapon_template"
      , template = "any_weapon_magic"
      , id = "magic_item_defender"
      , name = "Defender"
      , provenance = { kind = "srd-5.2.1", section = "MagicItems#Defender" }
      , description =
          "You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. The first-attack bonus transfer to AC is not yet represented."
      , weaponApplicability.kind = "any_melee_weapon"
      , variants =
        [ { id = "magic_item_defender"
          , name = "Defender"
          , magic =
            { rarity = "legendary"
            , attunement.requiresAttunement = True
            , mechanics =
              { family = "passive"
              , grants = [ attackBonus, damageBonus ] : List Effect
              }
            , destruction.kind = "none"
            }
          }
        ]
      }

in  defender
