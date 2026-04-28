-- Heavy Crossbow — SRD 5.2.1 equipment.
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
      , id = "weapon_heavy_crossbow"
      , name = "Heavy Crossbow"
      , category = "martial"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Heavy Crossbow from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 10
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "ammunition"
              , range = Some { normal = 100, long = 400 }
              , damage = None WeaponDamage
              }
            , { kind = "heavy"
              , range = None WeaponRange
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
      , mastery = "push"
      , weightPounds = 18
      , costGp = 50
      }

in  weapon
