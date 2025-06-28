/**
 * LGS Item Viewer modifications for the Conan 2d20 System 
 */

/**
 * Process Conan 2d20 qualities into a formatted string
 * @param {Object} item - The item object
 * @param {Array} qualities - The qualities array
 * @returns {string} Comma-separated list of quality labels
 */
export function processQualities(item, qualities) {
  // Check if qualities is an array and not empty
  if (!Array.isArray(qualities) || qualities.length === 0) {
    return "";
  }
  
  // Extract the label from each quality and join them with commas
  const labels = qualities.map(quality => quality.label);
  return labels.join(", ");
}

/**
 * Process Conan 2d20 skill names to get localized versions
 * @param {Object} item - The item with the skill
 * @param {string} skill - The skill key to translate
 * @returns {string} The localized skill name
 */
export function processSkill(item, skill) {
  const sk = `CONAN.skills.${skill}`;
  const i18n = game.i18n.localize(sk);
  return i18n.includes(".any") ? "Any" : i18n;
}

/**
 * Process Conan 2d20 armor coverage into readable format
 * @param {Object} item - The armor item
 * @param {Array} coverage - The coverage array 
 * @returns {string} Formatted list of body locations
 */
export function processArmorCoverage(item, coverage) {
  // Check if coverage is an array and not empty
  if (!Array.isArray(coverage) || coverage.length === 0) {
    return "";
  }
  
  // Map each coverage element and replace according to criteria
  const mappedCoverage = coverage.map(area => {
    switch (area) {
      case "lleg":
        return "Left Leg";
      case "rleg":
        return "Right Leg";
      case "head":
        return "Head";
      case "rarm":
        return "Right Arm";
      case "larm":
        return "Left Arm";
      case "torso":
        return "Torso";
      default:
        return area;
    }
  });
  
  // Join the mapped elements with commas to create a CSV string
  return mappedCoverage.join(", ");
}

/**
 * Process Conan 2d20 NPC biography with additional stat tables
 * @param {Object} item - The NPC item
 * @param {string} biography - The current biography text
 * @returns {string} Enhanced display with stat tables and biography
 */
export function processNPCBiography(item, biography) {
  let s = item.system;
  let a = s.attributes;
  let sk = s.skills;
  let h = s.health;

  let display = `<table class="descriptionTable center">
    <tbody>
      <tr>
        <td>Awareness</td>
        <td>Intelligence</td>
        <td>Personality</td>
        <td>Willpower</td>
        <td>Agility</td>
        <td>Brawn</td>
        <td>Coordination</td>
      </tr>
      <tr>
        <td>${a["awa"].value}</td>
        <td>${a["int"].value}</td>
        <td>${a["per"].value}</td>
        <td>${a["wil"].value}</td>
        <td>${a["agi"].value}</td>
        <td>${a["bra"].value}</td>
        <td>${a["coo"].value}</td>
      </tr>
    </tbody>
  </table>
  <table class="descriptionTable center">
    <tbody>
      <tr>
        <td>Combat</td>
        <td>Fortitude</td>
        <td>Knowledge</td>
        <td>Movement</td>
        <td>Senses</td>
        <td>Social</td>
      </tr>
      <tr>
        <td>${sk["cmb"].value}</td>
        <td>${sk["frt"].value}</td>
        <td>${sk["knw"].value}</td>
        <td>${sk["mov"].value}</td>
        <td>${sk["sns"].value}</td>
        <td>${sk["scl"].value}</td>
      </tr>
    </tbody>
  </table>
  <table class="descriptionTable center">
    <tbody>
      <tr>
        <td>Vigor</td>
        <td>Armor</td>
        <td>Wounds</td>
        <td>Resolve</td>
        <td>Courage</td>
        <td>Trauma</td>
      </tr>
      <tr>
        <td>${h.physical.max}</td>
        <td>${s.armor}</td>
        <td>${h.physical.wounds.max}</td>
        <td>${h.mental.value}</td>
        <td>${h.courage}</td>
        <td>${h.mental.traumas.max}</td>
      </tr>
    </tbody>
  </table>
<br>
${biography}`;

  return display;
}


export function replaceSymbols(desc) {
	const sp = '<i class="phoenix-sigil"></i>';
	//desc = desc.replaceAll("§",sp)
  return desc.replace(/§|&sect;|CD/g, sp);
}


/**
 * The full field path, followed by the item using the path:function to call
 */
export const fieldProcessors = {
  'system.qualities.value': {
    '*': processQualities
  },
  'system.coverage.value': {
    'armor': processArmorCoverage
  },
  'system.skill': {
    '*': processSkill
  },
  'system.details.biography.value': {
    'npc': processNPCBiography
  }
};