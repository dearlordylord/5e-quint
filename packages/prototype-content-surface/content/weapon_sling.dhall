-- Sling — SRD 5.2.1 equipment.
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
      , id = "weapon_sling"
      , name = "Sling"
      , category = "simple"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Sling from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 4
        , amount = None Natural
        , damageType = "bludgeoning"
        }
      , properties =
            [ { kind = "ammunition"
              , range = Some { normal = 30, long = 120 }
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "slow"
      , weightPounds = 0
      , costGp = 0.1
      }

in  weapon
