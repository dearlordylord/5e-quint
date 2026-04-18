-- Cloak of Arachnida — SRD 5.2.1 magic item (very rare, attunement).
--
-- Honest fit to current surface, with explicit omissions recorded in
-- proposal-magic_item_cloak_of_arachnida.md:
--   • Passive benefits: Poison Resistance + Climb Speed equal to Speed.
--   • Activated benefit: cast Web with fixed DC 13, once per dawn.
--
-- Known gaps NOT encoded here:
--   • The granted Web's "fills twice its normal area" rider still has no
--     honest fixed-geometry encoding in this authored file.
--   • "while wearing it" has no generic worn-item predicate on magic items.

let FixedDc = { kind : Text, dc : Natural }

let PassiveEffect =
      { kind : Text
      , damageType : Optional Text
      , speedKind : Optional Text
      , feet : Optional { kind : Text }
      }

let ActivationEffect =
      { kind : Text
      , spellId : Optional Text
      , mode : Optional Text
      , dcOverride : Optional FixedDc
      }

let ActivationCost = { kind : Text }

let UseCountResource =
      { kind : Text
      , cap : { kind : Text, uses : Natural }
      }

let FixedAmount =
      { kind : Text
      , expr : { dice : Natural, dieSize : Natural, flat : Optional Natural }
      }

let DawnReset = { kind : Text, regain : Optional FixedAmount }

let DirectPhase =
      { kind : Text
      , attachment : { kind : Text }
      , effects : List ActivationEffect
      }

let MagicItemPart =
      { family : Text
      , grants : Optional (List PassiveEffect)
      , activationCost : Optional ActivationCost
      , resource : Optional UseCountResource
      , resetCadence : Optional DawnReset
      , phases : Optional (List DirectPhase)
      }

let cloak =
      { kind = "magic_item"
      , id = "magic_item_cloak_of_arachnida"
      , name = "Cloak of Arachnida"
      , rarity = "very_rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#CloakOfArachnida"
          }
      , description =
          "While wearing this cloak, you gain Resistance to Poison damage. You have a Climb Speed equal to your Speed and can move up, down, and across vertical surfaces and along ceilings, while leaving your hands free. You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain. You can cast Web (save DC 13). The web created by the spell fills twice its normal area. Once used, this property can't be used again until the next dawn."
      , mechanics =
          { family = "composite"
          , parts =
              [ { family = "passive"
                , grants =
                    Some
                      [ { kind = "grant_resistance"
                        , damageType = Some "poison"
                        , speedKind = None Text
                        , feet = None { kind : Text }
                        }
                      , { kind = "grant_speed"
                        , damageType = None Text
                        , speedKind = Some "climb"
                        , feet = Some { kind = "walk_speed" }
                        }
                      , { kind = "ignore_web_restrictions"
                        , damageType = None Text
                        , speedKind = None Text
                        , feet = None { kind : Text }
                        }
                      ]
                , activationCost = None ActivationCost
                , resource = None UseCountResource
                , resetCadence = None DawnReset
                , phases = None (List DirectPhase)
                }
              , { family = "activation"
                , grants = None (List PassiveEffect)
                , activationCost = Some { kind = "action" }
                , resource =
                    Some
                      { kind = "use_count"
                      , cap = { kind = "fixed", uses = 1 }
                      }
                , resetCadence =
                    Some
                      { kind = "dawn"
                      , regain =
                          Some
                            { kind = "fixed"
                            , expr =
                                { dice = 1
                                , dieSize = 1
                                , flat = None Natural
                                }
                            }
                      }
                , phases =
                    Some
                      [ { kind = "direct"
                        , attachment = { kind = "self" }
                        , effects =
                            [ { kind = "grant_spell_access"
                              , spellId = Some "web"
                              , mode = Some "at_will"
                              , dcOverride =
                                  Some { kind = "fixed", dc = 13 }
                              }
                            ]
                        }
                      ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  cloak
