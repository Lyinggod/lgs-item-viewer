# Item Viewer: Adding System-Specific Field Processing

The LGS Item Viewer is designed to be adaptable to various Foundry VTT game systems. While it provides a default way to display item data based on the fields you configure, sometimes a system requires specific formatting or processing for certain data points before they are shown to the user. This guide explains how to add system-specific processing logic, using a hypothetical "Sample System" as an example.

## Goal

Our goal is to modify how the `system.cost` field is displayed for items of type `gear`, `weapon`, and `armor` in the "Sample System". Instead of just showing the number (e.g., `100`), we want it to display with a currency symbol prepended (e.g., `$100`).

## Steps

1.  **Create the System File:**
    *   Navigate to the `lgs-item-viewer` module directory within your Foundry `modules` folder.
    *   Inside the `lgs-item-viewer` directory, create a new sub-directory named `systems` if it doesn't already exist.
    *   Inside the `systems` directory, create a new file named `sample-system.js`. The filename should ideally correspond to the **System ID** of the game system you are targeting (e.g., `dnd5e.js`, `pf2e.js`). You can find the system ID in its `system.json` manifest file or by typing `game.system.id` in the Foundry console (F12). For this tutorial, we'll assume the ID is `samplesystem`.

2.  **Define the Processing Logic (`sample-system.js`):**
    *   Open the newly created `sample-system.js`.
    *   We need a function that takes the raw value of the `system.cost` field and returns the formatted string. Let's call it `processCost`.

        ```javascript
        /**
         * Processes the cost value for specific item types in the Sample System.
         * Prepends a dollar sign ($) to the cost.
         * @param {Item} item - The item document (often unused but available).
         * @param {*} costValue - The raw cost value from item.system.cost.
         * @returns {string|*} Formatted cost string or original value.
         */
        function processCost(item, costValue) {
          if (costValue === null || costValue === undefined) {
            return costValue; // Return original if no value
          }
          return `$${String(costValue)}`; // Prepend $
        }
        ```

    *   Now, we need to tell the Item Viewer *when* to use this function. We do this by exporting a `fieldProcessors` object. This object's keys are the **dot-notation paths** to the item fields we want to process. The values are *another* object where keys are **item types** and values are the processing functions.

        ```javascript
        // Export the main configuration object for this system
        export const fieldProcessors = {
          // Target the 'system.cost' field path
          'system.cost': {
            // When the item type is 'gear', use the processCost function
            'gear': processCost,
            // When the item type is 'weapon', use processCost
            'weapon': processCost,
            // When the item type is 'armor', use processCost
            'armor': processCost
            // You could use '*' as a wildcard for all types:
            // '*': processCost
          }
          // Add other field paths and processors here if needed
        };
        ```

3.  **Register the System File (`system-variations.js`):**
    *   Open the `system-variations.js` file located in the main `lgs-item-viewer` module directory.
    *   **Import:** At the top, add an import statement to bring in the `fieldProcessors` object you just exported from your system file:

        ```javascript
        // ** NEW SYSTEM IMPORT **
        import { fieldProcessors as sampleSystemProcessors } from './systems/sample-system.js';
        ```

    *   **Register:** Scroll down to the `SYSTEM_PROCESSORS` constant. Add a new entry to this object. The key must be the **exact System ID** (lowercase) of your target system, and the value is the imported `fieldProcessors` object:

        ```javascript
        const SYSTEM_PROCESSORS = {
          // ... other systems ...

          // ** NEW SYSTEM REGISTRATION **
          'samplesystem': sampleSystemProcessors,

          // ... potentially more systems ...
        };
        ```
    *   *Optional:* If your system needed a `replaceSymbols` function (for text code replacement), you would import that as well and register it in the `SYSTEM_SYMBOL_REPLACERS` constant similarly.

4.  **Configure Item Viewer Fields:**
    *   In Foundry, go to Module Settings -> LGS Item Viewer -> Define Fields.
    *   Add or configure an Item Type entry named exactly matching one of the types you defined processing for (e.g., `gear`).
    *   Within that Item Type, add a field where the "Object" path is exactly `system.cost`. Give it a user-friendly "Name" like "Cost".

5.  **Test:**
    *   Ensure the "Sample System" (or the system with ID `samplesystem`) is active in your world.
    *   Create items of type `gear`, `weapon`, or `armor` in a compendium configured for one of your Item Viewer tabs. Make sure these items have a numerical value set for their `system.cost` field.
    *   Open the Item Viewer. Navigate to the tab containing your test items.
    *   Observe the "Cost" column for your `gear`/`weapon`/`armor` items. They should now display with the `$` prefix (e.g., `$100`). Items of other types (or items without a `system.cost`) will not be affected by this specific processor.

## Handling More Complex Data (Commentary)

The `processCost` example is straightforward because it deals with a simple value. Sometimes, a field might contain more complex data, like a structured object.

For example, imagine a vehicle item has a field `system.shields` with a value like `{ "fore": 1, "aft": 0, "port": 1, "starboard": 1 }`. Simply adding `system.shields` as a field in the Item Viewer configuration will likely display it as `[object Object]`, which isn't helpful.

To handle this, you would need to follow these steps:

1.  *Define a Processor Function*: Create a function (e.g., `processShields`) in your system-specific file (e.g., `your-system-id.js`).

2.  *Implement Processing Logic*: Inside this `processShields` function, you'll receive the shield object (e.g., `{ "fore": 1, ... }`) as the `value`. Your code needs to parse this object and build a user-friendly string representation, for instance, `"Shields: Fore 1, Aft 0, Port 1, Starboard 1"`.

3.  *Register the Processor*: Within the `fieldProcessors` object that you export from your system file (`your-system-id.js`), you need to specify that for the field path `system.shields` and the item type `vehicle` (or whichever type applies), the `processShields` function should be used. This structure mirrors the `processCost` example shown earlier.

4.  *Import and Register Globally*: Ensure your system file (`your-system-id.js`) containing `processShields` and the updated `fieldProcessors` is correctly imported at the top of `system-variations.js`, and that its `fieldProcessors` are added to the main `SYSTEM_PROCESSORS` constant using your system's ID as the key.

5.  *Configure the Viewer Field*: In the Item Viewer's "Define Fields" settings, add (or ensure you have) a field configured for the `vehicle` item type with the "Object" path set to `system.shields`.

After completing these steps, when the Item Viewer encounters the `system.shields` field for a `vehicle` item, it will execute your custom `processShields` function. The viewer will then display the formatted string (e.g., `"Shields: Fore 1, Aft 0, Port 1, Starboard 1"`) returned by your function, instead of the unhelpful `[object Object]`. This approach allows you to handle arbitrarily complex data structures stored within item fields and present them in a readable format.