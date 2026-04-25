-- Bane — SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions A-D / Bane):
--   "Up to three creatures of your choice that you can see within
--    range must each make a Charisma saving throw. Whenever a target
--    that fails this save makes an attack roll or a saving throw
--    before the spell ends, the target must subtract 1d4 from the
--    attack roll or save."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 1."
--
-- ZERO-WIDENING VALIDATION REFERENCE. Second instance of the
-- save-gated ongoing-effect pattern after Faerie Fire, resolving
-- sub-agent's "save_gated_ongoing_effect" proposal without a new
-- family. activation + save_gate phase (per-target save) +
-- modify_roll_numeric on-fail + concentration duration composes
-- cleanly because the modifier atom persists for the spell's
-- concentration window. Bless is the positive mirror (no save-gate,
-- unconditional ongoing application).

let bane =
      { kind = "spell"
      , id = "bane"
      , name = "Bane"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Bane"
          }
      , description =
          "Up to three creatures of your choice that you can see within range must each make a Charisma saving throw. Whenever a target that fails this save makes an attack roll or a saving throw before the spell ends, the target must subtract 1d4 from the attack roll or save. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a drop of blood"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "bane_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 3
                                , perSlotAboveBase = 1
                                , baseLevel = 1
                                }
                            }
                        }
                    }
                , ability = "cha"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "modify_roll_numeric"
                    , on = [ "attack_roll", "saving_throw" ]
                    , delta =
                        { kind = "fixed_dice"
                        , dice = 1
                        , dieSize = 4
                        , sign = "-"
                        }
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  bane
