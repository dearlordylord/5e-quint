-- Musket — SRD 5.2.1 equipment.
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
      , id = "weapon_musket"
      , name = "Musket"
      , category = "martial"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Musket from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 12
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "ammunition"
              , range = Some { normal = 40, long = 120 }
              , damage = None WeaponDamage
              }
            , { kind = "loading"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            , { kind = "two_handed"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "slow"
      , weightPounds = 10
      , costGp = 500
      }

in  weapon
