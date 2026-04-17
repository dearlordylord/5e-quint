-- Invisibility — SRD 5.2.1 Spell, level 2, Illusion.
--
-- RAW (Spells / Descriptions E-L / Invisibility):
--   "A creature you touch has the Invisible condition until the spell
--    ends. The spell ends early immediately after the target makes an
--    attack roll, deals damage, or casts a spell."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 2."
--
-- Consolidated validation reference for:
--   • Duration.concentration.earlyEnd (new widening — closed list of
--     target-action triggers that end the spell before its timed
--     expiry. Three variants now: target_makes_attack_roll,
--     target_deals_damage, target_casts_spell. Future spells will
--     reuse this field; Greater Invisibility is the control case that
--     keeps earlyEnd empty.)
--   • EffectAtom.apply_condition (invisible)
--   • TargetSelection.choose_up_to with SlotScaling

let invisibility =
      { kind = "spell"
      , id = "invisibility"
      , name = "Invisibility"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Invisibility"
          }
      , description =
          "A creature you touch has the Invisible condition until the spell ends. The spell ends early immediately after the target makes an attack roll, deals damage, or casts a spell. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "an eyelash in gum arabic"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              , earlyEnd =
                  [ { kind = "target_makes_attack_roll" }
                  , { kind = "target_deals_damage" }
                  , { kind = "target_casts_spell" }
                  ]
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
                            , baseLevel = 2
                            }
                        }
                    }
                , effects =
                    [ { kind = "apply_condition"
                      , condition = "invisible"
                      }
                    ]
                }
              ]
          }
      }

in  invisibility
