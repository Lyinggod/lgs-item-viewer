/**
 * LGS Item Viewer modifications for FGG Star Wars System 
 */

// name of field modification file
 export const fullSystemName = "Star Wars Genesys Wealth Rules"

/**
 * Process Star Wars FFG weapon damage by checking for weapon stat modifiers
 * @param {Object} item - The weapon item
 * @param {number} damage - The current damage value
 * @returns {number} The processed damage value
 */
export function processWeaponDamage(item, damage) {
  // If damage is already non-zero, return it as is
  if (damage !== 0) {
    return damage;
  }
  
  // Check if the item has attributes that might modify weapon damage
  if (item.system && item.system.attributes) {
    const attributes = item.system.attributes;
    
    // Look for the first attribute that is a Weapon Stat modifier for damage
    for (const attrKey in attributes) {
      const attr = attributes[attrKey];
      
      // Check if this attribute is a Weapon Stat modifier for damage
      if (attr.modtype === "Weapon Stat" && attr.mod === "damage") {
        // Found a damage modifier, return its value
        return "+"+attr.value;
      }
    }
  }
  
  // No damage modifier found, return the original damage value
  return damage;
}

/**
 * Process Star Wars FFG species items
 * @param {Object} item - The species item
 * @param {string} description - The current description
 * @returns {string} The processed description with attributes table
 */
export async function processSpecies(item, description) {
  const s = item.system;
  const a = s.attributes;
  //description = addParagraph(description);
  
  // Check if we have the necessary data
  if (!a || !a["Brawn"] || !a["Agility"] || !a["Intellect"] || 
      !a["Cunning"] || !a["Willpower"] || !a["Presence"] || 
      !a["Wounds"] || !a["Strain"]) {
    // Missing required attributes, return original description
    return description;
  }
  
  // Build attributes table
  const attributes = `
<div class="genesysTables genesysSpeciesAttributes">
    <table class="genesysStatTable">
        <tbody>
            <tr style="background: none">
                <td style="background: none">${a["Brawn"].value}</td> 
                <td style="background: none">${a["Agility"].value}</td> 
                <td style="background: none">${a["Intellect"].value}</td> 
                <td style="background: none">${a["Cunning"].value}</td> 
                <td style="background: none">${a["Willpower"].value}</td> 
                <td style="background: none">${a["Presence"].value}</td> 
            </tr>
            <tr>
                <td><b>Brawn</b></td>
                <td><b>Agility</b></td>
                <td><b>Intellect</b></td>
                <td><b>Cunning</b></td>
                <td><b>Willpower</b></td>
                <td><b>Presence</b></td>
            </tr>
        </tbody>
    </table>
    <table class="genesysSubStatTable">
        <tbody>
            <tr>
                <td style="background: none"><b>Wounds</b></td>
                <td style="background: none"><b>Strain</b></td>
                <td style="background: none"><b>Starting XP</b></td>
            </tr>
            <tr>
                <td>${a["Wounds"].value}</td> 
                <td>${a["Strain"].value}</td> 
                <td>${s.startingXP}</td> 
            </tr>
        </tbody>
    </table>
</div>`;

  // Check for abilities and add them if they exist
  let abilitiesHtml = '';
  if (s.abilities && Object.keys(s.abilities).length > 0) {
    abilitiesHtml = '<span class="abilityHeader">Abilities</span><ul>';
    abilitiesHtml += getItemSkillRanks(item);
    // Process each ability
    for (const abilityId in s.abilities) {
      const ability = s.abilities[abilityId];
	  const desc = ability.system.description.replace("<p>","").replace("</p>","");
      abilitiesHtml += `<li><strong>${ability.name}</strong>: ${desc}</li>`;
    }
    
    abilitiesHtml += '</ul>';
  }

  const itemOptions = await getItemOptions(item);

  // Combine the original description with attributes and abilities
  return `${description}${attributes}${abilitiesHtml}${itemOptions}`;
}

/**
 * Build a formatted list of items (and descriptions) that puts single‑choice
 * items first, followed by any “choose‑one” groups.
 */
export async function getItemOptions(item) {
  const groups = item.flags["lgs-ffg-item-enhancers"]?.addedItems ?? {};

  const singlesHtml = [];          // <li>…</li> lines for single items
  const multiGroups = [];          // arrays that still contain the “or” tokens

  // --- Sort the incoming CSV strings into single‑item vs multi‑item groups ---
  for (const key in groups) {
    for (const csv of groups[key]) {
      const tokens = csv.split(",").map(t => t.trim());

      if (tokens.some(t => t.toLowerCase() === "or")) {               // multi
        multiGroups.push(tokens);
      } else {                                                        // single
        const uuid = tokens[0];
        const i     = await fromUuid(uuid);
        const name  = i?.name ?? "";
        let desc  = i?.system?.description ?? "";
		desc = desc.replace("<p>","").replace("</p>","");
        singlesHtml.push(`<li><b>${name}</b>: ${desc}</li>`);
      }
    }
  }

  // --- Assemble the final HTML ------------------------------------------------
  let html = ""// = `<b><u>Granted Items</u></b><br><ul>`;
  html += singlesHtml.join("");
  html += `</ul>`;

  for (const tokens of multiGroups) {
    html += `Select from the following groups:<br><ul>`;
    for (const t of tokens) {
      if (t.toLowerCase() === "or") {
       html += `<span style="background-color:#000;color:#fff;padding:0 3px;">or</span><br>`; // keep the literal “or” divider
      } else {
        const i    = await fromUuid(t);
        const name = i?.name ?? "";
        let desc = i?.system?.description ?? "";
		desc = desc.replace("<p>","").replace("</p>","");
        html += `<li><b>${name}</b>: ${desc}</li>`;
      }
    }
    html += `</ul>`;
  }
  
  // dont show granted items if none assigned
  if(html.length> 5) {
	  html = `<b><u>Granted Items</u></b><br><ul>` + html ;
  } else {
	  html = "";
  }

  return html;
}



function getItemSkillRanks(item) {
  // Collect skills from item attributes
  const skills = [];
  
  // Find all attributes with modtype = "SkillRank"
  for (const [key, attr] of Object.entries(item.system.attributes || {})) {
    if (attr.modtype === "Skill Rank") {
      skills.push(attr.mod);
    }
  }
  
  // Return formatted message based on number of skills found
  if (skills.length === 0) {
    return "";
  } else if (skills.length === 1) {
    return `<li><b>Starting Skills:</b> ${item.name} begins with one rank in ${skills[0]}. You still cannot train Coercion above rank 2 during character creation.</li>`;
  } else {
    // Format list with "and" before the last item
    const lastSkill = skills.pop();
    const skillList = skills.length ? `${skills.join(", ")} and ${lastSkill}` : lastSkill;
    
    return `<li><b>Starting Skills:</b> ${item.name} begins with one rank in each of ${skillList}. You still cannot train either skill above rank 2 during character creation.</li>`;
  }
}

/**
 * Format a price value by adding commas for thousands and optionally adding a restriction marker
 * @param {Object} item - The item object
 * @param {number|string} price - The price value to format
 * @returns {string} The formatted price
 */
export function formatPrice(item, price) {
  // Raw rarity value
  const rarity = item?.system?.rarity?.value ?? item.system.stats.rarity.value;

  // Number of [di] markers to display (round *up* for looks)
  const halfRoundedUp = Math.ceil(rarity / 2);
  const dif = '[di]'.repeat(halfRoundedUp);

  // Minimum Wealth allowed: floor(rarity / 2) − 1, but never below 1
  const minWealth = Math.max(1, Math.floor(rarity / 2) - 1);

  return `${dif}<br><span style="font-size:10px;">Min Wealth: ${minWealth}</span>`;
}

// return price range if there is one; format "range: x-y" where x-y is something like 1-100
function getPriceRange(desc) {
  const match = desc.match(/range:\s*(\d+-\d+)/i);
  return match ? match[1] : "";
}

/**
 * Format an array of modifier objects into a CSV string
 * @param {Object} item - The parent item
 * @param {Array} modifiers - Array of modifier objects
 * @returns {string} CSV formatted string of modifiers with ranks
 */
export function formatModifiers(item, modifiers) {
  // If not an array or empty array, return empty string
  if (!Array.isArray(modifiers) || modifiers.length === 0) {
    return '';
  }
  
  // Format each modifier as "name (rank)"
  const formattedModifiers = modifiers.map(mod => {
    if (!mod) return '';
    
    const name = mod.name || 'Unknown';
    const rank = mod.system?.rank || '';
    
    // Only include rank if it exists
    return rank ? `${name} (${rank})` : name;
  });
  
  let output = formattedModifiers.filter(m => m).join(', ');
  const special = item.system?.special?.value;
  if(output && special) output += `<br><i>${item.system?.special?.value}</i>`;
  return output;
}

/**
 * Process a Star Wars FFG skill value to get the proper skill name
 * @param {Object} item - The item with the skill
 * @param {string} skillName - The skill key/value to translate
 * @returns {string} The translated skill name
 */
export function processSkill(item, skillName) {  
  // If no skill value, return empty string
  if (!skillName) return '';
  
  const selectedSkillSet = [...game.settings.storage.get("world").entries()]
      .find(([_, value]) => value.key.includes("starwarsffg.skilltheme"))?.[1].value;
  if (!selectedSkillSet) return skillName;
  const skillLists = [...game.settings.storage.get("world").entries()]
      .find(([_, value]) => value.key.includes("starwarsffg.arraySkillList"))?.[1].value;
  if (!skillLists) return skillName;
  const skills = skillLists.find(obj => obj.id === selectedSkillSet)?.skills;
  const translatedSkillName = skills?.[skillName]?.label || skillName;
  
  return translatedSkillName;
}

/**
 * Process Star Wars FFG first shield for Genesys
 * @param {Object} item - object
 * @param {string} shields - The shield object
 * @returns {string} returns first array element
 */
export function processShields(item, shields) {
  return shields[0];
}

/**
 * Process Star Wars FFG first shield for Genesys
 * @param {desc} string - a text string
 * @returns {string} returns the string wrapped in <p></p> if not already wrapped.
 */
 /*
function addParagraph(desc) {
    if (typeof desc !== 'string') return '';

    // Remove leading/trailing whitespace
    desc = desc.trim();

    // Remove extra opening and closing <p> tags
    desc = desc.replace(/^(<p>\s*)+/, '<p>');
    desc = desc.replace(/(\s*<\/p>)+$/, '</p>');

    // Check if already wrapped with <p>...</p>
    const startsWithP = desc.startsWith('<p>');
    const endsWithP = desc.endsWith('</p>');

    // Wrap missing tags
    if (!startsWithP) desc = '<p>' + desc;
    if (!endsWithP) desc = desc + '</p>';

    return desc;
}
*/

/**
 * Process Star Wars FFG career skills from item attributes
 * @param {Object} item - The career item
 * @param {string} desc - The current description
 * @returns {string} The processed description with career skills list
 */
export function processCareerSkills(item, desc) {
  //let result = addParagraph(desc);
  
  // Check if the item has attributes that contain career skills
  if (item.system && item.system.attributes) {
    const attributes = item.system.attributes;
    const careerSkills = [];
    
    // Collect all career skills from attributes
    for (const attrKey in attributes) {
      const attr = attributes[attrKey];
      
      // Check if this attribute is a Career Skill
      if (attr.modtype === "Career Skill") {
        // Add the skill to our list
        if (attr.mod) {
			let sname = processSkill(item, attr.mod)
          careerSkills.push(`<b>${sname}</b>`);
        }
      }
    }
    
    // If career skills found, format and add them
    if (careerSkills.length > 0) {
      // Format the skills list with proper comma separation and "and"
      let skillsList = "";
      
      if (careerSkills.length === 1) {
        // Single skill, no comma or "and" needed
        skillsList = careerSkills[0];
      } else {
        // Multiple skills, format with commas and "and"
        const lastSkill = careerSkills.pop();
        skillsList = careerSkills.join(", ");
        
        // Add the last skill with "and"
        skillsList += ", and " + lastSkill;
      }
      
      // Append the skills list to the description
      desc += `<br>
	   The ${item.name} counts the following skills as career skills: ${skillsList}.<br>
Before spending experience during character creation,
a ${item.name} may choose four of their career skills
and gain one rank in each of them.

	  `;
    }
  }
  
  // Check for available items flag
  if (item.flags && item.flags["lgs-item-catalog-viewer"] && 
      item.flags["lgs-item-catalog-viewer"].itemAdds) {
    
    const additems = item.flags["lgs-item-catalog-viewer"].itemAdds;
    
    // If there are items to process
    if (Array.isArray(additems) && additems.length > 0) {
      let hasItems = false;
      let itemsList = `<h3 style="padding-top:10px;">Available Items:</h3>\n<ul>`;
      
      // Process each element in the array (which is a CSV of UUIDs)
      for (const csvElement of additems) {
        // Skip empty entries
        if (!csvElement) continue;
        
        // Split the CSV into individual UUIDs
        const uuids = csvElement.split(',').map(uuid => uuid.trim()).filter(uuid => uuid);
        
        // Process each UUID
        for (const uuid of uuids) {
          // Try to get the item by UUID
          const itemEntity = fromUuidSync(uuid);
          
          if (itemEntity) {
            // Add the item name to the bullet list
            itemsList += `\n  <li>${itemEntity.name}</li>`;
            hasItems = true;
          }
        }
      }
      
      itemsList += "\n</ul>";
      
      // Only add the items list if we found any items
      if (hasItems) {
        desc += "\n\n" + itemsList;
      }
    }
  }
  
  return desc;
}

/**
 * Helper function to get a nested property from an object
 * @param {Object} obj - The object to retrieve from
 * @param {string} path - The dot-notation path to the property
 * @returns {*} The value of the property, or undefined if not found
 */
function getNestedProperty(obj, path) {
  if (!path) return undefined;

  const pathParts = path.split('.');
  let current = obj;

  for (const part of pathParts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

//process description for ship attachments, including heroic abilities
function shipAttachmentDescription(item, desc) {
	const folder = item.folder;

	// if shipattachment is used for heroic abilities, add the cost of the heroic ability to desc.
	if (folder && folder.name && folder.name.toLowerCase().includes("heroic upgrades")) {
		const costLine = `<b>Cost</b>: ${item.system.price.value}<br><br>`;

		// If desc starts with <p>, insert cost line after the first <p>
		if (desc.trim().toLowerCase().startsWith("<p>")) {
			// Insert cost line right after first <p>
			desc = desc.replace(/^<p>/i, `<p>${costLine}`);
		} else {
			// Wrap desc in <p> if not already
			desc = `<p>${desc}</p>`;
			// Ensure no duplicate tags
			desc = desc.replace(/<p>\s*<p>/gi, "<p>").replace(/<\/p>\s*<\/p>/gi, "</p>");
			// Insert cost line before wrapped desc
			desc = `${costLine}${desc}`;
		}
		
	}
	return desc;
}

// Function to replace symbols
export function replaceSymbols(string){
    // Ensure input is a string
    if (typeof string !== 'string') return string;

    // Use more robust regex to avoid partial matches within words
    // Match [word] or [ww] patterns
    string = string.replace(/\[(th|threat)\]/gi, `<span class="dietype genesys threat">h</span>`);
    string = string.replace(/\[(tr|triumph)\]/gi, `<span class="dietype genesys triumph">t</span>`);
    string = string.replace(/\[(ad|advantage)\]/gi, `<span class="dietype genesys advantage">a</span>`);
    string = string.replace(/\[(fa|failure)\]/gi, `<span class="dietype genesys failure">f</span>`);
    string = string.replace(/\[(su|success)\]/gi, `<span class="dietype genesys success">s</span>`);
    string = string.replace(/\[(de|despair)\]/gi, `<span class="dietype genesys despair">d</span>`);
    string = string.replace(/\[(se|setback)\]/gi, `<span class="dietype starwars setback">b</span>`);
    string = string.replace(/\[(bo|boost)\]/gi, `<span class="dietype starwars boost">b</span>`);
    string = string.replace(/\[(ch|challenge)\]/gi, `<span class="dietype starwars challenge">c</span>`);
    string = string.replace(/\[(di|difficulty)\]/gi, `<span class="dietype starwars difficulty">d</span>`);
    string = string.replace(/\[(pr|proficiency)\]/gi, `<span class="dietype starwars proficiency">c</span>`);

    return string;
}

/**
 * The full field path, followed by the item using the path:function to call
 */
export const fieldProcessors = {
  'system.description': {
    'species': processSpecies,
    'career': processCareerSkills,
	'shipattachment': shipAttachmentDescription,
    // Apply symbol replacement to descriptions for all types using the wildcard
    // Note: This happens *after* species/career specific processing
    '*': (item, desc) => replaceSymbols(desc)
  },
  'system.price.value': {
    'weapon': formatPrice,
    '*': formatPrice
  },
  'system.adjusteditemmodifier': {
    '*': formatModifiers
  },
  'system.skill.value': {
    '*': processSkill
  },
  'system.damage.value': {
    'weapon': processWeaponDamage
  },
  'system.attributes.Shields.value': {
    'vehicle': processShields
  },
  'system.stats.cost.value': {
    'vehicle': formatPrice
  }
};
