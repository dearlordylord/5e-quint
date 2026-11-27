-- Reliable Talent — SRD 5.2.1 Rogue level 7.
--
-- RAW (Classes / Rogue / Level 7: Reliable Talent):
--   Whenever you make an ability check that uses one of your skill or tool
--   proficiencies, you can treat a d20 roll of 9 or lower as a 10.
--
-- This record describes the reusable D20 Test die-minimum shape. The battle
-- runtime applies it from the ability check's skill and the roller's own
-- proficiencies, not by dispatching on this Unit id.

let reliableTalent =
      { id = "rogue_reliable_talent"
      , kind = "class_feature"
      , name = "Reliable Talent"
      , className = "rogue"
      , acquiredAtLevel = 7

      , provenance = { kind = "srd-5.2.1", section = "classes.md:7093-7095" }
      , mechanics =
          { family = "d20_test_die_minimum"
          , appliesTo = { kind = "ability_check_using_own_proficiency" }
          , minimumDieFace = 10
          , optional = True
          }
      }

in  reliableTalent
