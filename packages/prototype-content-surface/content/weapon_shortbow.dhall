-- Shortbow — SRD 5.2.1 equipment.
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
      , ammunition : Optional Text
      , unless : Optional Text
      }

let weapon =
      { kind = "weapon"
      , id = "weapon_shortbow"
      , name = "Shortbow"
      , category = "simple"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Shortbow from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 6
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "ammunition"
              , range = Some { normal = 80, long = 320 }
              , damage = None WeaponDamage
              , ammunition = Some "arrow"
              , unless = None Text
              }
            , { kind = "two_handed"
              , range = None WeaponRange
              , damage = None WeaponDamage
              , ammunition = None Text
              , unless = None Text
              }
            ]
          : List WeaponProperty
      , mastery = "vex"
      , weightPounds = Some 2
      , costGp = 25
      }

in  weapon
