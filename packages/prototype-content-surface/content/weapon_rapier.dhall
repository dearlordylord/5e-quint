-- Rapier — SRD 5.2.1 equipment.
let WeaponRange = { normal : Natural, long : Natural }

let WeaponDamage =
      { kind : Text
      , dice : Optional Natural
      , dieSize : Optional Natural
      , amount : Optional Natural
      , damageType : Text
      }

let WeaponProperty =
      { kind : Text
      , range : Optional WeaponRange
      , damage : Optional WeaponDamage
      }

let weapon =
      { kind = "weapon"
      , id = "weapon_rapier"
      , name = "Rapier"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Rapier from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 8
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "finesse"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "vex"
      , weightPounds = 2
      , costGp = 25
      }

in  weapon
