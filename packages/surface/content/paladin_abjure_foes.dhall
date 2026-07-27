-- Abjure Foes — SRD 5.2.1 Paladin level 9.
--
-- RAW (Classes / Paladin / Level 9: Abjure Foes):
--   As a Magic action, expend one use of Channel Divinity and target
--   visible creatures within 60 feet up to Charisma modifier minimum 1.
--   Each target makes a Wisdom saving throw or is Frightened for
--   1 minute or until it takes damage. While Frightened this way, it
--   can do only one of move, action, or Bonus Action on its turns.

let abjureFoes =
      { kind = "class_feature"
      , id = "paladin_abjure_foes"
      , name = "Abjure Foes"
      , className = "paladin"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Paladin.md:144-146" }

      , mechanics =
          { family = "abjure_foes"
          , activationCost = { kind = "standard_action", action = "magic" }
          , spends = { resourceUnitId = "paladin_channel_divinity", amount = 1 }
          , targetSelection =
              { kind = "visible_creatures_within_range"
              , rangeFeet = 60
              , count =
                  { kind = "ability_modifier"
                  , ability = "cha"
                  , minimum = 1
                  }
              }
          , save =
              { ability = "wis"
              , dc = { kind = "class_spellcasting_spell_save_dc" }
              }
          , onFail =
              { kind = "apply_condition"
              , condition = "frightened"
              , duration =
                  { amount = 1
                  , unit = "minute"
                  , endsOn = [ "target_takes_any_damage" ]
                  }
              , turnRestriction =
                  { kind = "choose_only_one"
                  , options = [ "move", "action", "bonus_action" ]
                  }
              }
          }
      }

in  abjureFoes
