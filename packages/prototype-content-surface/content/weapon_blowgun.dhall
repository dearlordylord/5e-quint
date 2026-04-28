-- Blowgun — SRD 5.2.1 equipment.
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
      , id = "weapon_blowgun"
      , name = "Blowgun"
      , category = "martial"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Blowgun from the SRD weapons table."
      , damage =
        { kind = "flat"
        , dice = None Natural
        , dieSize = None Natural
        , amount = Some 1
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "ammunition"
              , range = Some { normal = 25, long = 100 }
              , damage = None WeaponDamage
              }
            , { kind = "loading"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "vex"
      , weightPounds = 1
      , costGp = 10
      }

in  weapon
