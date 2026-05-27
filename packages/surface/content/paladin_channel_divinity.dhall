-- Channel Divinity — SRD 5.2.1 Paladin level 3.
--
-- RAW (Classes / Paladin / Level 3: Channel Divinity):
--   The Paladin has a shared Channel Divinity resource pool, starts with
--   Divine Sense as one effect option, gains other Paladin Channel Divinity
--   options from later features, regains one expended use on a Short Rest and
--   all expended uses on a Long Rest. The Paladin level 11 use increase is
--   deferred to later-level progression work.
--
-- Divine Sense detection knowledge stays option-owned/table-owned; this
-- container owns only the shared Paladin resource and option menu facts.

let channelDivinity =
      { acquiredAtLevel = 3
      , className = "paladin"
      , description =
          "SRD Paladin level 3 Channel Divinity resource container. A Paladin has two uses, regains one expended use on a Short Rest and all expended uses on a Long Rest, and chooses among Paladin Channel Divinity effects when spending the resource. Later Paladin use scaling is deferred to later-level progression work."
      , id = "paladin_channel_divinity"
      , kind = "class_feature"
      , mechanics =
        { family = "resource_container"
        , resource =
          { kind = "use_count"
          , cap = { kind = "fixed", uses = 2 }
          }
        , resetCadence =
          { kind = "partial_short_full_long", shortRestRefill = 1 }
        , optionSet =
          { choiceKey = "paladin_channel_divinity_effect"
          , timing = "resource_use"
          , initialOptions =
            [ { id = "paladin_divine_sense", displayName = "Divine Sense" } ]
          }
        , effectSaveDc.kind = "class_spellcasting_spell_save_dc"
        }
      , name = "Channel Divinity"
      , provenance = { kind = "srd-5.2.1", section = "Classes/Paladin.md:100-108" }
      }

in  channelDivinity
