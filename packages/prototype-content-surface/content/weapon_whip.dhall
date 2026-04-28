-- Whip — SRD 5.2.1 equipment.
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
      , id = "weapon_whip"
      , name = "Whip"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Whip from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 4
        , amount = None Natural
        , damageType = "slashing"
        }
      , properties =
            [ { kind = "finesse"
              , range = None WeaponRange
              , damage = None WeaponDamage
              , ammunition = None Text
              , unless = None Text
              }
            , { kind = "reach"
              , range = None WeaponRange
              , damage = None WeaponDamage
              , ammunition = None Text
              , unless = None Text
              }
            ]
          : List WeaponProperty
      , mastery = "slow"
      , weightPounds = Some 3
      , costGp = 2
      }

in  weapon
