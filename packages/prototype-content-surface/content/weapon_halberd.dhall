-- Halberd — SRD 5.2.1 equipment.
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
      , id = "weapon_halberd"
      , name = "Halberd"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Halberd from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 10
        , amount = None Natural
        , damageType = "slashing"
        }
      , properties =
            [ { kind = "heavy"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            , { kind = "reach"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            , { kind = "two_handed"
              , range = None WeaponRange
              , damage = None WeaponDamage
              }
            ]
          : List WeaponProperty
      , mastery = "cleave"
      , weightPounds = 6
      , costGp = 20
      }

in  weapon
