-- Divine Favor — SRD 5.2.1 Spell, level 1, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Divine Favor):
--   "Until the spell ends, your attacks with weapons deal an extra
--    1d4 Radiant damage on a hit."
--
-- ZERO-WIDENING VALIDATION REFERENCE. First self-scoped
-- damage_on_hit — attachment=self + family=ongoing_effect + operation
-- damage_on_hit. Hunter's Mark was the first damage_on_hit instance
-- but anchored the rider to the marked target; Divine Favor anchors
-- to the caster's own weapon hits. Same operation atom, different
-- attachment.

let divineFavor =
      { kind = "spell"
      , id = "divine_favor"
      , name = "Divine Favor"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Divine Favor"
          }
      , description =
          "Until the spell ends, your attacks with weapons deal an extra 1d4 Radiant damage on a hit."
      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              }
          , attachment = { kind = "self" }
          , operations =
              [ { trigger = { kind = "on_caster_attack_hit" }
                , effect =
                    { kind = "damage"
                    , damageType = "radiant"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 1, dieSize = 4 }
                        }
                    }
                }
              ]
          }
      }

in  divineFavor
