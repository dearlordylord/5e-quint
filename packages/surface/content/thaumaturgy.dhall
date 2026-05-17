-- Thaumaturgy — SRD 5.2.1 Transmutation Cantrip (Cleric).
--
-- RAW (Spells / Descriptions S-Z / Thaumaturgy):
--   "You manifest a minor wonder within range. You create one of the
--    effects below within range. If you cast this spell multiple times,
--    you can have up to three of its 1-minute effects active at a time."
--   "Booming Voice. Your voice booms up to three times as loud as
--    normal for 1 minute. For the duration, you have Advantage on
--    Charisma (Intimidation) checks."
--
-- Encoding decisions:
--   * The only battle-runtime-owned branch is Booming Voice's self Spell
--     Effect projecting Charisma (Intimidation) Ability Check Advantage.
--   * Altered Eyes, Fire Play, Invisible Hand, Phantom Sound, and Tremors
--     are presentation/environment/object/table adjudication and remain
--     runtime-detached.
--   * The three-active-1-minute-effects cap is enforced by the runtime
--     through a caller-supplied total active-effect-count witness rather than
--     persistent utility state for the detached branches.

let thaumaturgy =
      { kind = "spell"
      , id = "thaumaturgy"
      , name = "Thaumaturgy"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Thaumaturgy"
          }
      , description =
          "You manifest a minor wonder within range. Choose one of the spell's effects. Booming Voice makes your voice boom up to three times as loud as normal for 1 minute and gives you Advantage on Charisma (Intimidation) checks for the duration. If you cast this spell multiple times, you can have up to three of its 1-minute effects active at a time."
      , mechanics =
          { family = "ongoing_effect"
          , level = 0
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              }
          , attachment = { kind = "self" }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_roll_advantage"
                    , mode = "advantage"
                    , affects = "self_roll"
                    , on = [ "ability_check" ]
                    , abilityFilter = [ "cha" ]
                    , skillFilter =
                        { kind = "fixed", skills = [ "intimidation" ] }
                    }
                }
              ]
          }
      }

in  thaumaturgy
