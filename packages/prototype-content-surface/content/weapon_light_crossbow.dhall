-- Light Crossbow — SRD 5.2.1 equipment.
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
      , id = "weapon_light_crossbow"
      , name = "Light Crossbow"
      , category = "simple"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Light Crossbow from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 8
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "ammunition"
              , range = Some { normal = 80, long = 320 }
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
      , weightPounds = 5
      , costGp = 25
      }

in  weapon
