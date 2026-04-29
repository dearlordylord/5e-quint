-- Charm Monster — SRD 5.2.1 Spell, level 4, Enchantment.
--
-- Parallel structure to Charm Person except (a) no Humanoid-only
-- target restriction (Charm Monster targets any creature) and
-- (b) base level 4 instead of 1. The save-advantage "if fighting it"
-- clause is DM agenda (situational). The damage-triggered early
-- expiry is now modeled via Duration.timed.earlyEnd =
-- [ target_damaged_by_caster_or_ally ], same as Charm Person.

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
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "charm_monster_target"
                    , label = "target"
                    , value =
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
