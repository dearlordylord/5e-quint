-- Fireball - SRD 5.2.1 Spell, level 3, Evocation.
--
-- RAW (Spells / Descriptions E-L / Fireball):
--   "A bright streak flashes from you to a point you choose within
--    range and then blossoms with a low roar into a fiery explosion.
--    Each creature in a 20-foot-radius Sphere centered on that point
--    makes a Dexterity saving throw, taking 8d6 Fire damage on a
--    failed save or half as much damage on a successful one."
--   "Flammable objects in the area that aren't being worn or carried
--    start burning."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d6 for
--    each spell slot level above 3."
--
-- Fireball is the canonical point-anchored sphere AoE; it exercises:
--   * AreaShapeDescriptor.sphere (radiusFeet = 20)
--   * AreaOrigin.point_within_range (range 150 ft)
--   * DiceAmount.linear_per_level (axis=slot, base=8d6, +1d6/slot)
--   * SaveSuccessOutcome.half_damage
--   * direct unattended flammable-object ignition in the same area
--   * explicit initial hole for the chosen point within range

let DiceAmount : Type =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , filter :
          Optional
            { material : Optional Text
            , heldOrWorn : Optional Text
            }
      }

let fireDamage : Effect =
      { kind = "damage"
      , damageType = Some "fire"
      , amount =
          Some
            { kind = "linear_per_level"
            , axis = "slot"
            , base = { dice = 8, dieSize = 6 }
            , perLevel = { dice = 1 }
            , startingAtLevel = 3
            }
      , filter =
          None
            { material : Optional Text
            , heldOrWorn : Optional Text
            }
      }

let halfDamage : Effect =
      { kind = "half_damage"
      , damageType = None Text
      , amount = None DiceAmount
      , filter =
          None
            { material : Optional Text
            , heldOrWorn : Optional Text
            }
      }

let igniteUnattendedFlammableObjects : Effect =
      { kind = "ignite_objects"
      , damageType = None Text
      , amount = None DiceAmount
      , filter =
          Some
            { material = Some "flammable"
            , heldOrWorn = Some "forbidden"
            }
      }

let AreaAttachment : Type =
      { kind : Text
      , holeId : Text
      , label : Text
      , value :
          { kind : Text
          , shape : { kind : Text, radiusFeet : Natural }
          , origin : { kind : Text }
          }
      }

let fireballArea : AreaAttachment =
      { kind = "hole"
      , holeId = "fireball_point"
      , label = "point of explosion"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 20 }
          , origin = { kind = "point_within_range" }
          }
      }

let Phase : Type =
      { kind : Text
      , attachment : AreaAttachment
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Effect
      , onSuccess : Optional Effect
      , effects : Optional (List Effect)
      }

let savePhase : Phase =
      { kind = "save_gate"
      , attachment = fireballArea
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some fireDamage
      , onSuccess = Some halfDamage
      , effects = None (List Effect)
      }

let ignitePhase : Phase =
      { kind = "direct"
      , attachment = fireballArea
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None Effect
      , onSuccess = None Effect
      , effects = Some [ igniteUnattendedFlammableObjects ]
      }

let fireball =
      { kind = "spell"
      , id = "fireball"
      , name = "Fireball"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fireball"
          }
      , description =
          "A bright streak flashes from you to a point you choose within range and then blossoms with a low roar into a fiery explosion. Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren't being worn or carried start burning. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components =
              { v = True
              , s = True
              , m = Some "a ball of bat guano and sulfur"
              }
          , duration = { kind = "instantaneous" }
          , phases = [ savePhase, ignitePhase ]
          }
      }

in  fireball
