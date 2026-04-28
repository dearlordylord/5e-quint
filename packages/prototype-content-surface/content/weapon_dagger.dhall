-- Dagger — SRD 5.2.1 equipment.

let WeaponRange = { normal : Natural, long : Natural }

let WeaponDamage = { dice : Natural, dieSize : Natural, damageType : Text }

let WeaponProperty =
      { kind : Text
      , range : Optional WeaponRange
      , damage : Optional WeaponDamage
      }

let dagger =
      { kind = "weapon"
      , id = "weapon_dagger"
      , name = "Dagger"
      , category = "simple"
      , usage = "melee"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Weapons"
          }
      , description =
          "A Dagger is a Simple Melee Weapon that deals 1d4 Piercing damage and has the Finesse, Light, and Thrown properties."
      , damage = { dice = 1, dieSize = 4, damageType = "piercing" }
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
          ] : List WeaponProperty
      , mastery = "nick"
      , weightPounds = 1
      , costGp = 2
      }

in  dagger
