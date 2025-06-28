/**
 * system-variations.js
 *
 * This file acts as the central hub for dispatching system-specific logic.
 * It imports processors and symbol replacers from individual system files
 * (like ./systems/ffg-star-wars.js, ./systems/conan-2d20.js, etc.)
 * and provides generic functions (processSystemVariations, replaceSystemSymbols)
 * that the main module code can call without needing to know the specific system.
 *
 * TO ADD SUPPORT FOR A NEW SYSTEM:
 * 1. Create a new file in the `./systems/` directory (e.g., `./systems/your-system-id.js`).
 * 2. Inside that file, define and export a `fieldProcessors` object. This object maps
 *    field paths (like 'system.description') to nested objects, which in turn map
 *    item types (like 'weapon', 'spell', or '*' for all types) to specific
 *    processing functions you write in that file.
 * 3. If your system needs text symbol replacement (e.g., [success] -> icon), define
 *    and export a `replaceSymbols(text)` function in your system file.
 * 4. Import the `fieldProcessors` (and `replaceSymbols`, if applicable) from your
 *    new system file into *this* file (`system-variations.js`).
 * 5. Add your imported `fieldProcessors` to the `SYSTEM_PROCESSORS` constant below,
 *    using your system's ID (e.g., 'your-system-id') as the key.
 * 6. If you have a `replaceSymbols` function, add it to the `SYSTEM_SYMBOL_REPLACERS`
 *    constant below, using your system's ID as the key.
 */

// --- Module State for Loaded Variant ---
let loadedProcessors = null;
let loadedReplacer = null;
let variantLoaded = false; // Flag to prevent multiple load attempts


// --- System-Specific Imports ---
// Import processors and replacers from existing supported systems
//import { fieldProcessors as starWarsFFGProcessors, replaceSymbols as starWarsFFGReplacer } from './systems/ffg-star-wars.js';
//import { fieldProcessors as conan2d20Processors, replaceSymbols as conan2d20Replacer } from './systems/conan-2d20.js';

// ** NEW SYSTEM IMPORT **
// Import the fieldProcessors from our new Sample System file
//import { fieldProcessors as sampleSystemProcessors } from './systems/sample-system.js';
// Note: Sample System does not define a replaceSymbols function in this example.

// --- Core Functions ---

/**
 * Get the current game system ID
 * @returns {string} The ID of the current game system (e.g., 'starwarsffg', 'dnd5e', 'samplesystem')
 */
export function getCurrentSystem() {
  // game.system.id is the standard way Foundry provides the active system's ID
  return game.system.id;
}

/**
 * Finds available system variant files for the current game system.
 * Scans the module's 'systems' directory.
 * @returns {Promise<Array<{filename: string, name: string}>>} A promise resolving to an array of variant objects.
 */
export async function findSystemVariants() {
    const systemId = getCurrentSystem();
    const variants = [];
    const modulePath = `modules/lgs-item-viewer/systems/`; // Path relative to Foundry root

    try {
        // Browse the module's systems directory
        const browseResult = await FilePicker.browse("data", modulePath, { // Added options object
            extensions: [".js"], // Specify to only look for .js files
            wildcard: false      // Don't use wildcard matching, rely on startsWith
        });

        if (browseResult && browseResult.files) {
            for (const filePath of browseResult.files) {
                const filename = filePath.substring(filePath.lastIndexOf('/') + 1); // Get filename from full path

                // Check if the file starts with the system ID and ends with .js
                if (filename.startsWith(systemId) && filename.endsWith('.js')) {
                    try {
                        // Dynamically import the file to get its fullSystemName
                        // The path for dynamic import should be relative to the Foundry root.
                        // filePath from FilePicker.browse is already relative to data path or modules.
                        const importPath = filePath.startsWith('modules/') ? `/${filePath}` : `/modules/lgs-item-viewer/systems/${filename}`;

                        const module = await import(importPath);

                        if (module && typeof module.fullSystemName === 'string') {
                            variants.push({
                                filename: filename, // Store just the filename
                                name: module.fullSystemName
                            });
                            // console.log(`LGS Item Viewer | Found variant: ${filename} - ${module.fullSystemName}`);
                        } else {
                            console.warn(`LGS Item Viewer | File ${filename} (path: ${importPath}) matches pattern but does not export 'fullSystemName'. Skipping.`);
                        }
                    } catch (importError) {
                        console.error(`LGS Item Viewer | Error importing variant file ${filename}:`, importError);
                    }
                }
            }
        } else {
             console.warn(`LGS Item Viewer | Could not browse directory or no files found in ${modulePath}`);
        }
    } catch (browseError) {
        console.error(`LGS Item Viewer | Error browsing for system variants in ${modulePath}:`, browseError);
        ui.notifications.error("Error finding system variant files. Check module path and permissions.");
    }

    return variants;
}

/**
 * Loads the selected system variant file based on the world setting.
 * Populates `loadedProcessors` and `loadedReplacer`.
 */
export async function loadSystemVariant() {
    if (variantLoaded) {
        // console.log("LGS Item Viewer | System variant already load attempt has occurred.");
        return;
    }
    variantLoaded = true; // Mark as attempted

    const systemId = getCurrentSystem();
    let variantFilename = game.settings.get('lgs-item-viewer', 'selectedSystemVariant');
    let moduleImportPath = null;
    let usingDefault = false;

    // If no variant is explicitly selected, try the default filename (systemId.js)
    if (!variantFilename) {
        variantFilename = `${systemId}.js`;
        usingDefault = true;
    }

    moduleImportPath = `/modules/lgs-item-viewer/systems/${variantFilename}`;

    console.log(`LGS Item Viewer | Attempting to load system variant: ${variantFilename} from ${moduleImportPath} ${usingDefault ? '(Default)' : ''}`);

    try {
        const module = await import(moduleImportPath);

        if (module) {
            if (module.fieldProcessors) {
                loadedProcessors = module.fieldProcessors;
                console.log(`LGS Item Viewer | Successfully loaded fieldProcessors from ${variantFilename}`);
            } else {
                console.warn(`LGS Item Viewer | Variant file ${variantFilename} loaded but does not export 'fieldProcessors'.`);
                loadedProcessors = null;
            }

            if (module.replaceSymbols && typeof module.replaceSymbols === 'function') {
                loadedReplacer = module.replaceSymbols;
                console.log(`LGS Item Viewer | Successfully loaded replaceSymbols from ${variantFilename}`);
            } else {
                loadedReplacer = null;
            }
        } else {
            console.error(`LGS Item Viewer | Import returned null or undefined for ${variantFilename}`);
            loadedProcessors = null;
            loadedReplacer = null;
        }

    } catch (error) {
        if (usingDefault && error.message.includes("Failed to fetch dynamically imported module")) { // Common error for missing file
            console.warn(`LGS Item Viewer | Default variant file (${variantFilename}) not found. System-specific processing will be disabled.`);
        } else {
            console.error(`LGS Item Viewer | Error loading system variant file ${variantFilename}. System-specific processing might be disabled or incorrect.`, error);
             ui.notifications.error(`Failed to load system variant '${variantFilename}'. Check console (F12).`, { permanent: true });
        }
        loadedProcessors = null;
        loadedReplacer = null;
    }
}


/**
 * Process an item field's value based on the current game system,
 * the specific field being processed, and the item's type.
 *
 * This function looks up the appropriate processing function in the
 * SYSTEM_PROCESSORS map and executes it.
 *
 * @param {Item} item - The item document whose field is being processed.
 * @param {string} field - The dot-notation path to the field (e.g., "system.description", "system.cost").
 * @param {*} value - The current raw value of the field from the item data.
 * @returns {*} The processed value. If no specific processor is found, returns the original value.
 */
export function processSystemVariations(item, field, value) {
  const systemProcessorSet = loadedProcessors;
  if (!systemProcessorSet) return value;

  const fieldProcessor = systemProcessorSet[field];
  if (!fieldProcessor) return value;

  const itemType = item.type;
  const typeProcessor = fieldProcessor[itemType] || fieldProcessor['*'];

  if (!typeProcessor || typeof typeProcessor !== 'function') return value;

  try {
      return typeProcessor(item, value);
  } catch (error) {
      console.error(`LGS Item Viewer | Error processing field "${field}" for item type "${itemType}" using loaded variant:`, error);
      return value;
  }
}

/**
 * Replaces system-specific symbols/codes in a string if the current system
 * has registered a symbol replacement function.
 *
 * @param {string} text - The input string potentially containing symbols.
 * @returns {string} The processed string with symbols replaced, or the original string if no replacer is defined or needed.
 */
export function replaceSystemSymbols(text) {
    if (!text || typeof text !== 'string') return text;

    const replacerFunction = loadedReplacer;
    if (replacerFunction && typeof replacerFunction === 'function') {
        try {
            return replacerFunction(text);
        } catch (error) {
            console.error(`LGS Item Viewer | Error executing loaded symbol replacer:`, error);
            return text;
        }
    }
    return text;
}

/**
 * Helper function to get a nested property from an object using dot notation.
 * Useful for safely accessing potentially deep properties in item data.
 *
 * @param {Object} obj - The object to retrieve from.
 * @param {string} path - The dot-notation path (e.g., "system.details.level.value").
 * @returns {*} The value of the property, or undefined if the path is invalid or doesn't exist.
 */
export function getNestedProperty(obj, path) {
  if (!obj || !path) return undefined;

  const pathParts = path.split('.');
  let current = obj;

  for (const part of pathParts) {
    if (current === undefined || current === null || typeof current !== 'object') {
        return undefined;
    }
    current = current[part];
  }
  return current;
}

// --- System Registries ---

/**
 * System field processors registry.
 * Maps system IDs (lowercase) to their `fieldProcessors` object.
 * The `fieldProcessors` object is imported from the system-specific file.
 */
/*
const SYSTEM_PROCESSORS = {
  // Star Wars FFG system
  'starwarsffg': starWarsFFGProcessors,

  // Conan 2d20 system
  'conan2d20': conan2d20Processors,

  // ** NEW SYSTEM REGISTRATION **
  // Add the imported processors for the Sample System.
  // Make sure the key ('samplesystem') matches the actual ID of the game system.
  'samplesystem': sampleSystemProcessors,

  // Add more systems here as needed:
  // 'dnd5e': dnd5eProcessors,
  // 'pathfinder2e': pf2eProcessors,
};
*/
/**
 * System symbol replacers registry.
 * Maps system IDs (lowercase) to their `replaceSymbols` function.
 * The `replaceSymbols` function is imported from the system-specific file.
 */
 /*
const SYSTEM_SYMBOL_REPLACERS = {
    'starwarsffg': starWarsFFGReplacer,
    'conan2d20': conan2d20Replacer
    // 'conan2d20': conanReplacer, // If Conan ever needed one

    // ** NEW SYSTEM SYMBOL REPLACER (Example if needed) **
    // 'samplesystem': sampleSystemReplacer, // Only add if sample-system.js exported a replaceSymbols function

    // Add more systems here if they have a replaceSymbols function
};
*/