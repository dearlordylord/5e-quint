-- Skilled - SRD 5.2.1 Origin feat.
--
-- RAW: "You gain proficiency in any combination of three skills or tools of
-- your choice."
--
-- Tools are enumerated as individual SRD tool proficiencies because Equipment
-- says each tool variant requires a separate proficiency.

let ProficiencySubject : Type =
      { kind : Text
      , skill : Optional Text
      , toolId : Optional Text
      }

let skill =
      \(skillId : Text) ->
        { kind = "skill"
        , skill = Some skillId
        , toolId = None Text
        }

let tool =
      \(toolId : Text) ->
        { kind = "tool"
        , skill = None Text
        , toolId = Some toolId
        }

let skillOptions =
      [ skill "acrobatics"
      , skill "animal_handling"
      , skill "arcana"
      , skill "athletics"
      , skill "deception"
      , skill "history"
      , skill "insight"
      , skill "intimidation"
      , skill "investigation"
      , skill "medicine"
      , skill "nature"
      , skill "perception"
      , skill "performance"
      , skill "persuasion"
      , skill "religion"
      , skill "sleight_of_hand"
      , skill "stealth"
      , skill "survival"
      ] : List ProficiencySubject

let toolOptions =
      [ tool "alchemists_supplies"
      , tool "brewers_supplies"
      , tool "calligraphers_supplies"
      , tool "carpenters_tools"
      , tool "cartographers_tools"
      , tool "cobblers_tools"
      , tool "cooks_utensils"
      , tool "glassblowers_tools"
      , tool "jewelers_tools"
      , tool "leatherworkers_tools"
      , tool "masons_tools"
      , tool "painters_supplies"
      , tool "potters_tools"
      , tool "smiths_tools"
      , tool "tinkers_tools"
      , tool "weavers_tools"
      , tool "woodcarvers_tools"
      , tool "disguise_kit"
      , tool "forgery_kit"
      , tool "tool_dice_set"
      , tool "tool_dragonchess_set"
      , tool "tool_playing_card_set"
      , tool "tool_three_dragon_ante_set"
      , tool "herbalism_kit"
      , tool "tool_bagpipes"
      , tool "tool_drum"
      , tool "tool_dulcimer"
      , tool "tool_flute"
      , tool "tool_horn"
      , tool "tool_lute"
      , tool "tool_lyre"
      , tool "tool_pan_flute"
      , tool "tool_shawm"
      , tool "tool_viol"
      , tool "navigators_tools"
      , tool "poisoners_kit"
      , tool "thieves_tools"
      ] : List ProficiencySubject

let skilled =
      { category = "origin"
      , description =
          "You gain proficiency in any combination of three skills or tools of your choice."
      , id = "feat_skilled"
      , kind = "feat"
      , mechanics =
        { family = "passive"
        , grants =
          [ { kind = "grant_proficiency"
            , proficiency =
              { kind = "choice"
              , count = 3
              , options = skillOptions # toolOptions
              }
            }
          ]
        }
      , name = "Skilled"
      , provenance = { kind = "srd-5.2.1", section = "Feats.md:53-59" }
      }

in  skilled
