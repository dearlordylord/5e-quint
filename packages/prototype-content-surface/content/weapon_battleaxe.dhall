-- Battleaxe — SRD 5.2.1 equipment.
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
      , id = "weapon_battleaxe"
      , name = "Battleaxe"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Battleaxe from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 8
        , amount = None Natural
        , damageType = "slashing"
        }
      , properties =
            [ { kind = "versatile"
              , range = None WeaponRange
              , damage = Some
                { kind = "dice"
                , dice = Some 1
                , dieSize = Some 10
                , amount = None Natural
                , damageType = "slashing"
                }
              , ammunition = None Text
              , unless = None Text
              }
            ]
          : List WeaponProperty
      , mastery = "topple"
      , weightPounds = Some 4
      , costGp = 10
      }

in  weapon
