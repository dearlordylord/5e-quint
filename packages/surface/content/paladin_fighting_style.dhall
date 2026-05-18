-- Paladin Fighting Style — SRD 5.2.1, Level 2.

let PaladinFightingStyleGrant =
      { kind : Text, category : Optional Text, count : Optional Natural, mode : Optional Text, spellLevel : Optional Natural, spellList : Optional Text }

let fightingStyleFeatGrant =
      { kind = "grant_feat"
      , category = Some "fighting_style"
      , count = None Natural
      , mode = None Text
      , spellLevel = None Natural
      , spellList = None Text
      } : PaladinFightingStyleGrant

let blessedWarriorCantripGrant =
      { kind = "grant_spell_access_choice"
      , category = None Text
      , count = Some 2
      , mode = Some "known"
      , spellLevel = Some 0
      , spellList = Some "cleric"
      } : PaladinFightingStyleGrant

let paladinFightingStyleL2 =
      { kind = "class_feature"
      , id = "paladin_fighting_style"
      , name = "Fighting Style"
      , className = "paladin"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Fighting Style"
          }
      , description =
          "You gain a Fighting Style feat of your choice (see \"Feats\" for feats). Instead of choosing one of those feats, you can choose the option below.\n\nBlessed Warrior. You learn two Cleric cantrips of your choice. The chosen cantrips count as Paladin spells for you, and Charisma is your spellcasting ability for them. Whenever you gain a Paladin level, you can replace one of these cantrips with another Cleric cantrip."
      , mechanics =
          { family = "class_feature_acquisition_choice"
          , choiceKey = "paladin_fighting_style"
          , timing = "class_feature_acquisition"
          , options =
              [ { id = "fighting_style_feat"
                , displayName = "Fighting Style feat"
                , mechanics =
                    { family = "passive", grants = [ fightingStyleFeatGrant ] }
                }
              , { id = "blessed_warrior"
                , displayName = "Blessed Warrior"
                , mechanics =
                    { family = "passive"
                    , grants = [ blessedWarriorCantripGrant ]
                    }
                }
              ]
          }
      }

in  paladinFightingStyleL2
