-- Tree Stride - SRD 5.2.1 Spell, level 5, Conjuration.

let treeStride =
      { kind = "spell"
      , id = "tree_stride"
      , name = "Tree Stride"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Tree Stride"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration", upTo = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  treeStride
