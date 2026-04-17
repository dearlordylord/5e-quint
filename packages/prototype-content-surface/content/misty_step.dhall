-- Misty Step — SRD 5.2.1 Spell, level 2, Conjuration.
--
-- RAW (Spells / Descriptions M-P / Misty Step):
--   "Briefly surrounded by silvery mist, you teleport up to 30 feet to
--    an unoccupied space you can see."
--
-- Casting Time: Bonus Action. Range: Self. Duration: Instantaneous.
-- Components: V.
--
-- Consolidated validation reference for:
--   • EffectAtom.teleport { maxFeet = 30,
--                           destination = unoccupied_visible_space }
--     (new widening — first unit with a pure teleport atom; Dimension
--      Door and Thunder Step will exercise the same shape with
--      different maxFeet when they land.)
--   • ActivationPhase.direct with self-attachment (no gate, no roll)

let mistyStep =
      { kind = "spell"
      , id = "misty_step"
      , name = "Misty Step"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Misty Step"
          }
      , description =
          "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space you can see."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "conjuration"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "teleport"
                      , maxFeet = 30
                      , destination = "unoccupied_visible_space"
                      }
                    ]
                }
              ]
          }
      }

in  mistyStep
