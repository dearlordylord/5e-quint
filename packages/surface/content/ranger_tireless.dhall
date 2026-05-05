-- Ranger Tireless (L10) — SRD 5.2.1.
--
-- Two-part feature. Only the Temporary Hit Points half is encoded here;
-- the Decrease Exhaustion half requires widenings (see proposal-ranger_tireless.md).
--
-- Temporary Hit Points:
--   As a Magic action, give yourself 1d8 + Wis mod temp HP.
--   Uses = Wis modifier (minimum once), resets on Long Rest.
--
-- Omitted: Decrease Exhaustion — on short rest, exhaustion level decreases by 1.
--   Needs: (a) PassiveOperation on_short_rest trigger, (b) decrease_exhaustion_level atom.

let rangerTireless =
      { kind = "class_feature"
      , id = "ranger_tireless"
      , name = "Tireless"
      , className = "ranger"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Ranger#Tireless"
          }
      , description =
          "Primal forces now help fuel you on your journeys. Temporary Hit Points: As a Magic action, you can give yourself a number of Temporary Hit Points equal to 1d8 plus your Wisdom modifier (minimum of 1). You can use this action a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest. Decrease Exhaustion: Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "ability_modifier", ability = "wis" }
              }
          , resetCadence = { kind = "long_rest" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_temp_hp"
                      , amount =
                          { kind = "fixed"
                          , expr =
                              { dice = 1
                              , dieSize = 8
                              , abilityModifier = "wis"
                              }
                          }
                      }
                    ]
                }
              ]
          }
      }

in  rangerTireless
