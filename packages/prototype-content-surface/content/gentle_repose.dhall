-- Gentle Repose — SRD 5.2.1 Level 2 Necromancy.
--
-- RAW (Spells/Descriptions-E-L#Gentle Repose):
--   "You touch a corpse or other remains. For the duration, the target
--    is protected from decay and can't become Undead.
--    The spell also effectively extends the time limit on raising the
--    target from the dead, since days spent under the influence of this
--    spell don't count against the time limit of spells such as Raise Dead."
--
-- Family: activation (direct block applied to an object target; timed 10 days).
-- Attachment: object (the touched corpse or remains).
-- Effect: block_reanimation — flags the target as an invalid reanimation
--   source, preventing Animate Dead / Create Undead / natural undead rising
--   from targeting it.
--
-- OMITTED (DM agenda):
--   "protected from decay" — purely narrative; no mechanical atom models
--   physical decay or its suppression.
--
-- OMITTED (atom_widening — see proposal-gentle_repose.md):
--   "days spent under the influence don't count against the time limit
--    of spells such as Raise Dead" — requires a new atom that pauses
--    another effect's deadline countdown. No such atom exists in v4
--    (no `freeze_deadline` / `pause_spell_timer` atom in EffectAtom).

let gentleRepose =
      { kind = "spell"
      , id = "gentle_repose"
      , name = "Gentle Repose"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Gentle Repose"
          }
      , description =
          "You touch a corpse or other remains. For the duration, the target is protected from decay and can't become Undead. The spell also effectively extends the time limit on raising the target from the dead, since days spent under the influence of this spell don't count against the time limit of spells such as Raise Dead."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "necromancy"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "2 Copper Pieces"
              , materialConsumed = Some True
              }
          , duration =
              { kind = "timed"
              , value = { unit = "day", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "hole"
                               , holeId = "gentle_repose_object"
                               , label = "target object"
                               , value =
                                   { kind = "object", count = 1 }
                               }
                , effects = [ { kind = "block_reanimation" } ]
                }
              ]
          }
      }

in  gentleRepose
