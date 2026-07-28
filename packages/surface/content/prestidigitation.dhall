-- Prestidigitation — SRD 5.2.1 Transmutation Cantrip.
--
-- RAW (Spells/Descriptions-M-P#Prestidigitation):
--   The caster chooses one of six utility effects. At most three
--   non-instantaneous effects from repeated casts can be active together.

let prestidigitation =
      { kind = "spell"
      , id = "prestidigitation"
      , name = "Prestidigitation"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P.md#Prestidigitation"
          }
      , mechanics =
          { family = "minor_magic_effect_menu"
          , level = 0
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 10 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , nonInstantaneousEffectLimit = 3
          , effects =
              { sensory =
                  { kind = "harmless_sensory_effect"
                  , duration = "instantaneous"
                  }
              , firePlay =
                  { kind = "light_or_snuff_small_fire"
                  , sources = [ "candle", "torch", "small_campfire" ]
                  , duration = "instantaneous"
                  }
              , cleanOrSoil =
                  { kind = "clean_or_soil_object"
                  , maxVolumeCubicFeet = 1
                  , duration = "instantaneous"
                  }
              , minorSensation =
                  { kind = "alter_nonliving_material_sensation"
                  , maxVolumeCubicFeet = 1
                  , sensations = [ "chill", "warm", "flavor" ]
                  , duration = "spell_duration"
                  }
              , magicMark =
                  { kind = "mark_object_or_surface"
                  , marks = [ "color", "small_mark", "symbol" ]
                  , duration = "spell_duration"
                  }
              , minorCreation =
                  { kind = "create_hand_sized_trinket_or_illusion"
                  , creations = [ "nonmagical_trinket", "illusory_image" ]
                  , canDealDamage = False
                  , hasMonetaryWorth = False
                  , duration = "end_of_caster_next_turn"
                  }
              }
          }
      }

in  prestidigitation
