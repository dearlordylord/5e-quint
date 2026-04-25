-- Ice Knife — SRD 5.2.1 Spell, Level 1, Conjuration.
--
-- RAW (Spells / Descriptions E-L / Ice Knife):
--   "You create a shard of ice and fling it at one creature within
--    range. Make a ranged spell attack against the target. On a hit,
--    the target takes 1d10 Piercing damage. Hit or miss, the shard
--    then explodes. The target and each creature within 5 feet of it
--    must succeed on a Dexterity saving throw or take 2d6 Cold
--    damage."
--   Upcast: "The Cold damage increases by 1d6 for each spell slot
--    level above 1."
--
-- Family: activation with TWO heterogeneous phases:
--   Phase 1: attack_roll on the primary target — 1d10 piercing on hit.
--   Phase 2: save_gate (Dex) in a 5-foot emanation from that target
--           — 2d6 cold + 1d6/slot above 1 on fail; none on success.
-- Both phases fire unconditionally ("hit or miss, the shard explodes").
--
-- Heterogeneous-phase list compiles via _types.dhall supersets for
-- Phase, Attachment, and Effect; `--omit-empty` drops None fields.

let T = ./_types.dhall

let targetAttachment =
        T.defaultAttachment
      //  { kind = "hole"
          , holeId = Some "ice_knife_target"
          , label = Some "target"
          , value = Some
              (    T.defaultAttachmentValue
                // { kind = "target", selection = Some { mode = "one" } }
              )
          }

let areaAttachment =
        T.defaultAttachment
      //  { kind = "hole"
          , holeId = Some "ice_knife_burst_origin"
          , label = Some "burst origin"
          , value = Some
              (    T.defaultAttachmentValue
                // { kind = "area"
                   , shape = Some
                       (    T.defaultAreaShape
                         // { kind = "emanation", radiusFeet = Some 5 }
                       )
                   , origin = Some { kind = "on_primary_target" }
                   }
              )
          }

let piercingHit =
        T.defaultEffect
      //  { kind = "damage"
          , damageType = Some "piercing"
          , amount = Some (T.defaultDiceAmount
              // { kind = "fixed"
                 , expr = Some { dice = 1, dieSize = 10 }
                 })
          }

let noEffect = T.defaultEffect // { kind = "none" }

let coldDamage =
        T.defaultEffect
      //  { kind = "damage"
          , damageType = Some "cold"
          , amount = Some (T.defaultDiceAmount
              // { kind = "linear_per_level"
                 , axis = Some "slot"
                 , base = Some { dice = 2, dieSize = 6 }
                 , perLevel = Some { dice = 1, dieSize = Some 6 }
                 , startingAtLevel = Some 1
                 })
          }

let attackPhase =
        T.defaultPhase
      //  { kind = "attack_roll"
          , attachment = Some targetAttachment
          , attackKind = Some "ranged_spell_attack"
          , onHit = Some [ piercingHit ]
          , onMiss = Some [ noEffect ]
          }

let savePhase =
        T.defaultPhase
      //  { kind = "save_gate"
          , attachment = Some areaAttachment
          , ability = Some "dex"
          , dc = Some { kind = "caster_spell_save_dc", dc = None Natural }
          , onFail = Some coldDamage
          , onSuccess = Some noEffect
          }

let iceKnife =
      { kind = "spell"
      , id = "ice_knife"
      , name = "Ice Knife"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Ice Knife"
          }
      , description =
          "You create a shard of ice and fling it at one creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 Piercing damage. Hit or miss, the shard then explodes. The target and each creature within 5 feet of it must succeed on a Dexterity saving throw or take 2d6 Cold damage. Using a Higher-Level Spell Slot: The Cold damage increases by 1d6 for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = False
              , s = True
              , m = Some "a drop of water or a piece of ice"
              }
          , duration = { kind = "instantaneous" }
          , phases = [ attackPhase, savePhase ]
          }
      }

in  iceKnife
