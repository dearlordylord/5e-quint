let channelDivinity =
      { acquiredAtLevel = 2
      , className = "cleric"
      , description =
          "You can channel divine energy directly from the Outer Planes to fuel magical effects. You start with two such effects: Divine Spark and Turn Undead. You can use this class's Channel Divinity twice. You regain one of its expended uses when you finish a Short Rest, and you regain all expended uses when you finish a Long Rest."
      , id = "cleric_channel_divinity"
      , kind = "class_feature"
      , mechanics =
        { family = "resource_container"
        , resource =
          { kind = "use_count"
          , cap =
            { kind = "threshold_tiers"
            , axis = "class"
            , base = 2
            , tiers =
              [ { atLevel = 6, value = 3 }, { atLevel = 18, value = 4 } ]
            }
          }
        , resetCadence =
          { kind = "partial_short_full_long", shortRestRefill = 1 }
        , optionSet =
          { choiceKey = "cleric_channel_divinity_effect"
          , timing = "resource_use"
          , initialOptions =
            [ { id = "cleric_divine_spark", displayName = "Divine Spark" }
            , { id = "cleric_turn_undead", displayName = "Turn Undead" }
            ]
          }
        , effectSaveDc.kind = "class_spellcasting_spell_save_dc"
        }
      , name = "Channel Divinity"
      , provenance = { kind = "srd-5.2.1", section = "Classes/Cleric.md:33-98" }
      }

in  channelDivinity
