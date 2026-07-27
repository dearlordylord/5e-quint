-- Ranger Fighting Style — SRD 5.2.1, Level 2.

let RangerFightingStyleGrant =
      { kind : Text, category : Optional Text, count : Optional Natural, mode : Optional Text, spellLevel : Optional Natural, spellList : Optional Text, replacement : Optional { trigger : Text, replacementCount : Natural } }

let fightingStyleFeatGrant =
      { kind = "grant_feat"
      , category = Some "fighting_style"
      , count = None Natural
      , mode = None Text
      , spellLevel = None Natural
      , spellList = None Text
      , replacement = None { trigger : Text, replacementCount : Natural }
      } : RangerFightingStyleGrant

let druidicWarriorCantripGrant =
      { kind = "grant_spell_access_choice"
      , category = None Text
      , count = Some 2
      , mode = Some "known"
      , spellLevel = Some 0
      , spellList = Some "druid"
      , replacement =
          Some { trigger = "class_level_gain", replacementCount = 1 }
      } : RangerFightingStyleGrant

let rangerFightingStyleL2 =
      { kind = "class_feature"
      , id = "ranger_fighting_style"
      , name = "Fighting Style"
      , className = "ranger"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Ranger#Fighting Style"
          }

      , mechanics =
          { family = "class_feature_acquisition_choice"
          , choiceKey = "ranger_fighting_style"
          , timing = "class_feature_acquisition"
          , options =
              [ { id = "fighting_style_feat"
                , displayName = "Fighting Style feat"
                , mechanics =
                    { family = "passive", grants = [ fightingStyleFeatGrant ] }
                }
              , { id = "druidic_warrior"
                , displayName = "Druidic Warrior"
                , mechanics =
                    { family = "passive"
                    , grants = [ druidicWarriorCantripGrant ]
                    }
                }
              ]
          }
      }

in  rangerFightingStyleL2
