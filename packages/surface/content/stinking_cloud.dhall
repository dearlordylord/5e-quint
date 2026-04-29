-- Stinking Cloud — SRD 5.2.1 Spell, level 3, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Stinking Cloud):
--   "You create a 20-foot-radius Sphere of yellow, nauseating gas
--    centered on a point within range. The cloud is Heavily Obscured."
--   "Each creature that starts its turn in the Sphere must succeed on a
--    Constitution saving throw or have the Poisoned condition until the
--    end of the current turn. While Poisoned in this way, the creature
--    can't take an action or a Bonus Action."
--
-- PARTIAL: strong-wind dispersal is not represented; it is a caller/DM
-- environment predicate, matching the existing Cloudkill convention.

let ActionRestriction : Type =
      { kind : Text
      , condition : Optional Text
      , duration : Optional Text
      , actions : Optional (List Text)
      , whileCondition : Optional Text
      }

let noneRestriction =
      { condition = None Text
      , duration = None Text
      , actions = None (List Text)
      , whileCondition = None Text
      }

let poisoned : ActionRestriction =
      noneRestriction
        //  { kind = "apply_condition"
            , condition = Some "poisoned"
            , duration = Some "current_turn"
            }

let blockActionAndBonusAction : ActionRestriction =
      noneRestriction
        //  { kind = "restrict_action_usage"
            , actions = Some [ "action", "bonus_action" ]
            , whileCondition = Some "poisoned"
            , duration = Some "current_turn"
            }

let OnFail : Type =
      { kind : Text
      , condition : Optional Text
      , duration : Optional Text
      , actions : Optional (List Text)
      , whileCondition : Optional Text
      , effects : Optional (List ActionRestriction)
      }

let noneFail = noneRestriction // { effects = None (List ActionRestriction) }

let poisonedNoAction : OnFail =
      noneFail
        //  { kind = "composite"
            , effects = Some [ poisoned, blockActionAndBonusAction ]
            }

let Effect : Type =
      { kind : Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional OnFail
      , onSuccess : Optional { kind : Text }
      }

let noneEffect =
      { ability = None Text
      , dc = None { kind : Text }
      , onFail = None OnFail
      , onSuccess = None { kind : Text }
      }

let area =
      { kind = "hole"
      , holeId = "stinking_cloud_point"
      , label = "cloud origin point"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 20 }
          , origin = { kind = "point_within_range" }
          }
      }

let conSave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some poisonedNoAction
            , onSuccess = Some { kind = "none" }
            }

let obscured : Effect =
      noneEffect // { kind = "area_is_heavily_obscured" }

let Trigger : Type = { kind : Text, distanceFeet : Optional Natural }

let passive : Trigger =
      { kind = "passive", distanceFeet = None Natural }

let creatureStartsInArea : Trigger =
      { kind = "on_creature_starts_turn_within_area", distanceFeet = Some 0 }

let Operation : Type = { trigger : Trigger, effect : Effect }

let stinkingCloud =
      { kind = "spell"
      , id = "stinking_cloud"
      , name = "Stinking Cloud"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Stinking Cloud"
          }
      , description =
          "You create a 20-foot-radius Sphere of yellow, nauseating gas centered on a point within range. The cloud is Heavily Obscured. Each creature that starts its turn in the Sphere must succeed on a Constitution saving throw or have the Poisoned condition until the end of the current turn. While Poisoned in this way, the creature can't take an action or a Bonus Action. Strong wind can disperse the cloud."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 90 }
          , components = { v = True, s = True, m = Some "a rotten egg" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = area
          , operations =
              [ { trigger = passive, effect = obscured }
              , { trigger = creatureStartsInArea, effect = conSave }
              ] : List Operation
          }
      }

in  stinkingCloud
