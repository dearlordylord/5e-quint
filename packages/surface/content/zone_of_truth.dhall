-- Zone of Truth - SRD 5.2.1 Spell, level 2, Enchantment.
--
-- RAW (Spells/Descriptions-S-Z#Zone of Truth):
--   "You create a magical zone that guards against deception in a
--    15-foot-radius Sphere centered on a point within range."
--   "Until the spell ends, a creature that enters the spell's area for the
--    first time on a turn or starts its turn there makes a Charisma saving
--    throw."
--   "On a failed save, a creature can't speak a deliberate lie while in the
--    radius. You know whether a creature succeeds or fails on this save."
--   "An affected creature is aware of the spell and can avoid answering
--    questions to which it would normally respond with a lie. Such a creature
--    can be evasive yet must be truthful."
--
-- Runtime boundary: promoted battle runtime has no conversation transcript,
-- statement-truth, or lie-detection owner. This Surface record keeps the
-- authored area, recurring Charisma Saving Throw, failed-save truthfulness
-- constraint, target awareness, and caster save-outcome knowledge facts without
-- adding conversation-state or truth adjudication to battle execution.

let ActionCost : Type = { kind : Text }

let Trigger : Type =
      { kind : Text
      , cost : Optional ActionCost
      , laterTurnsOnly : Optional Bool
      }

let Area =
      { kind = "hole"
      , holeId = "zone_of_truth_sphere"
      , label = "Zone of Truth sphere"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 15 }
          , origin = { kind = "point_within_range" }
          }
      }

let TruthEffect : Type =
      { kind : Text
      , prohibitedCommunication : Optional Text
      , appliesWhile : Optional Text
      , targetAwareness : Optional Text
      , allowedResponse : Optional Text
      }

let saveOutcomeDisclosure : TruthEffect =
      { kind = "reveal_save_outcome_to_caster"
      , prohibitedCommunication = None Text
      , appliesWhile = None Text
      , targetAwareness = None Text
      , allowedResponse = None Text
      }

let truthfulnessConstraint : TruthEffect =
      { kind = "truthfulness_constraint"
      , prohibitedCommunication = Some "deliberate_lie"
      , appliesWhile = Some "in_spell_area"
      , targetAwareness = Some "aware_of_spell"
      , allowedResponse = Some "evasive_or_silent_truthful"
      }

let onFailedSave =
      { kind = "composite"
      , effects = [ truthfulnessConstraint, saveOutcomeDisclosure ]
      }

let truthSave =
      { kind = "save_gate"
      , ability = Some "cha"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some onFailedSave
      , onSuccess = Some saveOutcomeDisclosure
      }

let startsTurnTrigger : Trigger =
      { kind = "on_creature_starts_turn_in_area"
      , cost = None ActionCost
      , laterTurnsOnly = None Bool
      }

let entersTrigger : Trigger =
      { kind = "on_creature_enters_area"
      , cost = None ActionCost
      , laterTurnsOnly = None Bool
      }

let UsageLimit : Type = { kind : Text, limitGroup : Optional Text }

let sharedOncePerTurn =
      Some { kind = "once_per_turn", limitGroup = Some "zone_of_truth_save_per_turn" }

let Operation : Type =
      { trigger : Trigger
      , effect :
          { kind : Text
          , ability : Optional Text
          , dc : Optional { kind : Text }
          , onFail : Optional { kind : Text, effects : List TruthEffect }
          , onSuccess : Optional TruthEffect
          }
      , usageLimit : Optional UsageLimit
      }

let zoneOfTruth =
      { kind = "spell"
      , id = "zone_of_truth"
      , name = "Zone of Truth"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Zone of Truth"
          }
      , description =
          "You create a magical zone that guards against deception in a 15-foot-radius Sphere centered on a point within range. Until the spell ends, a creature that enters the spell's area for the first time on a turn or starts its turn there makes a Charisma saving throw. On a failed save, a creature can't speak a deliberate lie while in the radius. You know whether a creature succeeds or fails on this save. An affected creature is aware of the spell and can avoid answering questions to which it would normally respond with a lie. Such a creature can be evasive yet must be truthful."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "minute", amount = 10 } }
          , attachment = Area
          , operations =
              [ { trigger = startsTurnTrigger
                , effect = truthSave
                , usageLimit = sharedOncePerTurn
                }
              , { trigger = entersTrigger
                , effect = truthSave
                , usageLimit = sharedOncePerTurn
                }
              ] : List Operation
          }
      }

in  zoneOfTruth
