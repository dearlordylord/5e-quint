-- Speak with Plants - SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells/Descriptions-S-Z#Speak with Plants):
--   "You imbue plants in an immobile 30-foot Emanation with limited sentience
--    and animation, giving them the ability to communicate with you and follow
--    your simple commands."
--   "You can question plants about events in the spell's area within the past
--    day, gaining information about creatures that have passed, weather, and
--    other circumstances."
--   "You can also turn Difficult Terrain caused by plant growth ... into
--    ordinary terrain ... Or you can turn ordinary terrain where plants are
--    present into Difficult Terrain..."
--   "If a Plant creature is in the area, you can communicate with it as if you
--    shared a common language."
--
-- Plant sentience, simple-command following, event answers, plant presence,
-- plant-caused Difficult Terrain removal, terrain creation where plants are
-- present, and immobile area placement are table/spatial/exploration facts.
-- The executable Surface fact preserved here is scoped communication with
-- Plant creatures in the spell area, without promoting a battle-runtime
-- plant-world, terrain-conversion, or table-information owner.

let speakWithPlants =
      { kind = "spell"
      , id = "speak_with_plants"
      , name = "Speak with Plants"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Speak with Plants"
          }
      , description =
          "You imbue plants in an immobile 30-foot Emanation with limited sentience and animation, giving them the ability to communicate with you and follow your simple commands. You can question plants about events in the spell's area within the past day, gaining information about creatures that have passed, weather, and other circumstances. You can also turn Difficult Terrain caused by plant growth into ordinary terrain that lasts for the duration, or turn ordinary terrain where plants are present into Difficult Terrain that lasts for the duration. The spell doesn't enable plants to uproot themselves and move about, but they can move their branches, tendrils, and stalks for you. If a Plant creature is in the area, you can communicate with it as if you shared a common language."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "speak_with_plants_area"
                    , label = "immobile 30-foot Emanation with plants"
                    , value =
                        { kind = "area"
                        , shape = { kind = "emanation", radiusFeet = 30 }
                        , origin = { kind = "self" }
                        }
                    }
                , effects =
                    [ { kind = "grant_creature_communication"
                      , creatureType = "plant"
                      , includesInfluenceActionOptions = False
                      }
                    ]
                }
              ]
          }
      }

in  speakWithPlants
