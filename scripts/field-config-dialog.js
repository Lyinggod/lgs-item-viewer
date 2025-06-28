//filename: field-config-dialog.js

/**
 * Dialog for configuring item fields
 */
export class FieldConfigDialog extends Dialog {
  /** @override */
  constructor(dialogData = {}, options = {}) {
    // --- MODIFICATION START: Filter out 'JournalEntry' from config before generating HTML ---
    const currentConfigRaw = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
    const currentConfig = currentConfigRaw.filter(config => config.type.toLowerCase() !== 'journalentry');
    // --- MODIFICATION END ---


    // Generate item type HTML based on the *filtered* config
    const itemTypeHtml = FieldConfigDialog.generateItemTypeHtml(currentConfig);

    // Get the description field name from settings (still needed for defaults)
    const descriptionFieldName = game.settings.get('lgs-item-viewer', 'descriptionFieldName');

    const content = `
    <form id="field-config-form" class="field-configuration">
    <div class="buttonOptions" style="float:right">
      <button type="button" id="add-item-type-button" class="add-button"><i class="fas fa-plus" title="Add New Item Type"></i> Add Item Type</button>
      <button type="button" id="export-config-button" class="export-button"><i class="fas fa-download" title="Export Data"></i></button>
      <button type="button" id="import-config-button" class="import-button"><i class="fas fa-upload" title="Import Data"></i></button>
    </div>

      <details style="padding-bottom:22px">
      <summary>
      Help
      </summary>
      <b>Item Type</b>: this is the type field from the item (ie item.type). Cannot be 'JournalEntry'.<br>
      <b>Name</b>: The name of the header for table view in the viewer.<br>
      <b>Object</b>: The full object reference. Must be either "name" or starting with "system" (ie ${descriptionFieldName}).<br>
      <b>Sort</b>: The priority of sorting in table view, higher numbers sort after lower numbers.<br>
      <b>!Center</b>: (aka "Not Centered") In Grid View, anything checked is left aligned.<br>
      <br><b>Note</b>: Journals not not need to be defined as an item type. 
      </details>
      <div id="item-type-container" class="item-type-container">
        ${itemTypeHtml}
      </div>
    </form>
  `;

    // Configure dialog data
    super({
      title: "Configure Fields (Excluding Journals)", // Updated title
      content: content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
          callback: html => this._onSave(html)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "save",
      close: () => { }
    }, options);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: "auto",
      height: "auto",
      resizable: true,
      classes: ["dialog", "field-config-dialog"],
      minimizable: false
    });
  }

  /**
   * Generate HTML for item types based on current configuration
   * @param {Array} config - The current field configuration (already filtered)
   * @returns {string} - HTML for item type sections
   */
  static generateItemTypeHtml(config) {
    // Note: config is already filtered to exclude 'journalentry' by the constructor
    if (!config || config.length === 0) {
      return '<p>No configurable item types found. Add a new one (cannot be "JournalEntry").</p>'; // Updated message
    }

    let html = '';
    // The typeIndex here correctly corresponds to the index in the *filtered* config array
    for (let typeIndex = 0; typeIndex < config.length; typeIndex++) {
      const itemType = config[typeIndex];

      let fieldsHtml = `<div class="field-row header-row">
        <div style="width:163px;" class="field-cell">Name</div>
        <div style="width:168px;" class="field-cell">Object</div>
        <div style="width:40px;" class="field-cell">Sort</div>
        <div style="width:40px;" class="field-cell">!Center</div>
      </div>`; // Added header-row class for non-draggable header

      // The fieldIndex corresponds to the index within this specific itemType's fields array
      for (let fieldIndex = 0; fieldIndex < itemType.fields.length; fieldIndex++) {
        const field = itemType.fields[fieldIndex];
        // Use the correct indices based on the loops over the filtered config
        fieldsHtml += `
          <div class="field-row" data-type-index="${typeIndex}" data-field-index="${fieldIndex}" draggable="true">
            <div class="field-cell">
              <input type="text" name="config[${typeIndex}].fields[${fieldIndex}].name" value="${field.name}" placeholder="Field Name" required>
            </div>
            <div class="field-cell">
              <input type="text" name="config[${typeIndex}].fields[${fieldIndex}].object" value="${field.object}" placeholder="Object Path" required>
            </div>
            <div class="field-cell">
              <input type="number" name="config[${typeIndex}].fields[${fieldIndex}].sortIndex" value="${field.sortIndex || ''}" placeholder="Sort" style="width: 40px;">
            </div>
            <div class="field-cell">
                <input type="checkbox" name="config[${typeIndex}].fields[${fieldIndex}].alignLeft" ${field.alignLeft ? 'checked' : ''}>
            </div>
            <div class="field-cell">
              <button type="button" class="delete-field-button" title="Delete Field"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `;
      }

      // Use the correct typeIndex based on the loop over the filtered config
      html += `
        <div class="item-type-section" data-type-index="${typeIndex}">
          <div class="item-type-header">
            <div class="type-name-container">
              Item Type <input type="text" style="width: 340px;" name="config[${typeIndex}].type" value="${itemType.type}" placeholder="Item Type (not JournalEntry)" required>
            </div>
            <div class="type-actions">
              <button type="button" class="add-field-button" data-type-index="${typeIndex}" title="Add Field"><i class="fas fa-plus"></i></button>
              <button type="button" class="delete-type-button" title="Delete Item Type"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="field-rows">
            ${fieldsHtml}
          </div>
        </div>
      `;
    }

    return html;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    this._onRender(html);
  }

  /**
   * Manually position the dialog to center it on screen
   */
  _positionDialog() {
    // Check if the element exists before trying to position
    if (!this.element || this.element.length === 0) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const dialogWidth = this.element.width() || 500;
    const dialogHeight = this.element.height() || 400;

    const left = Math.max(0, (windowWidth - dialogWidth) / 2);
    const top = Math.max(0, (windowHeight - dialogHeight) / 2);

    // Ensure setPosition is called only if dialog is rendered
    if (this.rendered) {
       this.setPosition({left, top});
    }
  }

  /**
   * Actions to perform when the dialog is rendered
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
  _onRender(html) {
    // Position dialog in center
    // Use a small delay to ensure dimensions are calculated after render
    setTimeout(() => this._positionDialog(), 50);

    // Add new item type
    html.find('#add-item-type-button').click(() => {
      const container = html.find('#item-type-container');
      // typeIndex is based on the *currently rendered* sections (which exclude journals)
      const typeIndex = container.find('.item-type-section').length;

      // Get the description field name from settings
      const descriptionFieldName = game.settings.get('lgs-item-viewer', 'descriptionFieldName');

      const newItemTypeHtml = `
      <div class="item-type-section" data-type-index="${typeIndex}">
        <div class="item-type-header">
          <div class="type-name-container">
           Item Type <input type="text" style="width:340px" name="config[${typeIndex}].type" placeholder="Item Type (not JournalEntry)" required>
          </div>
          <div class="type-actions">
            <button type="button" class="add-field-button" data-type-index="${typeIndex}" title="Add Field"><i class="fas fa-plus"></i></button>
            <button type="button" class="delete-type-button" title="Delete Item Type"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="field-rows">
        <div class="field-row header-row">
          <div style="width:163px;" class="field-cell">Name</div>
          <div style="width:168px;" class="field-cell">Object</div>
          <div style="width:40px;" class="field-cell">Sort</div>
          <div style="width:40px;" class="field-cell">!Center</div>
        </div>
        <div class="field-row" data-type-index="${typeIndex}" data-field-index="0" draggable="true">
          <div class="field-cell">
            <input type="text" name="config[${typeIndex}].fields[0].name" value="Name" placeholder="Field Name" required>
          </div>
          <div class="field-cell">
            <input type="text" name="config[${typeIndex}].fields[0].object" value="name" placeholder="Object Path" required>
          </div>
          <div class="field-cell">
            <input type="number" name="config[${typeIndex}].fields[0].sortIndex" value="" placeholder="Sort" style="width: 40px;">
          </div>
          <div class="field-cell">
            <label>
              <input type="checkbox" name="config[${typeIndex}].fields[0].alignLeft">
            </label>
          </div>
          <div class="field-cell">
            <button type="button" class="delete-field-button" title="Delete Field"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="field-row" data-type-index="${typeIndex}" data-field-index="1" draggable="true">
          <div class="field-cell">
            <input type="text" name="config[${typeIndex}].fields[1].name" value="Description" placeholder="Field Name" required>
          </div>
          <div class="field-cell">
            <input type="text" name="config[${typeIndex}].fields[1].object" value="${descriptionFieldName}" placeholder="Object Path" required>
          </div>
          <div class="field-cell">
            <input type="number" name="config[${typeIndex}].fields[1].sortIndex" value="" placeholder="Sort" style="width: 40px;">
          </div>
          <div class="field-cell">
            <label>
              <input type="checkbox" name="config[${typeIndex}].fields[1].alignLeft">
            </label>
          </div>
          <div class="field-cell">
            <button type="button" class="delete-field-button" title="Delete Field"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        </div>
      </div>
    `;

      container.append(newItemTypeHtml);

      // Setup drag-and-drop for the new field rows
      const typeSection = container.find(`.item-type-section[data-type-index="${typeIndex}"]`);
      this._setupFieldDragListeners(typeSection);

      // Position after adding
      this._positionDialog();
    });

    // Export configuration
    html.find('#export-config-button').click(() => {
      // --- MODIFICATION: Export only non-JournalEntry configurations ---
      const currentConfigRaw = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
      const exportableConfig = currentConfigRaw.filter(config => config.type.toLowerCase() !== 'journalentry');
      // --- MODIFICATION END ---
      const configJson = JSON.stringify(exportableConfig, null, 2);

      // Create a dialog to display the exported data
      const exportDialog = new Dialog({
        title: "Export Configuration", 
        content: `
        <form>
            <label>Copy this configuration data:</label>
          <div class="form-group">
            <textarea style="height: 300px; font-family: monospace;" readonly>${configJson}</textarea>
          </div>
        </form>
        <p class="notes">Note: 'JournalEntry' configurations are handled automatically and are not included in this export.</p>
      `,
       buttons: {
            copy: {
                icon: '<i class="fas fa-copy"></i>',
                label: "Copy",
                callback: (html) => {
                    const textArea = html.find('textarea')[0];
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        ui.notifications.info("Configuration copied to clipboard.");
                    } catch (err) {
                        ui.notifications.error("Failed to copy configuration.");
                        console.error("Copy failed: ", err);
                    }
                }
            },
            close: {
                icon: '<i class="fas fa-times"></i>',
                label: "Close"
            }
        },
        default: "close"
      });

      exportDialog.render(true);
    });

    // Import configuration
    html.find('#import-config-button').click(() => {
      // Create a dialog to import data
      const importDialog = new Dialog({
        title: "Import Configuration",
        content: `
        <form>
          <label>Paste configuration data here:</label>
          <div class="form-group">
            <textarea id="import-config-data" style="height: 300px; font-family: monospace;"></textarea>
          </div>
           <p class="notes">Note: Any 'JournalEntry' configurations in the pasted data will be ignored.</p>
        </form>
      `,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: "Import", // Changed label for clarity
            callback: async (html) => { // Make async for await
              try {
                const importData = html.find('#import-config-data').val();
                let importedConfig = JSON.parse(importData);

                // Validate the imported data (simple check)
                if (!Array.isArray(importedConfig)) {
                  ui.notifications.error("Invalid configuration format. Expected an array.");
                  return false; // Prevent dialog close on error
                }
                 // Add more specific validation if needed
                if (importedConfig.some(type => typeof type.type !== 'string' || !Array.isArray(type.fields))) {
                    ui.notifications.error("Invalid configuration format. Each type must have a 'type' (string) and 'fields' (array).");
                    return false;
                }

                // --- MODIFICATION START: Filter out JournalEntry from imported data ---
                const originalLength = importedConfig.length;
                importedConfig = importedConfig.filter(config => config.type.toLowerCase() !== 'journalentry');
                const journalsIgnored = originalLength > importedConfig.length;
                // --- MODIFICATION END ---

                // --- MODIFICATION START: Merge with existing non-journal config (optional, but safer) ---
                // Get existing non-journal config
                const currentConfigRaw = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
                const existingNonJournalConfig = currentConfigRaw.filter(config => config.type.toLowerCase() !== 'journalentry');

                // Create a map of existing types for easy lookup
                const existingTypesMap = new Map(existingNonJournalConfig.map(config => [config.type.toLowerCase(), config]));

                // Merge imported config, overwriting existing non-journal types if they exist in import
                importedConfig.forEach(importedType => {
                    existingTypesMap.set(importedType.type.toLowerCase(), importedType);
                });

                // Convert map back to array
                const finalMergedConfig = Array.from(existingTypesMap.values());
                // --- MODIFICATION END ---


                // Save the merged and filtered configuration
                await game.settings.set('lgs-item-viewer', 'fieldConfiguration', finalMergedConfig);

                let infoMessage = "Configuration imported successfully.";
                if (journalsIgnored) {
                    infoMessage += " 'JournalEntry' configurations were ignored.";
                }
                infoMessage += " Refreshing...";
                ui.notifications.info(infoMessage);

                // Close the current dialog and reopen a new one
                this.close();
                setTimeout(() => {
                  new FieldConfigDialog().render(true);
                }, 100);

              } catch (err) {
                ui.notifications.error("Error parsing or saving configuration: " + err.message);
                 return false; // Prevent dialog close on error
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "save"
      });

      importDialog.render(true);
    });

    // Add new field to an item type
    html.on('click', '.add-field-button', (event) => {
      const button = event.currentTarget;
      const typeIndex = button.dataset.typeIndex; // Index relative to filtered list
      const typeSection = html.find(`.item-type-section[data-type-index="${typeIndex}"]`);
      const fieldRows = typeSection.find('.field-rows');
      const fieldIndex = fieldRows.find('.field-row:not(.header-row)').length; // Exclude header row from count

      const newFieldHtml = `
      <div class="field-row" data-type-index="${typeIndex}" data-field-index="${fieldIndex}" draggable="true">
        <div class="field-cell">
          <input type="text" name="config[${typeIndex}].fields[${fieldIndex}].name" placeholder="Field Name" required>
        </div>
        <div class="field-cell">
          <input type="text" name="config[${typeIndex}].fields[${fieldIndex}].object" placeholder="Object Path" required>
        </div>
        <div class="field-cell">
          <input type="number" name="config[${typeIndex}].fields[${fieldIndex}].sortIndex" value="" placeholder="Sort" style="width: 40px;">
        </div>
        <div class="field-cell">
          <label>
            <input type="checkbox" name="config[${typeIndex}].fields[${fieldIndex}].alignLeft">
          </label>
        </div>
        <div class="field-cell">
          <button type="button" class="delete-field-button" title="Delete Field"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;

      fieldRows.append(newFieldHtml);

      // Setup drag-and-drop for the new field row
      this._setupFieldDragListeners(typeSection);

      // Position after adding
      this._positionDialog();
    });

    // Delete item type
    html.on('click', '.delete-type-button', async (event) => {
      const button = event.currentTarget;
      const typeSection = $(button.closest('.item-type-section'));
      const typeNameInput = typeSection.find('input[name$=".type"]');
      const typeName = typeNameInput.length ? typeNameInput.val() || 'this item type' : 'this item type';

      // Confirmation Dialog
      const confirmed = await Dialog.confirm({
          title: "Confirm Deletion",
          content: `<p>Are you sure you want to delete <strong>${typeName}</strong> and all its fields?</p>`,
          yes: () => true,
          no: () => false,
          defaultYes: false
      });

      if (confirmed) {
          typeSection.remove();
          // Reindex the remaining type sections (which are already non-journal)
          this._reindexTypes(html);
          this._positionDialog();
      }
    });

    // Delete field
    html.on('click', '.delete-field-button', async (event) => {
        const button = event.currentTarget;
        const fieldRow = $(button.closest('.field-row'));
        const fieldNameInput = fieldRow.find('input[name$=".name"]');
        const fieldName = fieldNameInput.length ? fieldNameInput.val() || 'this field' : 'this field';
        const typeIndex = fieldRow.data('type-index'); // Index relative to filtered list

        // Confirmation Dialog
        const confirmed = await Dialog.confirm({
            title: "Confirm Deletion",
            content: `<p>Are you sure you want to delete the field <strong>${fieldName}</strong>?</p>`,
            yes: () => true,
            no: () => false,
            defaultYes: false
        });

        if (confirmed) {
            fieldRow.remove();
            // Reindex the remaining fields in this type (which is not a journal type)
            this._reindexFields(html, typeIndex);
            this._positionDialog();
        }
    });


    // Setup drag-and-drop functionality for all displayed item types
    const typeSections = html.find('.item-type-section');
    typeSections.each((_, section) => {
      this._setupFieldDragListeners($(section));
    });
  }

   /**
   * Setup drag-and-drop listeners for field rows within a section
   * @param {jQuery} typeSection - The jQuery object representing the type section
   */
  _setupFieldDragListeners(typeSection) {
    // Target only draggable rows (exclude header row)
    const fieldRows = typeSection.find('.field-row[draggable="true"]');
    const typeIndex = typeSection.data('type-index'); // Index relative to filtered list

    // Remove any existing listeners first
    fieldRows.off('dragstart dragend dragover dragenter dragleave drop');

    // Add drag listeners to each row
    fieldRows.each((_, row) => {
      row.addEventListener('dragstart', (e) => {
        // Check if the target is the row itself or allowed handle, not input/button
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'I') {
            e.preventDefault();
            return;
        }
        // Use the field index relative to the currently displayed (filtered) rows
        e.dataTransfer.setData('text/plain', row.dataset.fieldIndex);
        row.classList.add('dragging');
        // Optional: setDragImage if needed
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        // Clear drag-over styles from all potential targets
         typeSection.find('.field-row').removeClass('drag-over');
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        // Add visual feedback on the potential target row
        row.classList.add('drag-over');
      });

      row.addEventListener('dragenter', (e) => {
        e.preventDefault(); // Handle potential nested elements
        row.classList.add('drag-over');
      });

      row.addEventListener('dragleave', (e) => {
         // Only remove if leaving the row itself, not moving between child elements
        if (e.target === row || !row.contains(e.relatedTarget)) {
            row.classList.remove('drag-over');
        }
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');

        const fromIndexStr = e.dataTransfer.getData('text/plain');
        // Check if dataTransfer is valid
         if (fromIndexStr === null || fromIndexStr === undefined || fromIndexStr === "") {
            console.warn("Drag data not found.");
            return;
        }
        const fromIndex = parseInt(fromIndexStr);
        // Use the field index relative to the currently displayed (filtered) rows
        const toIndex = parseInt(row.dataset.fieldIndex);


        // Don't do anything if dropped on itself or if indices are invalid
        if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) {
            return;
        }

        // Get the container and all *draggable* field rows within this type section
        const fieldRowsContainer = typeSection.find('.field-rows').get(0);
        const draggableRows = Array.from(fieldRowsContainer.querySelectorAll('.field-row[draggable="true"]'));

        // Find the actual dragged element using the original index relative to draggable rows
        const draggedRow = draggableRows[fromIndex];
        if (!draggedRow) {
            console.error("Could not find dragged row element.");
            return;
        }

        // Find the target element using the target index relative to draggable rows
        const targetRow = draggableRows[toIndex];
         if (!targetRow) {
            console.error("Could not find target row element.");
            return;
        }

        // Perform the move in the DOM
        if (fromIndex < toIndex) {
          // Move down: insert after the target row
          fieldRowsContainer.insertBefore(draggedRow, targetRow.nextSibling);
        } else {
          // Move up: insert before the target row
          fieldRowsContainer.insertBefore(draggedRow, targetRow);
        }

        // Reindex the field rows (only draggable ones) using the typeIndex relative to filtered list
        this._reindexFields(null, typeIndex, typeSection.get(0));

        // Position after reordering
        this._positionDialog();
      });
    });
  }

   /**
   * Reindex the item type sections after deleting one
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
  _reindexTypes(html) {
    // Re-index based on currently rendered (filtered) sections
    const typeSections = html.find('.item-type-section');

    typeSections.each((newTypeIndex, section) => {
      // Update type index (this is the index within the filtered/rendered list)
      section.setAttribute('data-type-index', newTypeIndex);

      // Update type input name using the new filtered index
      const typeInput = section.querySelector('input[name^="config"][name$="].type"]');
      if (typeInput) {
        typeInput.name = `config[${newTypeIndex}].type`;
      }

      // Update add field button using the new filtered index
      const addButton = section.querySelector('.add-field-button');
      if (addButton) {
        addButton.setAttribute('data-type-index', newTypeIndex);
      }

      // Update all field rows in this type using the new filtered index
      this._reindexFields(html, newTypeIndex, section);
    });
  }

  /**
   * Reindex the field rows within a type section after deleting or reordering one.
   * Only re-indexes draggable rows.
   * @param {jQuery|null} html - The jQuery object for the dialog (used if typeSection not provided).
   * @param {number} typeIndex - The index of the item type section (relative to filtered list).
   * @param {Element|null} typeSection - Optional specific type section element.
   */
    _reindexFields(html, typeIndex, typeSection = null) {
        if (!typeSection && html) {
            // Find section using the filtered index
            typeSection = html.find(`.item-type-section[data-type-index="${typeIndex}"]`).get(0);
        }
        if (!typeSection) {
             console.error(`Could not find type section for index ${typeIndex} to reindex fields.`);
             return;
        }

        // Select only the draggable field rows for re-indexing
        const draggableFieldRows = typeSection.querySelectorAll('.field-row[draggable="true"]');

        draggableFieldRows.forEach((row, newFieldIndex) => {
            // Update field indices on the row element itself
            row.setAttribute('data-type-index', typeIndex); // Use the filtered type index
            row.setAttribute('data-field-index', newFieldIndex); // Update field index based on new order

            // Update field input names within this row using the filtered type index
            const nameInput = row.querySelector('input[name$="].name"]');
            const objectInput = row.querySelector('input[name$="].object"]');
            const sortIndexInput = row.querySelector('input[name$="].sortIndex"]');
            const alignLeftInput = row.querySelector('input[name$="].alignLeft"]');

            if (nameInput) {
                nameInput.name = `config[${typeIndex}].fields[${newFieldIndex}].name`;
            }
            if (objectInput) {
                objectInput.name = `config[${typeIndex}].fields[${newFieldIndex}].object`;
            }
            if (sortIndexInput) {
                sortIndexInput.name = `config[${typeIndex}].fields[${newFieldIndex}].sortIndex`;
            }
            if (alignLeftInput) {
                alignLeftInput.name = `config[${typeIndex}].fields[${newFieldIndex}].alignLeft`;
            }
        });
    }


  /**
   * Save the field configuration, ensuring 'JournalEntry' is excluded.
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
  async _onSave(html) {
    const form = html.find('#field-config-form').get(0);
    const collectedConfig = []; // Config collected from the form (based on filtered display)

    // Use the DOM order of item types and fields to reconstruct the config
    const typeSections = html.find('.item-type-section');

    typeSections.each((typeIndex, typeSectionElement) => {
        const typeSection = $(typeSectionElement);
        const itemTypeInput = typeSection.find('input[name^="config"][name$="].type"]');
        const itemTypeName = itemTypeInput.val()?.trim(); // Get trimmed value

        // --- MODIFICATION: Skip if type is JournalEntry ---
        if (!itemTypeName || itemTypeName.toLowerCase() === 'journalentry') {
            if (itemTypeName?.toLowerCase() === 'journalentry') {
                 ui.notifications.warn(`Attempted to save configuration for 'JournalEntry'. This type is handled automatically and was ignored.`);
            }
            return; // Skip this section
        }
        // --- END MODIFICATION ---

        const fieldsArray = [];
        const fieldRows = typeSection.find('.field-row[draggable="true"]'); // Get only draggable rows

        fieldRows.each((fieldIndex, fieldRowElement) => {
            const fieldRow = $(fieldRowElement);
            const fieldNameInput = fieldRow.find('input[name$="].name"]');
            const fieldObjectInput = fieldRow.find('input[name$="].object"]');
            const fieldSortIndexInput = fieldRow.find('input[name$="].sortIndex"]');
            const fieldAlignLeftInput = fieldRow.find('input[name$="].alignLeft"]');

            const fieldData = {
                name: fieldNameInput.val() || '',
                object: fieldObjectInput.val() || '',
                sortIndex: fieldSortIndexInput.val() || '', // Keep as string or parse if needed
                alignLeft: fieldAlignLeftInput.is(':checked')
            };
            fieldsArray.push(fieldData);
        });

        // Add the validated, non-journal type to the config
        collectedConfig.push({
            type: itemTypeName,
            fields: fieldsArray
        });
    });

    // --- MODIFICATION START: Merge with existing JournalEntry config if it exists ---
    // Get the full current configuration from settings
    const currentFullConfig = game.settings.get('lgs-item-viewer', 'fieldConfiguration') || [];
    // Find any existing JournalEntry config (shouldn't exist based on our saves, but good practice)
    const existingJournalConfig = currentFullConfig.find(config => config.type.toLowerCase() === 'journalentry');

    // Create the final configuration to save
    let finalConfigToSave = collectedConfig; // Start with the newly collected non-journal types

    // If by some chance a JournalEntry config exists in settings, add it back (though ideally it shouldn't)
    // This preserves it if it got there via means other than this dialog.
    // However, standard operation should prevent this. Let's *not* add it back to enforce the hardcoding.
    /*
    if (existingJournalConfig) {
       finalConfigToSave.push(existingJournalConfig); // Optional: Preserve existing Journal config if found
    }
    */
    // --- MODIFICATION END ---


    // Save the configuration (containing only non-JournalEntry types collected from the form)
    await game.settings.set('lgs-item-viewer', 'fieldConfiguration', finalConfigToSave);
    ui.notifications.info('Field configuration saved (excluding JournalEntry)');
  }
}