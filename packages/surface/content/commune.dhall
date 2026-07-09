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
          "You contact a deity or divine proxy and ask up to three yes-or-no questions before the spell ends. You receive a correct answer for each question, though an answer can be unclear if the information is beyond the deity's knowledge, and the GM might offer a short phrase if a one-word answer would mislead or conflict with the deity's interests. Repeated castings before a Long Rest carry a cumulative 25 percent chance of no answer after the first."
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
