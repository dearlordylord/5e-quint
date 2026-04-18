-- Arcane Lock — SRD 5.2.1 Spell, Level 2, Abjuration.
-- Permanently locks a touched closeable object (door, window, gate,
-- container, hatch) against nonmagical opening, until dispelled.
--
-- RAW (Spells / Descriptions A-D / Arcane Lock):
--   "You touch a closed door, window, gate, container, or hatch and
--    magically lock it for the duration. This lock can't be unlocked
--    by any nonmagical means. You and any creatures you designate when
--    you cast the spell can open and close the object despite the lock.
--    You can also set a password that, when spoken within 5 feet of
--    the object, unlocks it for 1 minute."
--
-- The `lock_object` atom was designed for this spell. Designated-creature
-- bypass is a cast-time selection noted in the atom's comment as
-- caller-owned (no surface field). The optional password is a cast-time
-- player decision; `lock_object.password` carries a fixed authored string
-- if needed, but for the spell itself the password is set at runtime —
-- so the field is omitted here and the 1-minute unlock timer is the
-- fixed SRD constant noted in the atom's type comment.

let arcane_lock =
      { kind = "spell"
      , id = "arcane_lock"
      , name = "Arcane Lock"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Arcane Lock"
          }
      , description =
          "You touch a closed door, window, gate, container, or hatch and magically lock it for the duration. This lock can't be unlocked by any nonmagical means. You and any creatures you designate when you cast the spell can open and close the object despite the lock. You can also set a password that, when spoken within 5 feet of the object, unlocks it for 1 minute."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "gold dust worth 25+ GP, which the spell consumes"
              , materialCostGp = Some 25
              , materialConsumed = Some True
              }
          , duration =
              { kind = "permanent"
              , endsOn = [ "dispel" ]
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "object"
                    , count = 1
                    }
                , effects =
                    [ { kind = "lock_object" }
                    ]
                }
              ]
          }
      }

in  arcane_lock
