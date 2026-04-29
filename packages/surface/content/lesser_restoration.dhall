-- Lesser Restoration — SRD 5.2.1 Spell, level 2, Abjuration.
--
-- RAW (Spells / Descriptions E-L / Lesser Restoration):
--   "You touch a creature and end one condition on it: Blinded,
--    Deafened, Paralyzed, or Poisoned."
--
-- ZERO-WIDENING VALIDATION REFERENCE after today's refinement of
-- remove_condition.condition to the three-shape union
-- (Condition | array-of-all | { kind: "choose", from: [...] }).
-- Lesser Restoration uses the choose-one form; Heal uses the
-- array-of-all form; Blindness/Deafness (apply side) uses the
-- choose-one form. Three distinct semantics exercised.

let lesserRestoration =
      { kind = "spell"
      , id = "lesser_restoration"
      , name = "Lesser Restoration"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Lesser Restoration"
          }
      , description =
          "You touch a creature and end one condition on it: Blinded, Deafened, Paralyzed, or Poisoned."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "lesser_restoration_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "remove_condition"
                      , condition =
                          { kind = "choose"
                          , from =
                              [ "blinded", "deafened", "paralyzed", "poisoned" ]
                          }
                      }
                    ]
                }
              ]
          }
      }

in  lesserRestoration
