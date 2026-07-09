-- Commune with Nature - SRD 5.2.1 Spell, level 5, Divination.

let communeWithNature =
      { kind = "spell"
      , id = "commune_with_nature"
      , name = "Commune with Nature"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Commune with Nature"
          }
      , description =
          "You commune with nature spirits and learn three facts about the surrounding area: outdoors within 3 miles, or in caves and other natural underground settings within 300 feet. The spell doesn't function where nature has been replaced by construction. The facts can include settlements, portals to other planes, one CR 10+ Celestial, Elemental, Fey, Fiend, or Undead, the prevalent kind of plant, mineral, or Beast, or bodies of water."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "divination"
          , castingTime = { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  communeWithNature
