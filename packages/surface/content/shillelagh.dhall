-- Shillelagh — SRD 5.2.1 Spell, level 0, Transmutation.
--
-- RAW (Spells/Descriptions-S-Z#Shillelagh):
--   "A Club or Quarterstaff you are holding is imbued with nature's
--    power."
--   "For the duration, you can use your spellcasting ability instead of
--    Strength for the attack and damage rolls of melee attacks using
--    that weapon, and the weapon's damage die becomes a d8."
--   "If the attack deals damage, it can be Force damage or the weapon's
--    normal damage type (your choice)."
--   "The spell ends early if you cast it again or if you let go of the
--    weapon."
--   "Cantrip Upgrade. The damage die changes when you reach levels 5
--    (d10), 11 (d12), and 17 (2d6)."

let DamageDieOverride = { dice : Optional Natural, dieSize : Optional Natural }

let DamageDieTier = { atLevel : Natural, override : DamageDieOverride }

let DamageDie =
      { kind : Text
      , axis : Text
      , base : { dice : Natural, dieSize : Natural }
      , tiers : List DamageDieTier
      }

let Effect =
      { kind : Text
      , replacesAbility : Text
      , attackRollAbility : Text
      , damageRollAbility : Text
      , attackScope : Text
      , damageDie : DamageDie
      , damageTypeChoice : List Text
      }

let shillelagh =
      { kind = "spell"
      , id = "shillelagh"
      , name = "Shillelagh"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Shillelagh"
          }
      , description =
          "A Club or Quarterstaff you are holding is imbued with nature's power. For the duration, you can use your spellcasting ability instead of Strength for the attack and damage rolls of melee attacks using that weapon, and the weapon's damage die becomes a d8. If the attack deals damage, it can be Force damage or the weapon's normal damage type (your choice). The spell ends early if you cast it again or if you let go of the weapon. Cantrip Upgrade. The damage die changes when you reach levels 5 (d10), 11 (d12), and 17 (2d6)."
      , mechanics =
          { family = "ongoing_effect"
          , level = 0
          , school = "transmutation"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "mistletoe" }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              , earlyEnd =
                  [ { kind = "caster_recasts_spell" }
                  , { kind = "caster_lets_go_of_attached_weapon" }
                  ]
              }
          , attachment =
              { kind = "held_weapon"
              , heldBy = "caster"
              , count = 1
              , weaponIds = [ "weapon_club", "weapon_quarterstaff" ]
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "override_attached_weapon_attack"
                    , replacesAbility = "str"
                    , attackRollAbility = "spellcasting"
                    , damageRollAbility = "spellcasting"
                    , attackScope = "melee_attacks_using_attached_weapon"
                    , damageDie =
                        { kind = "threshold_tiers"
                        , axis = "character"
                        , base = { dice = 1, dieSize = 8 }
                        , tiers =
                            [ { atLevel = 5
                              , override =
                                  { dice = None Natural
                                  , dieSize = Some 10
                                  }
                              }
                            , { atLevel = 11
                              , override =
                                  { dice = None Natural
                                  , dieSize = Some 12
                                  }
                              }
                            , { atLevel = 17
                              , override =
                                  { dice = Some 2
                                  , dieSize = Some 6
                                  }
                              }
                            ]
                        }
                    , damageTypeChoice = [ "force", "weapon_normal" ]
                    }
                }
              ] : List { trigger : { kind : Text }, effect : Effect }
          }
      }

in  shillelagh
