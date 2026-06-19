-- Speak with Dead - SRD 5.2.1 Spell, level 3, Necromancy.
--
-- RAW (Spells/Descriptions-S-Z#Speak with Dead):
--   "You grant the semblance of life to a corpse of your choice within range,
--    allowing it to answer questions you pose."
--   "The corpse must have a mouth, and this spell fails if the deceased
--    creature was Undead when it died."
--   "The spell also fails if the corpse was the target of this spell within
--    the past 10 days."
--   "Until the spell ends, you can ask the corpse up to five questions."
--   "The corpse knows only what it knew in life, including the languages it
--    knew."
--
-- Corpse identity, mouth presence, former creature type at death, and prior
-- ten-day targeting are table/corpse-eligibility facts. Question contents,
-- answer contents, truthfulness, relationship adjudication, knowledge limits,
-- language history, and the soul/animating-spirit distinction are table
-- communication facts. This Spell Definition preserves those SRD source facts
-- without promoting a battle-runtime conversation or corpse-lifecycle owner.

let speakWithDead =
      { kind = "spell"
      , id = "speak_with_dead"
      , name = "Speak with Dead"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Speak with Dead"
          }
      , description =
          "You grant the semblance of life to a corpse of your choice within range, allowing it to answer questions you pose. The corpse must have a mouth, and this spell fails if the deceased creature was Undead when it died. The spell also fails if the corpse was the target of this spell within the past 10 days. Until the spell ends, you can ask the corpse up to five questions. The corpse knows only what it knew in life, including the languages it knew. Answers are usually brief, cryptic, or repetitive, and the corpse is under no compulsion to offer a truthful answer if you are antagonistic toward it or it recognizes you as an enemy. This spell doesn't return the creature's soul to its body, only its animating spirit. Thus, the corpse can't learn new information, doesn't comprehend anything that has happened since it died, and can't speculate about future events."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 10 }
          , components =
              { v = True
              , s = True
              , m = Some "burning incense"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "speak_with_dead_corpse"
                    , label = "corpse with a mouth"
                    , value =
                        { kind = "object"
                        , count = 1
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  speakWithDead
