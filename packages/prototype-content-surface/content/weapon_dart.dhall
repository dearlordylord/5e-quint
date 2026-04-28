-- Dart — SRD 5.2.1 equipment.
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
      , id = "weapon_dart"
      , name = "Dart"
      , category = "simple"
      , usage = "ranged"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Dart from the SRD weapons table."
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
              , ammunition = None Text
              , unless = None Text
              }
            , { kind = "thrown"
              , range = Some { normal = 20, long = 60 }
              , damage = None WeaponDamage
              , ammunition = None Text
              , unless = None Text
              }
            ]
          : List WeaponProperty
      , mastery = "vex"
      , weightPounds = Some 0.25
      , costGp = 0.05
      }

in  weapon
