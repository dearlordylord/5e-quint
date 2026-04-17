-- Heroism — SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions E-L / Heroism):
--   "A willing creature you touch is imbued with bravery. Until the
--    spell ends, the creature is immune to the Frightened condition
--    and gains Temporary Hit Points equal to your spellcasting ability
--    modifier at the start of each of its turns."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 1."
--
-- PARTIAL. Encoded:
--   • grant_condition_immunity "frightened" for the spell's duration
--     (concentration, up to 1 minute).
--   • TargetSelection.choose_up_to with SlotScaling base=1, +1/slot.
--
-- DEFERRED. "Temporary Hit Points equal to your spellcasting ability
-- modifier at the start of each of its turns" is a per-turn
-- ongoing-op refresh pattern that has no current shape. Authoring
-- just grant_temp_hp once at cast time would under-apply (RAW
-- refreshes each turn). A new DEFERRED item is warranted for the
-- "per-turn-trigger ongoing effect" shape; motivating unit also
-- Aura of Life's "0-HP ally regains 1 HP at start of turn". Once that
-- ongoing-op shape lands, the temp-HP refresh can be layered in.

let heroism =
      { kind = "spell"
      , id = "heroism"
      , name = "Heroism"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Heroism"
          }
      , description =
          "A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to the Frightened condition and gains Temporary Hit Points equal to your spellcasting ability modifier at the start of each of its turns. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 1
                            , perSlotAboveBase = 1
                            , baseLevel = 1
                            }
                        }
                    }
                , effects =
                    [ { kind = "grant_condition_immunity"
                      , condition = "frightened"
                      }
                    ]
                }
              ]
          }
      }

in  heroism
