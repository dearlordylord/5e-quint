-- Chime of Opening — SRD 5.2.1 magic item (wondrous, uncommon).
--
-- RAW (Magic-Items / Items A-H):
--   "This hollow metal tube measures about 1 foot long and weighs 1
--    pound. As a Magic action, you can strike the chime to cast Knock.
--    The spell's customary knocking sound is replaced by the clear,
--    ringing tone of the chime, which is audible out to 300 feet.
--    The chime can be used 10 times. After the tenth time, it cracks
--    and becomes useless."
--
-- Consolidated validation reference for:
--   • RestResetCadence.never (no refill — uses are permanently spent)
--   • ItemDestructionPolicy.permanent_on_empty (deterministic, no roll)
--   • SpellAccessMode.charge_cast at a single level (L2 Knock, 1 charge
--     per cast — degenerate minLevel=maxLevel case of the variable-
--     upcast shape).

let chime =
      { kind = "magic_item"
      , id = "magic_item_chime_of_opening"
      , name = "Chime of Opening"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#ChimeOfOpening"
          }
      , description =
          "This hollow metal tube measures about 1 foot long and weighs 1 pound. As a Magic action, you can strike the chime to cast Knock. The spell's customary knocking sound is replaced by the clear, ringing tone of the chime, which is audible out to 300 feet. The chime can be used 10 times. After the tenth time, it cracks and becomes useless."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 10 }
              }
          , resetCadence = { kind = "never" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_spell_access"
                      , spellId = "knock"
                      , mode =
                          { kind = "charge_cast"
                          , baseCharges = 1
                          , perLevelCharges = 0
                          , minLevel = 2
                          , maxLevel = 2
                          }
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  chime
