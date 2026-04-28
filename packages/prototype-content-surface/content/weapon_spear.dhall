-- Spear — SRD 5.2.1 equipment.
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
      , id = "weapon_spear"
      , name = "Spear"
      , category = "simple"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Spear from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 6
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "thrown"
              , range = Some { normal = 20, long = 60 }
              , damage = None WeaponDamage
              }
            , { kind = "versatile"
              , range = None WeaponRange
              , damage = Some
                { kind = "dice"
                , dice = Some 1
                , dieSize = Some 8
                , amount = None Natural
                , damageType = "piercing"
                }
              }
            ]
          : List WeaponProperty
      , mastery = "sap"
      , weightPounds = 3
      , costGp = 1
      }

in  weapon
