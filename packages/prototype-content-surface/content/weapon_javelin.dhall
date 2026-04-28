-- Javelin — SRD 5.2.1 equipment.
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
      , id = "weapon_javelin"
      , name = "Javelin"
      , category = "simple"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Javelin from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 6
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "thrown"
              , range = Some { normal = 30, long = 120 }
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "slow"
      , weightPounds = 2
      , costGp = 0.5
      }

in  weapon
