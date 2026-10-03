{ kind = "class_feature"
, id = "wizard_memorize_spell"
, name = "Memorize Spell"
, className = "wizard"
, acquiredAtLevel = 5
, provenance = { kind = "srd-5.2.1", section = "classes.md:10269-10272" }
, mechanics = { family = "prepared_spell_rest_replacement"
              , trigger = "short_rest_completion"
              , replacementCount = 1
              , preparedSpellSource = "class_spellcasting"
              , replacementSource = "own_spellbook"
              , minimumSpellLevel = 1
              }
}
