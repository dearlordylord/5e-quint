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
-- The selected wonder is a typed mode. Only Booming Voice currently has a
-- battle execution projection; the other modes remain table/environment facts.

let Effect =
      { kind : Text
      , mode : Text
      , affects : Text
      , on : List Text
      , abilityFilter : List Text
      , skillFilter : { kind : Text, skills : List Text }
      }

let boomingVoiceEffect : Effect =
      { kind = "modify_roll_advantage"
      , mode = "advantage"
      , affects = "self_roll"
      , on = [ "ability_check" ]
      , abilityFilter = [ "cha" ]
      , skillFilter = { kind = "fixed", skills = [ "intimidation" ] }
      }

let Mode =
      { id : Text
      , displayName : Text
      , effectDuration : Text
      , effects : Optional (List Effect)
      }

let tableMode =
      \(id : Text) ->
      \(displayName : Text) ->
      \(effectDuration : Text) ->
        { id
        , displayName
        , effectDuration
        , effects = None (List Effect)
        } : Mode

let thaumaturgy =
      { kind = "spell"
      , id = "thaumaturgy"
      , name = "Thaumaturgy"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Thaumaturgy"
          }

      , mechanics =
          { family = "modal_ongoing_effect"
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
          , mode =
              { label = "minor wonder"
              , options =
                  [ tableMode "altered_eyes" "Altered Eyes" "spell_duration"
                  , { id = "booming_voice"
                    , displayName = "Booming Voice"
                    , effectDuration = "spell_duration"
                    , effects = Some [ boomingVoiceEffect ]
                    } : Mode
                  , tableMode "fire_play" "Fire Play" "spell_duration"
                  , tableMode "invisible_hand" "Invisible Hand" "instantaneous"
                  , tableMode "phantom_sound" "Phantom Sound" "instantaneous"
                  , tableMode "tremors" "Tremors" "spell_duration"
                  ]
              }
          , concurrentEffectLimit =
              { maximumActive = 3
              , appliesTo = "spell_duration_modes"
              }
          }
      }

in  thaumaturgy
