-- Lance — SRD 5.2.1 equipment.
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
      , id = "weapon_lance"
      , name = "Lance"
      , category = "martial"
      , usage = "melee"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Weapons" }
      , description = "Lance from the SRD weapons table."
      , damage =
        { kind = "dice"
        , dice = Some 1
        , dieSize = Some 10
        , amount = None Natural
        , damageType = "piercing"
        }
      , properties =
            [ { kind = "heavy"
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
            , { kind = "two_handed"
              , range = None WeaponRange
              , damage = None WeaponDamage
              , ammunition = None Text
              , unless = Some "mounted"
              }
            ]
          : List WeaponProperty
      , mastery = "topple"
      , weightPounds = Some 6
      , costGp = 10
      }

in  weapon
