-- War Pick — SRD 5.2.1 equipment.
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
      , id = "weapon_war_pick"
      , name = "War Pick"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "War Pick from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 8
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "versatile"
              , range = None WeaponRange
              , damage = Some
                { kind = "dice"
                , dice = Some 1
                , dieSize = Some 10
                , amount = None Natural
                , damageType = "piercing"
                }
              }
            ]
          : List WeaponProperty
      , mastery = "sap"
      , weightPounds = 2
      , costGp = 5
      }

in  weapon
