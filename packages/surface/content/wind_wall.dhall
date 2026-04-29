-- Wind Wall — SRD 5.2.1 Spell, level 3, Evocation.
--
-- RAW (Spells/Descriptions-S-Z#Wind Wall):
--   "When the wall appears, each creature in its area makes a Strength
--    saving throw, taking 4d8 Bludgeoning damage on a failed save or
--    half as much damage on a successful one."
--   "The strong wind keeps fog, smoke, and other gases at bay."
--   "Small or smaller flying creatures or objects can't pass through
--    the wall."
--   "Arrows, bolts, and other ordinary projectiles launched at targets
--    behind the wall are deflected upward and miss automatically.
--    Boulders hurled by Giants or siege engines, and similar
--    projectiles, are unaffected. Creatures in gaseous form can't pass
--    through it."
--
-- DEFERRED. "Loose, lightweight materials brought into the wall fly
-- upward" is non-creature object movement; no execution-facing atom yet.
-- Wall shaping is represented as a line footprint; height is recorded
-- in the description but the line area atom is footprint-only.

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount :
          Optional
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , projectile : Optional Text
      , exception : Optional Text
      , maxSize : Optional Text
      , includesObjects : Optional Bool
      }

let bludgeoningDamage : Effect =
      { kind = "damage"
      , damageType = Some "bludgeoning"
      , amount = Some { kind = "fixed", expr = { dice = 4, dieSize = 8 } }
      , projectile = None Text
      , exception = None Text
      , maxSize = None Text
      , includesObjects = None Bool
      }

let halfDamage : Effect =
      { kind = "half_damage"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , projectile = None Text
      , exception = None Text
      , maxSize = None Text
      , includesObjects = None Bool
      }

let blockProjectiles : Effect =
      { kind = "block_projectiles"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , projectile = Some "ordinary"
      , exception = Some "giant_or_siege"
      , maxSize = None Text
      , includesObjects = None Bool
      }

let blockGases : Effect =
      { kind = "block_gases_and_gaseous_creatures"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , projectile = None Text
      , exception = None Text
      , maxSize = None Text
      , includesObjects = None Bool
      }

let blockSmallFliers : Effect =
      { kind = "block_flying_movement"
      , damageType = None Text
      , amount =
          None
            { kind : Text
            , expr : { dice : Natural, dieSize : Natural }
            }
      , projectile = None Text
      , exception = None Text
      , maxSize = Some "small"
      , includesObjects = Some True
      }

let wallAttachment =
      { kind = "hole"
      , holeId = "wind_wall"
      , label = "wind wall"
      , value =
          { kind = "area"
          , shape = { kind = "line", lengthFeet = 50, widthFeet = 1 }
          , origin = { kind = "point_within_range" }
          }
      }

let windWall =
      { kind = "spell"
      , id = "wind_wall"
      , name = "Wind Wall"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Wind Wall"
          }
      , description =
          "A wall of strong wind rises from the ground at a point within range. You can make the wall up to 50 feet long, 15 feet high, and 1 foot thick. When the wall appears, each creature in its area makes a Strength saving throw, taking 4d8 Bludgeoning damage on a failed save or half as much damage on a successful one. The strong wind keeps fog, smoke, and other gases at bay. Small or smaller flying creatures or objects can't pass through the wall. Arrows, bolts, and other ordinary projectiles launched at targets behind the wall are deflected upward and miss automatically; giant-hurled boulders, siege-engine projectiles, and similar projectiles are unaffected. Creatures in gaseous form can't pass through it."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components =
              { v = True
              , s = True
              , m = Some "a fan and a feather"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = wallAttachment
          , initialPhase =
              { kind = "save_gate"
              , attachment = wallAttachment
              , ability = "str"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = bludgeoningDamage
              , onSuccess = halfDamage
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = blockProjectiles
                }
              , { trigger = { kind = "passive" }
                , effect = blockGases
                }
              , { trigger = { kind = "passive" }
                , effect = blockSmallFliers
                }
              ]
          }
      }

in  windWall
