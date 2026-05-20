-- Calm Emotions - SRD 5.2.1 Spell, level 2, Enchantment.
--
-- RAW (Spells/Descriptions-A-D#Calm Emotions):
--   "Each Humanoid in a 20-foot-radius Sphere centered on a point you
--    choose within range must make a Charisma saving throw."
--   Failed-save creatures are affected by one of two effects. This record
--   encodes the executable condition branch: immunity to Charmed and
--   Frightened, with existing Charmed/Frightened conditions suppressed while
--   the spell lasts.
--
-- The alternate Hostile-to-Indifferent branch is a social Attitude change
-- toward chosen creatures, with table-witnessed early end when the target
-- takes damage or witnesses allies taking damage. That relationship state is
-- intentionally not collapsed into battle sides or duplicated in runtime
-- condition state.

let calmEmotions =
      { kind = "spell"
      , id = "calm_emotions"
      , name = "Calm Emotions"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Calm Emotions"
          }
      , description =
          "Each Humanoid in a 20-foot-radius Sphere centered on a point you choose within range must make a Charisma saving throw. On a failed save, a target can be made immune to the Charmed and Frightened conditions until the spell ends, suppressing those conditions while the spell lasts. Alternatively, a Hostile target can become Indifferent about creatures of your choice until harmed or witnessing allies being harmed; the attitude returns when the spell ends."
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
              let CompEffect
                    : Type
                    = { kind : Text, condition : Optional Text }
              let charmedImmunity
                    : CompEffect
                    = { kind = "grant_condition_immunity"
                      , condition = Some "charmed"
                      }
              let frightenedImmunity
                    : CompEffect
                    = { kind = "grant_condition_immunity"
                      , condition = Some "frightened"
                      }
              in  [ { kind = "save_gate"
                    , attachment =
                        { kind = "hole"
                        , holeId = "calm_emotions_sphere"
                        , label = "spell origin point"
                        , value =
                            { kind = "area"
                            , shape = { kind = "sphere", radiusFeet = 20 }
                            , origin = { kind = "point_within_range" }
                            , selection =
                                { mode = "any_number"
                                , targetKinds = [ "creature" ]
                                , typeFilter = [ "humanoid" ]
                                }
                            }
                        }
                    , ability = "cha"
                    , dc = { kind = "caster_spell_save_dc" }
                    , onFail =
                        { kind = "composite"
                        , effects = [ charmedImmunity, frightenedImmunity ]
                        }
                    , onSuccess = { kind = "none" }
                    }
                  ]
          }
      }

in  calmEmotions
