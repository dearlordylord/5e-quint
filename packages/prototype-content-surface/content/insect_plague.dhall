-- Insect Plague — SRD 5.2.1 Spell, level 5, Conjuration.
--
-- RAW (Spells/Descriptions-E-L#Insect Plague):
--   "Swarming locusts fill a 20-foot-radius Sphere centered on a point
--    you choose within range. The Sphere remains for the duration, and
--    its area is Lightly Obscured and Difficult Terrain."
--   "When the swarm appears, each creature in it makes a Constitution
--    saving throw, taking 4d10 Piercing damage on a failed save or half
--    as much damage on a successful one."
--   "A creature also makes this save when it enters the spell's area for
--    the first time on a turn or ends its turn there. A creature makes
--    this save only once per turn."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d10 for
--    each spell slot level above 5."

let DiceAmount : Type =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , perLevel : { dice : Natural }
      , startingAtLevel : Natural
      }

let Atom : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , effects :
          Optional
            ( List
                { kind : Text
                , amount : Optional DiceAmount
                , damageType : Optional Text
                }
            )
      }

let noneAtom =
      { amount = None DiceAmount
      , damageType = None Text
      , effects =
          None
            ( List
                { kind : Text
                , amount : Optional DiceAmount
                , damageType : Optional Text
                }
            )
      }

let plagueDamageAmount : DiceAmount =
      { kind = "linear_per_level"
      , axis = "slot"
      , base = { dice = 4, dieSize = 10 }
      , perLevel = { dice = 1 }
      , startingAtLevel = 5
      }

let piercingDamage : Atom =
      noneAtom
        //  { kind = "damage"
            , amount = Some plagueDamageAmount
            , damageType = Some "piercing"
            }

let difficultTerrain : Atom =
      noneAtom // { kind = "area_is_difficult_terrain" }

let lightlyObscured : Atom =
      noneAtom // { kind = "area_is_lightly_obscured" }

let areaTraits : Atom =
      noneAtom
        //  { kind = "composite"
            , effects =
                Some
                  [ difficultTerrain.{ kind, amount, damageType }
                  , lightlyObscured.{ kind, amount, damageType }
                  ]
            }

let Effect : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , effects :
          Optional
            ( List
                { kind : Text
                , amount : Optional DiceAmount
                , damageType : Optional Text
                }
            )
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Atom
      , onSuccess : Optional { kind : Text }
      }

let atomEffect =
      \(atom : Atom) ->
        atom
        //  { ability = None Text
            , dc = None { kind : Text }
            , onFail = None Atom
            , onSuccess = None { kind : Text }
            }

let plagueSave : Effect =
      noneAtom
        //  { kind = "save_gate"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some piercingDamage
            , onSuccess = Some { kind = "half_damage" }
            }

let plagueArea =
      { kind = "hole"
      , holeId = "insect_plague_sphere"
      , label = "swarming locusts"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 20 }
          , origin = { kind = "point_within_range" }
          }
      }

let Operation : Type =
      { trigger : { kind : Text }
      , effect : Effect
      , usageLimit : Optional { kind : Text }
      }

let insectPlague =
      { kind = "spell"
      , id = "insect_plague"
      , name = "Insect Plague"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Insect Plague"
          }
      , description =
          "Swarming locusts fill a 20-foot-radius Sphere centered on a point within range. The Sphere remains for the duration, and its area is Lightly Obscured and Difficult Terrain. When the swarm appears, each creature in it makes a Constitution saving throw, taking 4d10 Piercing damage on a failed save or half as much on a successful one. A creature also makes this save when it enters the spell's area for the first time on a turn or ends its turn there, only once per turn. Using a Higher-Level Spell Slot, the damage increases by 1d10 for each spell slot level above 5."
      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 300 }
          , components = { v = True, s = True, m = Some "a locust" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = plagueArea
          , initialPhase =
              plagueSave
                //  { attachment = plagueArea }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = atomEffect areaTraits
                , usageLimit = None { kind : Text }
                }
              , { trigger = { kind = "on_creature_enters_area" }
                , effect = plagueSave
                , usageLimit = Some { kind = "once_per_turn" }
                }
              , { trigger = { kind = "on_creature_ends_turn_in_area" }
                , effect = plagueSave
                , usageLimit = Some { kind = "once_per_turn" }
                }
              ] : List Operation
          }
      }

in  insectPlague
