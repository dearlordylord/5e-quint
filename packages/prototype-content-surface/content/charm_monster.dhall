-- Charm Monster — SRD 5.2.1 Spell, level 4, Enchantment.
-- Family: activation (single save_gate phase).
-- Target: one creature (choose_up_to 1 + 1/slot above 4) within 30 ft.
-- WIS save → apply charmed condition on fail; none on success.
-- Duration: 1 hour (timed, not concentration).
--
-- Surface gaps (surface_widening):
-- 1. Conditional advantage on the save: "It does so with Advantage if
--    you or your allies are fighting it." The save_gate phase has no
--    field for conditional roll modifiers on the target's throw.
-- 2. Damage-triggered early expiry: the charm ends "until you or your
--    allies damage it." The Duration timed type has no early-break
--    condition; only the fixed 1-hour window is encoded here.

let charmMonster =
      { kind = "spell"
      , id = "charm_monster"
      , name = "Charm Monster"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Charm Monster"
          }
      , description =
          "One creature you can see within range makes a Wisdom saving throw. It does so with Advantage if you or your allies are fighting it. On a failed save, the target has the Charmed condition until the spell ends or until you or your allies damage it. The Charmed creature is Friendly to you. When the spell ends, the target knows it was Charmed by you. Using a Higher-Level Spell Slot: You can target one additional creature for each spell slot level above 4."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 1
                            , perSlotAboveBase = 1
                            , baseLevel = 4
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail = { kind = "apply_condition", condition = "charmed" }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  charmMonster
