-- Tree Stride - SRD 5.2.1 Spell, level 5, Conjuration.

let treeStride =
      { kind = "spell"
      , id = "tree_stride"
      , name = "Tree Stride"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Tree Stride"
          }
      , description =
          "You gain the ability to enter a living tree at least your size and move from inside it to inside another living tree of the same kind within 500 feet. You use 5 feet of movement to enter a tree. You instantly know the location of all other trees of the same kind within 500 feet and, as part of the move used to enter, can either pass into one of them or step out of the tree you're in. You appear within 5 feet of the destination tree, using another 5 feet of movement; if you have no movement left, you appear within 5 feet of the tree you entered. You can use this transportation once on each of your turns and must end each turn outside a tree."
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
