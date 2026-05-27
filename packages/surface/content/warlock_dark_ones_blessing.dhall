-- Dark One's Blessing — SRD 5.2.1 Warlock Fiend Patron level 3.
--
-- RAW (Classes / Warlock / Level 3: Dark One's Blessing):
--   When you reduce an enemy to 0 Hit Points, gain Temporary Hit
--   Points equal to Charisma modifier plus Warlock level, minimum 1.
--   You also gain this benefit if someone else reduces an enemy within
--   10 feet of you to 0 Hit Points.

let darkOnesBlessing =
      { kind = "class_feature"
      , id = "warlock_dark_ones_blessing"
      , name = "Dark One's Blessing"
      , className = "warlock"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Warlock#Level 3: Dark One's Blessing"
          }
      , description =
          "When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level, with a minimum of 1 Temporary Hit Point. You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points."
      , mechanics =
          { family = "enemy_zero_hit_point_temporary_hit_points"
          , trigger =
              { kind = "enemy_reduced_to_zero_hit_points"
              , bySelf = True
              , byOtherWithinFeet = 10
              }
          , amount =
              { kind = "ability_modifier_plus_class_level"
              , ability = "cha"
              , minimum = 1
              }
          }
      }

in  darkOnesBlessing
