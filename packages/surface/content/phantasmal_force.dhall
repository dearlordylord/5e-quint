-- Phantasmal Force — SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells/Descriptions-M-P#Phantasmal Force):
--   "You attempt to craft an illusion in the mind of a creature you can
--    see within range. The target makes an Intelligence saving throw. On a
--    failed save, you create a phantasmal object, creature, or other
--    phenomenon that is no larger than a 10-foot Cube and that is perceivable
--    only to the target for the duration. The phantasm includes sound,
--    temperature, and other stimuli."
--   "The target can take a Study action to examine the phantasm with an
--    Intelligence (Investigation) check against your spell save DC. If the
--    check succeeds, the target realizes that the phantasm is an illusion,
--    and the spell ends."
--   "While affected by the spell, the target treats the phantasm as if it
--    were real and rationalizes any illogical outcomes from interacting with
--    it."
--   "An affected target can even take damage from the illusion if the
--    phantasm represents a dangerous creature or hazard. On each of your
--    turns, such a phantasm can deal 2d8 Psychic damage to the target if it
--    is in the phantasm's area or within 5 feet of the phantasm. The target
--    perceives the damage as a type appropriate to the illusion."

let DiceExpr : Type = { dice : Natural, dieSize : Natural, flat : Natural }

let DiceAmount : Type = { kind : Text, expr : Optional DiceExpr }

let Effect : Type =
      { kind : Text
      , ability : Optional Text
      , skill : Optional Text
      , dc : Optional { kind : Text }
      , onPass : Optional { kind : Text }
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , perceivedAs : Optional Text
      }

let Operation : Type =
      { trigger : { kind : Text }
      , predicate : Optional { kind : Text, feet : Natural }
      , effect : Effect
      }

let AuthoredConditionalEffect : Type =
      { kind : Text
      , source : Text
      , choice : Text
      , timing : Text
      , eligibility : { kind : Text, feet : Natural }
      , damageType : Text
      , amount : DiceAmount
      , perceivedAs : Text
      }

let target =
      { kind = "hole"
      , holeId = "phantasmal_force_target"
      , label = "creature the caster can see within range"
      , value =
          { kind = "target"
          , selection =
              { mode = "one"
              , targetKinds = [ "creature" ]
              , visibility = "caster_can_see"
              }
          }
      }

let phantasmalForce =
      { kind = "spell"
      , id = "phantasmal_force"
      , name = "Phantasmal Force"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Phantasmal Force"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a bit of fleece"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = target
          , initialPhase =
              { kind = "save_gate"
              , attachment = target
              , ability = "int"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail =
                  { kind = "create_phantasmal_illusion"
                  , maxCubeSideFeet = 10
                  , channels = [ "visual", "sound", "temperature" ]
                  , perception = "target_only"
                  , rationalization = "treat_illogical_outcomes_as_real"
                  }
              , onSuccess = { kind = "none" }
              }
          , operations =
              [ { trigger = { kind = "on_creature_studies" }
                , predicate = None { kind : Text, feet : Natural }
                , effect =
                    { kind = "ability_check_gate"
                    , ability = Some "int"
                    , skill = Some "investigation"
                    , dc = Some { kind = "caster_spell_save_dc" }
                    , onPass = Some { kind = "end_current_effect" }
                    , damageType = None Text
                    , amount = None DiceAmount
                    , perceivedAs = None Text
                    }
                }
              ] : List Operation
          , authoredConditionalEffects =
              Some
                [ { kind = "phantasm_damage"
                  , source = "dangerous_creature_or_hazard"
                  , choice = "caster_may_deal"
                  , timing = "each_caster_turn"
                  , eligibility =
                      { kind =
                          "target_in_phantasm_area_or_within_feet_of_phantasm"
                      , feet = 5
                      }
                  , damageType = "psychic"
                  , amount =
                      { kind = "fixed"
                      , expr = { dice = 2, dieSize = 8, flat = 0 }
                      }
                  , perceivedAs = "illusion_appropriate"
                  }
                ]
          }
      }

in  phantasmalForce
