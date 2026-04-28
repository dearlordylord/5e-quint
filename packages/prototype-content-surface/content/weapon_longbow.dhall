-- Longbow — SRD 5.2.1 equipment.

let WeaponRange = { normal : Natural, long : Natural }

let WeaponDamage = { dice : Natural, dieSize : Natural, damageType : Text }

let WeaponProperty =
      { kind : Text
      , range : Optional WeaponRange
      , damage : Optional WeaponDamage
      }

let longbow =
      { kind = "weapon"
      , id = "weapon_longbow"
      , name = "Longbow"
      , category = "martial"
      , usage = "ranged"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Weapons"
          }
      , description =
          "A Longbow is a Martial Ranged Weapon that deals 1d8 Piercing damage and has the Ammunition, Heavy, and Two-Handed properties."
      , damage = { dice = 1, dieSize = 8, damageType = "piercing" }
      , properties =
          [ { kind = "ammunition"
            , range = Some { normal = 150, long = 600 }
            , damage = None WeaponDamage
            }
          , { kind = "heavy"
            , range = None WeaponRange
            , damage = None WeaponDamage
            }
          , { kind = "two_handed"
            , range = None WeaponRange
            , damage = None WeaponDamage
            }
          ] : List WeaponProperty
      , mastery = "slow"
      , weightPounds = 2
      , costGp = 50
      }

in  longbow
