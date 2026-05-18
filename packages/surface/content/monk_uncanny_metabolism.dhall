-- Uncanny Metabolism - SRD 5.2.1 Monk level 2.
--
-- Trigger: when rolling Initiative.
-- Recovery: optionally regain all expended Focus Points.
-- Healing: when Focus Points are recovered this way, regain HP equal to
-- Monk level plus one Martial Arts die.
-- Reset: once used, unavailable again until Long Rest.
--
-- The healing amount references the Martial Arts Unit instead of copying its
-- die table, so later Martial Arts die changes remain single-source.

let uncannyMetabolism =
      { acquiredAtLevel = 2
      , className = "monk"
      , description =
          "When you roll Initiative, you can regain all expended Focus Points. When you do so, roll your Martial Arts die and regain Hit Points equal to your Monk level plus the number rolled. Once used, this feature can't be used again until you finish a Long Rest."
      , id = "monk_uncanny_metabolism"
      , kind = "class_feature"
      , mechanics =
          { family = "initiative_focus_recovery"
          , trigger = { kind = "roll_initiative" }
          , optional = True
          , recovery =
              { kind = "recover_all_expended_uses"
              , resourceUnitId = "monk_monks_focus"
              }
          , healing =
              { kind = "heal_hp"
              , target = "self"
              , amount =
                  { kind = "monk_martial_arts_die_plus_monk_level"
                  , martialArtsUnitId = "monk_martial_arts"
                  }
              }
          , resetCadence = { kind = "long_rest" }
          }
      , name = "Uncanny Metabolism"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:30-48,96-100" }
      }

in  uncannyMetabolism
