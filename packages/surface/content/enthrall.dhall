-- Enthrall - SRD 5.2.1 Spell, level 2, Enchantment.
--
-- RAW (Spells/Descriptions-E-L#Enthrall):
--   "You weave a distracting string of words, causing creatures of your
--    choice that you can see within range to make a Wisdom saving throw.
--    Any creature you or your companions are fighting automatically succeeds
--    on this save. On a failed save, a target has a -10 penalty to Wisdom
--    (Perception) checks and Passive Perception until the spell ends."
--
-- Encoded:
--   * Magic Action, level-2 Spell Slot spell definition.
--   * Concentration up to 1 minute.
--   * any_number creature target save gate.
--   * failed-save -10 flat modifier to Wisdom (Perception) Ability Checks.
--
-- The Passive Perception penalty is intentionally not duplicated as separate
-- Surface state: SRD Passive Perception derives from the Wisdom (Perception)
-- check bonus. The fighting-caster-or-companions auto-success predicate is an
-- allegiance/table fact; this record preserves the RAW text but does not
-- invent a Surface predicate for it.

let enthrall =
      { kind = "spell"
      , id = "enthrall"
      , name = "Enthrall"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Enthrall"
          }
      , description =
          "You weave a distracting string of words, causing creatures of your choice that you can see within range to make a Wisdom saving throw. Any creature you or your companions are fighting automatically succeeds on this save. On a failed save, a target has a -10 penalty to Wisdom (Perception) checks and Passive Perception until the spell ends."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "enthrall_targets"
                    , label = "targets"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "any_number"
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "modify_roll_numeric"
                    , on = [ "ability_check" ]
                    , delta = { kind = "fixed_number", amount = 10, sign = "-" }
                    , skillFilter =
                        { kind = "fixed", skills = [ "perception" ] }
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  enthrall
