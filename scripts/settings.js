import { TabConfigDialog } from './tab-config-dialog.js';
import { FieldConfigDialog } from './field-config-dialog.js';
import { findSystemVariants } from './system-variations.js'; // Assuming it will be defined there

/**
 * Register all module settings
 */
export function registerSettings() {
  // --- Existing Settings (Tab, Field, DisplayStatus, etc.) ---

  // Tab Configuration
  game.settings.register('lgs-item-viewer', 'tabConfiguration', {
    name: 'Tab Configuration',
    scope: 'world',
    config: false,
    type: Array,
    default: [
      { name: 'Archetype', source: 'Archetype' },
      { name: 'Career', source: 'Career' },
      { name: 'Abilities', source: 'Abilities' },
      { name: 'Talents', source: 'Talents' },
      { name: 'Equipment', source: 'Equipment' }
    ]
  });

  // Field Configuration
  game.settings.register('lgs-item-viewer', 'fieldConfiguration', {
    name: 'Field Configuration',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  // Display Status (for + or - view)
  game.settings.register('lgs-item-viewer', 'displayStatus', {
    name: 'Display Status',
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });

   // Register setting for table orders
  game.settings.register('lgs-item-viewer', 'tableOrders', {
    name: 'Table Orders',
    hint: 'Stores the custom ordering of tables for each tab',
    scope: 'world',     // This setting is the same for all users
    config: false,      // This setting doesn't appear in the configuration view
    type: Object,
    default: {}
  });

  // Register setting for folder orders
  game.settings.register('lgs-item-viewer', 'folderOrders', {
    name: 'Folder Orders',
    hint: 'Stores the custom ordering of folder filters for each tab',
    scope: 'world',     // This setting is the same for all users
    config: false,      // This setting doesn't appear in the configuration view
    type: Object,
    default: {}
  });

  // Register new setting for description field name
  game.settings.register('lgs-item-viewer', 'descriptionFieldName', {
    name: "Description Field Name",
    hint: "Description field name such as 'system.description', 'system.description.value', etc",
    scope: "world",
    config: true,
    type: String,
    default: "system.description",
    restricted: true  // GM only
  });

  // register defining currency symbol
  game.settings.register('lgs-item-viewer', 'currencySymbol', {
    name: "Currency Symbol",
    hint: "Symbol to be used for currency such as $",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  // register store currenty symbol location (left or right)
  game.settings.register('lgs-item-viewer', 'currencySymbolLocation', {
    name: "Currency Symbol Location",
    hint: "Select side that currency symbol appears on.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "$#": "$#",
      "#$": "#$"
    },
    default: "$#"
  });

  // Register new setting to control GM visibility of hidden folders
  game.settings.register('lgs-item-viewer', 'hideGmHiddenFolders', {
      name: "Hide 'Hidden' Folders from GM",
      hint: "If checked, folders marked with (-) in their name will also be hidden from the GM view in the Item Viewer.",
      scope: "world", // Or "client" if preferred per-GM
      config: true,
      type: Boolean,
      default: false,
      restricted: true // Only GMs can change this setting
  });

  game.settings.register('lgs-item-viewer', 'itemSupportDisplay', {
    name: "Item Support Display as:",
    hint: "Select how folder and tag support options are displayed",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "collapsable": "Collapsable",
      "journalPage": "Journal Pill"
    },
    default: "collapsable"
  });

  // Add Journal Dialog Width setting
  game.settings.register('lgs-item-viewer', 'journalDialogWidth', {
    name: "Journal Page Dialog Width",
    hint: "Set width of Journal Button Dialog width in pixels",
    scope: "world",
    config: true,
    type: Number,
    default: 600
  });

  // Add Journal Dialog Height setting
  game.settings.register('lgs-item-viewer', 'journalDialogHeight', {
    name: "Journal Page Dialog Height",
    hint: "Set height of Journal Button Dialog height in pixels",
    scope: "world",
    config: true,
    type: Number,
    default: 500
  });

  // --- NEW Setting: Selected System Variant ---
  game.settings.register('lgs-item-viewer', 'selectedSystemVariant', {
    name: 'Selected System Variant File',
    hint: 'Stores the filename of the chosen system variant.',
    scope: 'world',
    config: false, // Not directly configurable, uses the menu below
    type: String,
    default: '', // Default is empty, logic will try to load system.id.js
    onChange: () => { // Optional: Notify user on change
        ui.notifications.info("System variant setting changed. A reload (F5) is required for changes to take effect.", { permanent: true });
    }
  });


  // --- Existing Menu Registrations ---
  game.settings.registerMenu('lgs-item-viewer', 'tabConfig', {
    name: 'Configure Item Viewer Tabs', // Adjusted name slightly for clarity
    label: 'Configure Tabs', // Shorter label
    hint: 'Configure item viewer tabs',
    icon: 'fas fa-folder',
    type: TabConfigMenu,
    restricted: true
  });

  // Register the menu settings for configuring fields
  game.settings.registerMenu('lgs-item-viewer', 'fieldConfig', {
    name: 'Define Fields',
    label: 'Define Fields',
    hint: 'Define item fields',
    icon: 'fas fa-list',
    type: FieldConfigMenu,
    restricted: true
  });

/*
   game.settings.registerMenu('lgs-item-viewer', 'configureFieldsAnalyzer', {
    name: 'Configure Fields Analyzer', // Name for the new tool
    label: 'Configure Fields', // Button label in settings
    hint: 'Analyze Actor/Item system data fields containing numbers.',
    icon: 'fas fa-cogs', // Or fas fa-search, fas fa-table
    type: ConfigureFieldsMenu, // Wrapper class defined below
    restricted: true // GM only
  });
*/
  // --- NEW Menu: System Variant Configuration ---
  game.settings.registerMenu('lgs-item-viewer', 'systemVariantConfig', {
    name: 'Select System Rules Variant',
    label: 'Select System Variant',
    hint: 'Choose which rules variant file to use for system-specific processing.',
    icon: 'fas fa-code-branch', // Example icon
    type: SystemVariantConfigMenu, // Use the new class below
    restricted: true // GM only
  });

}

/**
 * Simple menu class to launch the ConfigureFieldsDialog
 */
class ConfigureFieldsMenu extends FormApplication {
  /** @override */
  constructor(object = {}, options = {}) {
    super(object, options);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'configure-fields-analyzer-menu',
      title: 'Configure Fields Analyzer Launcher',
      template: null, // No template needed for a launcher
      classes: ['form'],
      width: 100, // Small, doesn't matter as it just launches dialog
      height: 'auto',
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  /** @override */
  async render(force=false, options={}) {
    // Instead of rendering this form, render the actual dialog
    new ConfigureFieldsDialog().render(true);
  }

   /** @override */
   async _updateObject(event, formData) {
     // No action needed for a launcher menu
   }
}

/**
 * Menu class for the Tab Configuration dialog
 */
class TabConfigMenu extends FormApplication {
  /** @override */
  constructor(object, options) {
    super(object, options);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'tab-config-menu',
      title: 'Tab Configuration',
      template: null,
      classes: ['form'],
      width: 400,
      height: 'auto',
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  /** @override */
  async render() {
    new TabConfigDialog().render(true);
  }
}

/**
 * Menu class for the Field Configuration dialog
 */
class FieldConfigMenu extends FormApplication {
  /** @override */
  constructor(object, options) {
    super(object, options);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'field-config-menu',
      title: 'Field Configuration',
      template: null,
      classes: ['form'],
      width: 500,
      height: 'auto',
      submitOnChange: false,
      closeOnSubmit: true
    });
  }

  /** @override */
  async render() {
    new FieldConfigDialog().render(true);
  }
}


// --- SystemVariantConfigMenu Class (Completely Replaced) ---
class SystemVariantConfigMenu extends FormApplication {
  constructor(object = {}, options = {}) {
    super(object, options);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'lgs-item-viewer-system-variant-config',
      title: 'Select System Rules Variant',
      template: null, // We'll build HTML in _renderInner
      classes: ['form', 'lgs-item-viewer-settings'],
      width: 500,
      height: 'auto',
      closeOnSubmit: false, // Keep open to show reload notice
      submitOnChange: false,
    });
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const systemId = game.system.id;
    data.systemId = systemId;
    data.variants = await findSystemVariants(); // Fetch available variants dynamically
    data.currentVariant = game.settings.get('lgs-item-viewer', 'selectedSystemVariant');
    // Determine the default filename
    data.defaultVariantFile = `${systemId}.js`;
    data.isDefaultAvailable = data.variants.some(v => v.filename === data.defaultVariantFile);

    // Sort variants alphabetically by name for the dropdown
    data.variants.sort((a, b) => a.name.localeCompare(b.name));

    return data;
  }

  async _renderInner(data) {
    let html = `
      <form>
        <div class="form-group">
          <label for="system-variant-select">Select Rules Variant for '${data.systemId}':</label>
          <select id="system-variant-select" name="selectedVariant">
    `;

    const currentActualSelection = data.currentVariant || (data.isDefaultAvailable ? data.defaultVariantFile : "");

    // Option for Default
    if (data.isDefaultAvailable) {
        const defaultVariantDetails = data.variants.find(v => v.filename === data.defaultVariantFile) || { name: `Default Rules (${data.defaultVariantFile})`, filename: data.defaultVariantFile };
        html += `<option value="${defaultVariantDetails.filename}" ${currentActualSelection === defaultVariantDetails.filename ? 'selected' : ''}>
                     ${defaultVariantDetails.name}
                 </option>`;
    } else if (!data.variants.length) { // No variants found at all
        html += `<option value="" selected>-- No Variants Found for this System --</option>`;
    }


    // Add options for other detected variants
    data.variants.forEach(variant => {
      if (variant.filename === data.defaultVariantFile) return; // Already handled

      html += `<option value="${variant.filename}" ${currentActualSelection === variant.filename ? 'selected' : ''}>
                   ${variant.name} (${variant.filename})
               </option>`;
    });

    // Option to Disable/Clear Selection (if a variant is selected or if default isn't the only option)
    if (currentActualSelection !== "" || (data.variants.length > 1 || (data.variants.length === 1 && !data.isDefaultAvailable))) {
         html += `<option value="" ${currentActualSelection === "" ? 'selected' : ''}>-- Disable Variant Processing --</option>`;
    } else if (data.variants.length === 0 && !data.isDefaultAvailable) {
        // If truly no options, this was covered by "No Variants Found"
    } else if (!data.isDefaultAvailable && data.variants.length === 0 && currentActualSelection === ""){
        // No default, no variants, current is "", this is already the selected state for "disable"
         html += `<option value="" selected>-- No Variant Selected --</option>`;
    }


    html += `
          </select>
        </div>
        <p class="notes">
          Select the rules variant file to use for system-specific item processing. Files must be located in the module's 'systems' folder and start with '${data.systemId}'. They must also export a 'fullSystemName'.
        </p>
        <p class="warning" style="color: orange; font-weight: bold;">
          <i class="fas fa-exclamation-triangle"></i> A game world reload (F5) is required for changes to take effect.
        </p>
      </form>
    `;
    return $(html);
  }

  activateListeners(html) {
      super.activateListeners(html);
      // Use this.element (the application's root jQuery object) to find the form
      this.form = this.element.find('form')[0]; // Get the raw DOM element

      if (!this.form) {
          console.error("LGS Item Viewer | Failed to find form element in activateListeners for SystemVariantConfigMenu.");
      }
  }


  async _updateObject(event, formData) {
    console.log("LGS Item Viewer | _updateObject triggered for SystemVariantConfigMenu");
    if (!formData) {
        console.error("LGS Item Viewer | formData is missing in _updateObject!");
        return;
    }
    console.log("LGS Item Viewer | formData received:", formData);

    const selectedValue = formData.selectedVariant;
    if (selectedValue === undefined) {
        console.error("LGS Item Viewer | 'selectedVariant' key not found in formData!", formData);
        ui.notifications.error("Could not read selected variant value. Check console (F12).");
        return;
    }

    const currentSetting = game.settings.get('lgs-item-viewer', 'selectedSystemVariant');

    console.log(`LGS Item Viewer | Current Setting: '${currentSetting}'`);
    console.log(`LGS Item Viewer | Selected Value from Form: '${selectedValue}'`);
    console.log(`LGS Item Viewer | Comparing values... Are they different? ${selectedValue !== currentSetting}`);

    if (selectedValue !== currentSetting) {
      console.log(`LGS Item Viewer | Setting 'selectedSystemVariant' to: ${selectedValue}`);
      try {
          await game.settings.set('lgs-item-viewer', 'selectedSystemVariant', selectedValue);
          console.log("LGS Item Viewer | game.settings.set successfully completed.");

           const updatedSetting = game.settings.get('lgs-item-viewer', 'selectedSystemVariant');
           console.log(`LGS Item Viewer | Setting value immediately after set: '${updatedSetting}'`);
           if (updatedSetting !== selectedValue) {
               console.error("LGS Item Viewer | CRITICAL: Setting did not update immediately after set! Possible caching or permission issue?");
                ui.notifications.error("Failed to verify setting update immediately. Check console (F12).", { permanent: true });
           }

          Dialog.confirm({
            title: "Reload Required",
            content: "<p>The System Rules Variant setting has been changed.</p><p>A world reload is required for the change to take effect. Reload now?</p>",
            yes: () => {
                console.log("LGS Item Viewer | Reloading window now...");
                window.location.reload();
            },
            no: () => {
                console.log("LGS Item Viewer | User chose not to reload.");
                 ui.notifications.warn("Reload required for system variant changes to take effect.");
                 this.close();
            },
            defaultYes: true
          });
      } catch (error) {
          console.error("LGS Item Viewer | Error during game.settings.set:", error);
          ui.notifications.error("Failed to save system variant setting. Check console (F12).");
      }
    } else {
      console.log("LGS Item Viewer | System variant selection unchanged. Closing dialog.");
      ui.notifications.info("System variant selection was not changed.");
      this.close();
    }
  }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        if (!buttons.find(b => b.class === "save")) {
            buttons.unshift({
                label: "Save",
                class: "save",
                icon: "fas fa-save",
                onclick: ev => {
                     if (this.form) {
                         this._onSubmit(ev, {preventClose: true, preventRender: true});
                     } else {
                         console.error("LGS Item Viewer | Save button clicked, but this.form is not set!");
                         ui.notifications.error("Form element not found. Cannot save. Please report this error.");
                     }
                }
            });
        }
        return buttons;
    }
}