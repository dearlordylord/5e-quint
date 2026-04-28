-- Dagger — SRD 5.2.1 equipment.
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
      , id = "weapon_dagger"
      , name = "Dagger"
      , category = "simple"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Dagger from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 4
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "finesse"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            , { kind = "light"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            , { kind = "thrown"
              , range = Some { normal = 20, long = 60 }
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "nick"
      , weightPounds = 1
      , costGp = 2
      }

in  weapon
