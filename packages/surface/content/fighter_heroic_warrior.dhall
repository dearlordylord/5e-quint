let heroicWarrior =
      { kind = "class_feature"
      , id = "fighter_heroic_warrior"
      , name = "Heroic Warrior"
      , className = "fighter"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Fighter.md:150-152" }
      , description =
          "During combat, you can give yourself Heroic Inspiration whenever you start your turn without it. Surface owner need: combat turn-start sheet state must model an optional Heroic Inspiration grant gated by not already having Heroic Inspiration."
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
