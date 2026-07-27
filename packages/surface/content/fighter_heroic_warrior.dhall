let heroicWarrior =
      { kind = "class_feature"
      , id = "fighter_heroic_warrior"
      , name = "Heroic Warrior"
      , className = "fighter"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Fighter.md:150-152" }

      , mechanics =
          { family = "combat_turn_start_heroic_inspiration"
          , trigger =
              { kind = "start_turn"
              , encounter = "combat"
              , requiresMissingHeroicInspiration = True
              }
          , grant = { kind = "heroic_inspiration" }
          }
      }

in  heroicWarrior
