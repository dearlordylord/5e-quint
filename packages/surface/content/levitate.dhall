-- Levitate - SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells/Descriptions-E-L#Levitate):
--   "One creature or loose object of your choice that you can see within range
--    rises vertically up to 20 feet and remains suspended there for the
--    duration."
--   "The spell can levitate an object that weighs up to 500 pounds."
--   "An unwilling creature that succeeds on a Constitution saving throw is
--    unaffected."
--   "The target can move only by pushing or pulling against a fixed object or
--    surface within reach ... which allows it to move as if it were climbing."
--   "You can change the target's altitude by up to 20 feet in either direction
--    on your turn."
--   "If you are the target, you can move up or down as part of your move."
--   "Otherwise, you can take a Magic action to move the target, which must
--    remain within the spell's range."
--   "When the spell ends, the target floats gently to the ground if it is
--    still aloft."
--
-- Runtime profile boundary:
--   The Surface records the creature-or-loose-object target, unwilling-creature
--   Constitution save gate, suspension, fixed-object/surface movement
--   restriction, caster/self altitude controls, and gentle grounding. Promoted
--   battle-runtime support remains blocked on an elevation/aloft state owner,
--   fixed-object/surface witness boundary, vertical movement protocol, and
--   loose-object lifecycle owner.

let LevitationMovement =
      { allowedBy : Text, movementMode : Text }

let CasterAltitudeControl =
      { maxDistanceFeet : Natural
      , direction : Text
      , cost : Text
      , targetMustRemainWithinSpellRange : Bool
      }

let SelfAltitudeControl =
      { maxDistanceFeet : Natural, direction : Text, cost : Text }

let LevitateEffect =
      { kind : Text
      , initialRiseMaxFeet : Natural
      , suspension : Text
      , targetMovement : LevitationMovement
      , casterAltitudeControl : CasterAltitudeControl
      , selfAltitudeControl : SelfAltitudeControl
      , ending : Text
      }

let levitateTarget : LevitateEffect =
      { kind = "levitate_target"
      , initialRiseMaxFeet = 20
      , suspension = "spell_duration"
      , targetMovement =
          { allowedBy = "push_or_pull_fixed_object_or_surface_within_reach"
          , movementMode = "as_if_climbing"
          }
      , casterAltitudeControl =
          { maxDistanceFeet = 20
          , direction = "up_or_down"
          , cost = "magic_action_on_caster_turn"
          , targetMustRemainWithinSpellRange = True
          }
      , selfAltitudeControl =
          { maxDistanceFeet = 20
          , direction = "up_or_down"
          , cost = "part_of_move"
          }
      , ending = "float_gently_to_ground_if_aloft"
      }

let levitate =
      { kind = "spell"
      , id = "levitate"
      , name = "Levitate"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Levitate"
          }
      , description =
          "One creature or loose object of your choice that you can see within range rises vertically up to 20 feet and remains suspended there for the duration. The spell can levitate an object that weighs up to 500 pounds. An unwilling creature that succeeds on a Constitution saving throw is unaffected. The target can move only by pushing or pulling against a fixed object or surface within reach, which allows it to move as if it were climbing. You can change the target's altitude by up to 20 feet in either direction on your turn. If you are the target, you can move up or down as part of your move. Otherwise, you can take a Magic action to move the target, which must remain within the spell's range. When the spell ends, the target floats gently to the ground if it is still aloft."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a metal spring"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "levitate_target"
                    , label = "creature or loose object"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature", "object" ]
                            , objectFilter =
                                { targetRelation = "loose"
                                , maxWeightPounds = 500
                                }
                            }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , saveAppliesIf = "unwilling_creature_target"
                , onFail = levitateTarget
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  levitate
