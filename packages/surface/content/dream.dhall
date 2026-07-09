-- Dream - SRD 5.2.1 Spell, level 5, Illusion.

let dream =
      { kind = "spell"
      , id = "dream"
      , name = "Dream"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dream"
          }
      , description =
          "You target a creature you know on the same plane. You or a willing creature you touch enters a trance as a dream messenger; while in the trance, the messenger is Incapacitated and has Speed 0. If the target sleeps during the spell, the messenger appears in its dreams and can converse, shape the dream, and end the trance at any time. The target recalls the dream perfectly. If the target is awake, the messenger knows and can end the spell or wait. If the messenger makes the dream terrifying, it can deliver a message of no more than ten words; then the target makes a Wisdom saving throw. On a failed save, the target gains no benefit from its rest and takes 3d6 Psychic damage when it wakes."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "illusion"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "unlimited" }
          , components = { v = True, s = True, m = "a handful of sand" }
          , duration = { kind = "timed", value = { unit = "hour", amount = 8 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  dream
