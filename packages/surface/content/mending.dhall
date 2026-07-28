-- Mending — SRD 5.2.1 Transmutation Cantrip.
--
-- RAW (Spells/Descriptions-M-P#Mending):
--   Repairs one break or tear in a touched object when the damage is no
--   larger than 1 foot in any dimension. The repair leaves no trace.
--   A magic item can be physically repaired, but its magic is not restored.

let mending =
      { kind = "spell"
      , id = "mending"
      , name = "Mending"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P.md#Mending"
          }
      , mechanics =
          { family = "utility"
          , level = 0
          , school = "transmutation"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "two lodestones"
              }
          , duration = { kind = "instantaneous" }
          , utilityKind = "object_repair"
          , target = { kind = "object", count = 1 }
          , effect =
              { kind = "repair_object_break_or_tear"
              , maxDimensionFeet = 1
              , leavesNoTrace = True
              , restoresMagic = False
              , duration = "instantaneous"
              }
          }
      }

in  mending
