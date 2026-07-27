-- Contact Other Plane - SRD 5.2.1 Spell, level 5, Divination.
--
-- RAW (Spells/Descriptions-A-D#Contact Other Plane):
--   "You mentally contact a demigod, the spirit of a long-dead sage, or
--    some other knowledgeable entity from another plane."
--   "When you cast this spell, make a DC 15 Intelligence saving throw."
--   On success, ask up to five questions before the spell ends; the GM
--   answers with one word, with "unclear" for unknown answers and a short
--   phrase if one word would mislead.
--   On failure, take 6d6 Psychic damage and have the Incapacitated
--   condition until finishing a Long Rest; Greater Restoration ends it.

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional { kind : Text, expr : { dice : Natural, dieSize : Natural } }
      , condition : Optional Text
      , duration : Optional Text
      }

let psychicMindBreak : Effect =
      { kind = "damage"
      , damageType = Some "psychic"
      , amount = Some { kind = "fixed", expr = { dice = 6, dieSize = 6 } }
      , condition = None Text
      , duration = None Text
      }

let incapacitatedUntilLongRest : Effect =
      { kind = "apply_condition"
      , damageType = None Text
      , amount = None { kind : Text, expr : { dice : Natural, dieSize : Natural } }
      , condition = Some "incapacitated"
      , duration = Some "until_long_rest_or_greater_restoration"
      }

let planarAnswers =
      { kind = "planar_entity_answers"
      , source = "other_planar_knowledgeable_entity"
      , questionCount = 5
      , answer =
          { primary = "one_word"
          , unknown = "unclear"
          , fallback = "short_phrase_if_one_word_misleading"
          }
      , questionWindow = { unit = "minute", amount = 1 }
      }

let contactOtherPlane =
      { kind = "spell"
      , id = "contact_other_plane"
      , name = "Contact Other Plane"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Contact Other Plane"
          }
      , description =
          "You mentally contact a demigod, the spirit of a long-dead sage, or some other knowledgeable entity from another plane. When you cast this spell, make a DC 15 Intelligence saving throw. On a successful save, you can ask the entity up to five questions before the spell ends. The GM answers each question with one word, such as unclear if the entity doesn't know; if a one-word answer would be misleading, the GM might offer a short phrase. On a failed save, you take 6d6 Psychic damage and have the Incapacitated condition until you finish a Long Rest. Greater Restoration ends this effect."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "divination"
          , castingTime = { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "save_gate"
                , attachment = { kind = "self" }
                , ability = "int"
                , dc = { kind = "fixed", dc = 15 }
                , onFail =
                    { kind = "composite"
                    , effects = [ psychicMindBreak, incapacitatedUntilLongRest ]
                    }
                , onSuccess = planarAnswers
                }
              ]
          }
      }

in  contactOtherPlane
