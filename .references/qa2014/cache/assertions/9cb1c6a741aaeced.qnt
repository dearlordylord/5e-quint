// Source: https://rpg.stackexchange.com/q/142644
module _qa_9cb1c6a741aaeced {
  import dnd.* from "./dnd"

  // Heat Metal on full-body armor (Scale Mail/Plate): mount in physical contact takes full 2d8 fire damage
  run qa_heat_metal_mount_fullbody_armor_takes_fire_damage = {
    val mountMaxHp = 30
    val mount = freshCreature(mountMaxHp)
    // Pre-resolved 2d8 = 11; full-body armor (Scale Mail / Plate) contacts mount seat
    val heatMetalRoll = 11
    val mountAfter = pTakeDamage(mount, heatMetalRoll, Fire, Set(), Set(), Set(), false)
    assert(mountAfter.hp == mountMaxHp - heatMetalRoll)
  }
  
  // Heat Metal on upper-body-only armor (Chain Shirt/Breastplate): no lower-body contact, mount takes 0 damage
  run qa_heat_metal_upper_body_armor_mount_no_damage = {
    val mountMaxHp = 30
    val mount = freshCreature(mountMaxHp)
    // Upper-body armor does not contact the mount; damage dealt to mount is 0
    val mountAfter = pTakeDamage(mount, 0, Fire, Set(), Set(), Set(), false)
    assert(mountAfter.hp == mountMaxHp)
  }
  
  // Heat Metal: partial contact still triggers full 2d8—contact area does not scale damage
  run qa_heat_metal_partial_contact_full_damage = {
    val mountMaxHp = 20
    val mount = freshCreature(mountMaxHp)
    // Even minimal metal contact (e.g. one gauntlet) delivers the full roll; no partial reduction
    val heatMetalRoll = 9
    val mountAfter = pTakeDamage(mount, heatMetalRoll, Fire, Set(), Set(), Set(), false)
    assert(mountAfter.hp == mountMaxHp - heatMetalRoll)
  }
  
  // Heat Metal: fire-resistant mount (e.g. fire lizard) still takes halved damage even when in full contact
  run qa_heat_metal_fire_resistant_mount_halved = {
    val mountMaxHp = 20
    val mount = freshCreature(mountMaxHp)
    val heatMetalRoll = 10
    // Resistance to Fire halves the damage; contact area is irrelevant to this reduction
    val mountAfter = pTakeDamage(mount, heatMetalRoll, Fire, Set(Fire), Set(), Set(), false)
    assert(mountAfter.hp == mountMaxHp - 5)
  }
}
