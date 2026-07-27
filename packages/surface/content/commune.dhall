-- Commune - SRD 5.2.1 Spell, level 5, Divination.

let commune =
      { kind = "spell"
      , id = "commune"
      , name = "Commune"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Commune"
          }
      , description =
          "You contact a deity or divine proxy and ask up to three yes-or-no questions before the spell ends. You receive a correct answer for each question. You might receive an unclear answer if the information lies beyond the deity's knowledge. The GM might offer a short phrase if a one-word answer could be misleading or contrary to the deity's interests. If you cast the spell more than once before finishing a Long Rest, there is a cumulative 25 percent chance for each casting after the first that you get no answer."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "divination"
          , castingTime = { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = "incense" }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  commune
