-- Longsword — SRD 5.2.1 equipment.

let WeaponRange = { normal : Natural, long : Natural }

let WeaponDamage = { dice : Natural, dieSize : Natural, damageType : Text }

let WeaponProperty =
      { kind : Text
      , range : Optional WeaponRange
      , damage : Optional WeaponDamage
      }

let longsword =
      { kind = "weapon"
      , id = "weapon_longsword"
      , name = "Longsword"
      , category = "martial"
      , usage = "melee"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Weapons"
          }
      , description =
          "A Longsword is a Martial Melee Weapon that deals 1d8 Slashing damage and has the Versatile property."
      , damage = { dice = 1, dieSize = 8, damageType = "slashing" }
      , properties =
          [ { kind = "versatile"
            , range = None WeaponRange
            , damage = Some { dice = 1, dieSize = 10, damageType = "slashing" }
            }
          ] : List WeaponProperty
      , mastery = "sap"
      , weightPounds = 3
      , costGp = 15
      }

in  longsword
