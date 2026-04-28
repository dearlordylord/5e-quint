-- Maul — SRD 5.2.1 equipment.
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
      , id = "weapon_maul"
      , name = "Maul"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Maul from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 2
        , dieSize = Some 6
        , amount = None Natural
        , damageType = "bludgeoning"
        }
      , properties =
            [ { kind = "heavy"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            , { kind = "two_handed"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "topple"
      , weightPounds = 10
      , costGp = 10
      }

in  weapon
