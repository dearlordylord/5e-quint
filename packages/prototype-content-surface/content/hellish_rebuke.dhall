-- Hellish Rebuke — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-E-L#HellishRebuke):
--   "Reaction, which you take in response to taking damage from a
--    creature that you can see within 60 feet of yourself"
--   "The creature that damaged you ... makes a Dexterity saving throw,
--    taking 2d10 Fire damage on a failed save or half as much damage on
--    a successful one."

let hellishRebuke =
      { kind = "spell"
      , id = "hellish_rebuke"
      , name = "Hellish Rebuke"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Hellish Rebuke"
          }
      , description =
          "The creature that damaged you is momentarily surrounded by green flames. It makes a Dexterity saving throw, taking 2d10 Fire damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1."
      , mechanics =
          { family = "triggered_reaction"
          , level = 1
          , school = "evocation"
          , castingTime =
              { kind = "reaction"
              , trigger =
                  { kind = "takes_damage_from_creature"
                  , requiresVisibleCreature = True
                  , rangeFeet = 60
                  }
              }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , interruptsTrigger = False
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "hellish_rebuke_target"
                    , label = "damaging creature"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "fire"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base =
                            { dice = 2
                            , dieSize = 10
                            }
                        , perLevel =
                            { dice = 1
                            , dieSize = Some 10
                            }
                        , startingAtLevel = 1
                        }
                    }
                , onSuccess = { kind = "half_damage" }
                }
              ]
          }
      }

in  hellishRebuke
