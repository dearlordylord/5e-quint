-- Primal Knowledge — SRD 5.2.1 Barbarian level 3.
--
-- RAW: one additional proficiency from the Barbarian skill list, and while
-- Rage is active the listed Ability Checks can use Strength.

let ProficiencySubject : Type = { kind : Text, skill : Text }

let ProficiencyGrant : Type =
      { kind : Text
      , count : Natural
      , options : List ProficiencySubject
      }

let SkillFilter : Type = { kind : Text, skills : List Text }

let RequiredActiveFeature : Type = { kind : Text, unitId : Text }

let Grant : Type =
      { kind : Text
      , proficiency : Optional ProficiencyGrant
      , use : Optional Text
      , skillFilter : Optional SkillFilter
      , requiredActiveFeature : Optional RequiredActiveFeature
      }

let primalKnowledge =
      { kind = "class_feature"
      , id = "barbarian_primal_knowledge"
      , name = "Primal Knowledge"
      , className = "barbarian"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Primal Knowledge"
          }
      , description =
          "You gain proficiency in another skill of your choice from the skill list available to Barbarians at level 1. In addition, while your Rage is active, you can channel primal power when you attempt certain tasks; if you make an Ability Check using Acrobatics, Intimidation, Perception, Stealth, or Survival, you can make it as a Strength check even if it normally uses a different ability."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_proficiency"
                , proficiency = Some
                  { kind = "choice"
                  , count = 1
                  , options =
                      [ { kind = "skill", skill = "animal_handling" }
                      , { kind = "skill", skill = "athletics" }
                      , { kind = "skill", skill = "intimidation" }
                      , { kind = "skill", skill = "nature" }
                      , { kind = "skill", skill = "perception" }
                      , { kind = "skill", skill = "survival" }
                      ]
                  }
                , use = None Text
                , skillFilter = None SkillFilter
                , requiredActiveFeature = None RequiredActiveFeature
                }
              , { kind = "offer_ability_substitution_for_ability_checks"
                , proficiency = None ProficiencyGrant
                , use = Some "str"
                , skillFilter = Some
                    { kind = "fixed"
                    , skills =
                        [ "acrobatics"
                        , "intimidation"
                        , "perception"
                        , "stealth"
                        , "survival"
                        ]
                    }
                , requiredActiveFeature = Some
                    { kind = "class_feature"
                    , unitId = "barbarian_rage"
                    }
                }
              ] : List Grant
          }
      }

in  primalKnowledge
