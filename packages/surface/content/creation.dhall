-- Creation - SRD 5.2.1 Spell, level 5, Illusion.

let creation =
      { kind = "spell"
      , id = "creation"
      , name = "Creation"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Creation"
          }
      , description =
          "You pull wisps of shadow material from the Shadowfell to create an object within range. The object is vegetable matter or mineral matter, must be no larger than a 5-foot Cube, and must be a form and material you have seen. Its duration depends on material: 24 hours for vegetable matter, 12 hours for stone or crystal, 1 hour for precious metals, 10 minutes for gems, and 1 minute for adamantine or mithral. If composed of multiple materials, use the shortest duration. A created object used as another spell's Material component makes that spell fail. Using a Higher-Level Spell Slot, the Cube increases by 5 feet for each slot level above 5."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "illusion"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = "a paintbrush" }
          , duration =
              { kind = "timed", value = { unit = "hour", amount = 24 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location", description = "point within range" }
                , effects =
                    [ { kind = "create_object"
                      , maxSize = "medium"
                      , shape = { kind = "cube", sideFeet = 5 }
                      }
                    ]
                }
              ]
          }
      }

in  creation
