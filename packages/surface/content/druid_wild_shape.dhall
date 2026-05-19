-- Wild Shape - SRD 5.2.1 Druid level 2.
-- Bonus Action: spend one Wild Shape use to assume a known Beast form.
-- Uses: 2 at level 2, 3 at level 6, 4 at level 17.
-- Reset: regain one expended use on Short Rest and all on Long Rest.
-- Known forms and Beast CR/speed limits follow the Druid's Wild Shape table.
-- Runtime transformation, Beast stat-block replacement, equipment handling,
-- and revert execution are owned by a later stat-block-control profile.

let NaturalTier = { atLevel : Natural, value : Natural }

let ChallengeRatingTier = { atLevel : Natural, value : Double }

let ClassLevelChoice = { atLevel : Natural, total : Natural }

let RevertTrigger =
      { kind : Text, condition : Optional Text, action : Optional Text }

let DiceExpr = { dice : Natural, dieSize : Natural, flat : Optional Natural }

let DiceDelta = { flat : Natural }

let DiceAmount =
      { kind : Text
      , axis : Text
      , base : DiceExpr
      , perLevel : DiceDelta
      , startingAtLevel : Natural
      }

let BeastFormSource =
      { kind : Text
      , creatureType : Text
      , knownForms :
          { kind : Text, levels : List ClassLevelChoice }
      , recommendedFormStatBlockIds : List Text
      , knownFormChange : { kind : Text, replacementCount : Natural }
      , maxChallengeRating :
          { kind : Text
          , axis : Text
          , base : Double
          , tiers : List ChallengeRatingTier
          }
      , flySpeed : { kind : Text, atLevel : Optional Natural }
      }

let Effect =
      { kind : Text
      , newForm : Optional BeastFormSource
      , retainedFields : Optional (List Text)
      , actionRestriction : Optional Text
      , revertTriggers : Optional (List RevertTrigger)
      , amount : Optional DiceAmount
      }

let noCondition = None Text

let noAction = None Text

let noForm = None BeastFormSource

let noRetainedFields = None (List Text)

let noRestriction = None Text

let noRevertTriggers = None (List RevertTrigger)

let noAmount = None DiceAmount

let wildShapeForm =
      { kind = "known_forms_roster"
      , creatureType = "beast"
      , knownForms =
          { kind = "class_level_total_choices"
          , levels =
              [ { atLevel = 2, total = 4 }
              , { atLevel = 4, total = 6 }
              , { atLevel = 8, total = 8 }
              ]
          }
      , recommendedFormStatBlockIds =
          [ "stat_block_rat"
          , "stat_block_riding_horse"
          , "stat_block_spider"
          , "stat_block_wolf"
          ]
      , knownFormChange = { kind = "long_rest", replacementCount = 1 }
      , maxChallengeRating =
          { kind = "threshold_tiers"
          , axis = "class"
          , base = 0.25
          , tiers =
              [ { atLevel = 4, value = 0.5 }
              , { atLevel = 8, value = 1.0 }
              ]
          }
      , flySpeed = { kind = "allowed_at_class_level", atLevel = Some 8 }
      } : BeastFormSource

let transform =
      { kind = "transform_target"
      , newForm = Some wildShapeForm
      , retainedFields =
          Some
            [ "personality"
            , "memories"
            , "speech"
            , "creature_type"
            , "hit_points"
            , "hit_point_dice"
            , "intelligence"
            , "wisdom"
            , "charisma"
            , "class_features"
            , "languages"
            , "feats"
            , "skill_proficiencies"
            , "saving_throw_proficiencies"
            ]
      , actionRestriction = Some "no_spellcasting"
      , revertTriggers =
          Some
            [ { kind = "duration_expires", condition = noCondition, action = noAction }
            , { kind = "source_used_again", condition = noCondition, action = noAction }
            , { kind = "condition_active", condition = Some "incapacitated", action = noAction }
            , { kind = "death", condition = noCondition, action = noAction }
            , { kind = "dismissed_by_target", condition = noCondition, action = Some "bonus_action" }
            ]
      , amount = noAmount
      } : Effect

let tempHitPoints =
      { kind = "grant_temp_hp"
      , newForm = noForm
      , retainedFields = noRetainedFields
      , actionRestriction = noRestriction
      , revertTriggers = noRevertTriggers
      , amount =
          Some
            { kind = "linear_per_level"
            , axis = "class"
            , base = { dice = 0, dieSize = 1, flat = Some 1 }
            , perLevel = { flat = 1 }
            , startingAtLevel = 1
            }
      } : Effect

let wildShape =
      { kind = "class_feature"
      , id = "druid_wild_shape"
      , name = "Wild Shape"
      , className = "druid"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid.md:30-49,95-122"
          }
      , description =
          "As a Bonus Action, expend one Wild Shape use to shape-shift into a known Beast form for a number of hours equal to half your Druid level, rounded down. You retain the SRD-listed character facts, cannot cast spells, gain Temporary Hit Points equal to your Druid level, and revert when the duration expires, you use Wild Shape again, you have the Incapacitated condition, you die, or you dismiss the form as a Bonus Action."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "bonus_action" }
          , resource =
              { kind = "use_count"
              , cap =
                  { kind = "threshold_tiers"
                  , axis = "class"
                  , base = 2
                  , tiers =
                      [ { atLevel = 6, value = 3 }
                      , { atLevel = 17, value = 4 }
                      ] : List NaturalTier
                  }
              }
          , resetCadence =
              { kind = "partial_short_full_long"
              , shortRestRefill = 1
              }
          , duration =
              { kind = "timed"
              , value = { kind = "half_class_level_rounded_down_hours" }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ transform, tempHitPoints ] : List Effect
                }
              ]
          }
      }

in  wildShape
