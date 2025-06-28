/**
 * systems/sample-system.js
 *
 * LGS Item Viewer modifications for the "Sample System".
 *
 * This file defines system-specific logic for how item data should be processed
 * before being displayed in the Item Viewer.
 *
 * It exports a `fieldProcessors` object which is imported by the main
 * `system-variations.js` file and registered under the 'samplesystem' key.
 */

/**
 * Processes the cost value for specific item types in the Sample System.
 * Prepends a dollar sign ($) to the cost.
 *
 * @param {Item} item - The item document (unused in this specific function, but standard practice).
 * @param {*} costValue - The raw cost value from the item data (e.g., item.system.cost).
 * @returns {string|*} The cost value formatted as a string with a leading "$",
 *                    or the original value if it's null or undefined.
 */
function processCost(item, costValue) {
  // Check if the cost value exists
  if (costValue === null || costValue === undefined) {
    return costValue; // Return original if no value
  }

  // Convert to string (if it's a number) and prepend '$'
  return `$${String(costValue)}`;
}

// --- Field Processor Definitions ---

/**
 * The `fieldProcessors` object maps field paths (like 'system.cost')
 * to further objects. These nested objects map item types (like 'gear', 'weapon')
 * to the specific function that should process that field *for that item type*.
 *
 * The '*' key can be used as a wildcard to apply a processor to all item types
 * for that field, unless a more specific type is defined.
 */
export const fieldProcessors = {
  // --- system.cost ---
  // Define processors for the 'system.cost' field path.
  'system.cost': {
    // For items of type 'gear', use the 'processCost' function.
    'gear': processCost,
    // For items of type 'weapon', also use the 'processCost' function.
    'weapon': processCost,
    // For items of type 'armor', also use the 'processCost' function.
    'armor': processCost,
    // If we wanted to apply this to ALL items that have a system.cost,
    // we could potentially just use a wildcard:
    // '*': processCost
  },

  // --- Example: Processing Description ---
  // 'system.description': {
  //   'spell': processSpellDescription, // A function specific to spell descriptions
  //   '*': makeBold                  // A generic function for all other descriptions
  // },

  // Add more field paths and their type-specific processors here as needed.
};

// --- Optional: Symbol Replacer ---
/*
 * If this system used text codes (e.g., "[dmg]" for a damage icon),
 * you would define and export a replaceSymbols function here:
 *
 * export function replaceSymbols(text) {
 *   if (typeof text !== 'string') return text;
 *   text = text.replace(/\[dmg\]/gi, '<i class="fas fa-bomb"></i>');
 *   // ... add other replacements ...
 *   return text;
 * }
 *
 * And then make sure it's imported and registered in `system-variations.js`.
 */