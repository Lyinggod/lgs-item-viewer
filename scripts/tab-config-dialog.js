// filename: tab-config-dialog.js

/**
 * Dialog for configuring item viewer tabs
 */
export class TabConfigDialog extends Dialog {
  /** @override */
  constructor(dialogData = {}, options = {}) {
    // --- Unchanged constructor logic ---
    const currentTabs = game.settings.get('lgs-item-viewer', 'tabConfiguration');
    const tabRowsHtml = TabConfigDialog.generateTabRows(currentTabs);
    const content = `
      <form id="tab-config-form" class="tab-configuration">
        <div class="tabButtons">
			<div class="header-cell">
				<button type="button" id="add-tab-button" class="tabConfigbutton" title="Add Tab Row">
					<i class="fas fa-plus"></i>
				</button>
				<div style="width:300px;"></div>
				<button type="button" id="export-button" class="export-button tabConfigbutton" title="Export Configuration">
					<i class="fas fa-download"></i>
				</button>
				<button type="button" id="import-button" class="import-button tabConfigbutton" title="Import Configuration">
					<i class="fas fa-upload"></i>
				</button>
			</div>
		</div>
		<div class="form-header">
          <div class="header-row">
            <div style="margin-top:9px" class="header-cell">Tab Name</div>
            <div style="margin-top:9px" class="header-cell">Folder Name</div>
            <div class="header-cell"></div>
          </div>
        </div>
        <div id="tab-rows" class="tab-rows">
          ${tabRowsHtml}
        </div>
		<div style="padding-bottom:10px;">Use drag/drop to set tab order.</div>
      </form>
    `;

    super({
      title: "Tab Configuration",
      content: content,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
          // Add the disabled property initially, validation will enable it
          disabled: false, // Start enabled, validation might disable
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

    // Flag to track validation status
    this.hasDuplicateTabNames = false;
  }

  /** @override */
  static get defaultOptions() {
    // --- Unchanged defaultOptions logic ---
    return mergeObject(super.defaultOptions, {
      width: "auto", // Let content determine width initially
      height: "auto",
      resizable: true,
      classes: ["dialog", "tab-config-dialog"]
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    this._onRender(html); // Call existing render logic

    // --- Add input listener for dynamic validation ---
    html.on('input', 'input[name$=".name"]', (event) => {
      this._validateTabNames(html);
    });

    // Perform initial validation on render
    this._validateTabNames(html);
  }

  /**
   * Process raw text to HTML with <p> tags for storage.
   * Replaces sequences of more than one newline with </p><p>.
   * Wraps the entire text in <p> tags if it's not empty.
   * @param {string} text - Raw text from textarea.
   * @returns {string} - HTML formatted text.
   */
  static _formatMessageForSave(text) {
      // --- Unchanged _formatMessageForSave logic ---
      if (!text || text.trim() === '') {
          return '';
      }
      text = text.trim();
      text = text.replace(/(\r?\n){2,}/g, '</p><p>');
      return `<p>${text}</p>`;
  }


  /**
   * Process HTML message from storage to raw text for textarea.
   * Replaces <p> tags with double newlines. Handles <br> if used.
   * @param {string} html - HTML message from storage.
   * @returns {string} - Raw text for textarea.
   */
  static _formatMessageForLoad(html) {
      // --- Unchanged _formatMessageForLoad logic ---
      if (!html || html.trim() === '') {
          return '';
      }
      html = html.replace(/<\/p>\s*<p>/gi, '\n\n');
      html = html.replace(/<\/?p>/gi, '');
      html = html.replace(/<br\s*\/?>/gi, '\n'); // Handle potential <br> conversion back
      return html.trim();
  }


  /**
   * Generate HTML for tab rows based on current configuration
   * @param {Array} tabs - The current tab configuration
   * @returns {string} - HTML for tab rows
   */
  static generateTabRows(tabs) {
    // --- Unchanged generateTabRows logic ---
    let html = '';
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const messageText = TabConfigDialog._formatMessageForLoad(tab.message || '');
	  const messageNote = messageText.trim() !== '' ? " <b>(content)</b>" : " (no content)";
      const hideFromPlayerChecked = tab.hideFromPlayer ? 'checked' : '';

      html += `
        <div class="tab-row" data-index="${i}" draggable="true">
          <div class="row-cell input-group">
            <input type="text" name="tabs[${i}].name" value="${tab.name}" placeholder="Tab Name" required>
            <input type="text" name="tabs[${i}].source" value="${tab.source}" placeholder="Folder Name" required>
             <label class="hide-tab-label">
              <input type="checkbox" class="hide-tab-checkbox" name="tabs[${i}].hideFromPlayer" ${hideFromPlayerChecked} title="Hide Tab from Players">
                Hide Tab
             </label>
            <button type="button" class="delete-tab-button" title="Delete Tab">
              <i class="fas fa-trash"></i>
            </button>
          </div>
		  <details><summary>Tab Header${messageNote}</summary>
		  <div>To create a new paragraph, insert a blank space. HMTL is allowed. Dont use <i><p></p></i></div>
          <div class="row-cell textarea-group">
            <textarea
              name="tabs[${i}].message"
              placeholder="Optional message to display at the top of this tab..."
              rows="8"
              style="width: 100%; resize: vertical;"
            >${messageText}</textarea>
          </div>
		  </details>
        </div>
      `;
    }
    return html;
  }

  /**
   * Manually position the dialog to center it on screen
   */
  _positionDialog() {
    // --- Unchanged _positionDialog logic ---
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    this.element.css({ width: 'auto', height: 'auto' });
    let dialogWidth = this.element.outerWidth();
    let dialogHeight = this.element.outerHeight();
    dialogWidth = Math.max(500, dialogWidth);
    dialogHeight = Math.min(windowHeight * 0.9, dialogHeight);
    const left = Math.max(0, (windowWidth - dialogWidth) / 2);
    const top = Math.max(0, (windowHeight - dialogHeight) / 2);
    this.setPosition({ left, top, width: dialogWidth, height: dialogHeight });
  }


  /**
   * Actions to perform when the dialog is rendered
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
  _onRender(html) {
    // --- Mostly Unchanged _onRender logic ---
    this._positionDialog();

    html.find('#add-tab-button').click(() => {
      const tabRows = html.find('#tab-rows');
      const newIndex = tabRows.find('.tab-row').length;
      const newRowHtml = `
        <div class="tab-row" data-index="${newIndex}" draggable="true">
           <div class="row-cell input-group">
             <input type="text" name="tabs[${newIndex}].name" placeholder="Tab Name" required>
             <input type="text" name="tabs[${newIndex}].source" placeholder="Folder Name" required>
              <label class="hide-tab-label">
               <input type="checkbox" class="hide-tab-checkbox" name="tabs[${newIndex}].hideFromPlayer" title="Hide Tab from Players">
                 Hide Tab
              </label>
             <button type="button" class="delete-tab-button" title="Delete Tab">
               <i class="fas fa-trash"></i>
             </button>
           </div>
		   <details><summary>Tab Header (no content)</summary>
		  <div>To create a new paragraph, insert a blank space. HMTL is allowed. Dont use <i><p></p></i></div>
           <div class="row-cell textarea-group">
             <textarea
               name="tabs[${newIndex}].message"
               placeholder="Optional message to display at the top of this tab..."
               rows="8"
               style="width: 100%; resize: vertical;"
             ></textarea>
           </div>
		   </details>
        </div>
      `;
      tabRows.append(newRowHtml);
      this._setupDragListeners(html);
      this._positionDialog();
      this._validateTabNames(html); // Validate after adding a new row
    });

    html.on('click', '.delete-tab-button', async (event) => {
        const button = event.currentTarget;
        const row = button.closest('.tab-row');
        const tabNameInput = row.querySelector('input[name$=".name"]');
        const tabName = tabNameInput ? tabNameInput.value || 'this tab' : 'this tab';

        const confirmed = await Dialog.confirm({
            title: "Confirm Deletion",
            content: `<p>Are you sure you want to delete the tab <strong>${tabName}</strong>?</p><p>This will also remove associated table/folder configurations saved for this tab.</p>`, // Added warning
            yes: () => true,
            no: () => false,
            defaultYes: false
        });

        if (confirmed) {
            row.remove();
            this._reindexRows(html);
            this._positionDialog();
            this._validateTabNames(html); // Re-validate after deleting a row
        }
    });

    this._setupDragListeners(html);

    html.find('#export-button').click(() => {
      this._showExportDialog();
    });

    html.find('#import-button').click(() => {
      this._showImportDialog();
    });
  }

  /**
   * Shows the export configuration dialog.
   */
  _showExportDialog() {
    // --- Unchanged _showExportDialog logic ---
    const currentConfig = game.settings.get('lgs-item-viewer', 'tabConfiguration');
    const configJson = JSON.stringify(currentConfig, null, 2);
    const exportDialog = new Dialog({
        title: "Export Tab Configuration",
        content: `
            <form>
                <label>Copy this configuration data:</label>
                <div class="form-group">
                    <textarea style="height: 300px; font-family: monospace; width: 98%;" readonly>${configJson}</textarea>
                </div>
            </form>
        `,
        buttons: {
            copy: {
                icon: '<i class="fas fa-copy"></i>',
                label: "Copy",
                callback: (html) => {
                    const textArea = html.find('textarea')[0];
                    textArea.select();
                    try { document.execCommand('copy'); ui.notifications.info("Configuration copied to clipboard."); }
                    catch (err) { ui.notifications.error("Failed to copy configuration."); console.error("Copy failed: ", err); }
                }
            },
            close: { icon: '<i class="fas fa-times"></i>', label: "Close" }
        },
        default: "close"
    });
    exportDialog.render(true);
}

  /**
   * Shows the import configuration dialog.
   */
  _showImportDialog() {
    // --- Unchanged _showImportDialog logic ---
    const importDialog = new Dialog({
        title: "Import Tab Configuration",
        content: `
            <form>
                <label>Paste configuration data here:</label>
                <div class="form-group">
                    <textarea id="import-tab-config-data" style="height: 300px; font-family: monospace; width: 98%;"></textarea>
                </div>
            </form>
        `,
        buttons: {
            save: {
                icon: '<i class="fas fa-save"></i>',
                label: "Import",
                callback: async (html) => {
                    try {
                        const importData = html.find('#import-tab-config-data').val();
                        const importedConfig = JSON.parse(importData);
                        if (!Array.isArray(importedConfig)) { throw new Error("Invalid configuration format. Expected an array."); }
                        if (importedConfig.some(tab => typeof tab.name !== 'string' || typeof tab.source !== 'string')) { throw new Error("Invalid configuration format. Each tab must have 'name' and 'source' properties."); }
                        await game.settings.set('lgs-item-viewer', 'tabConfiguration', importedConfig);
                        ui.notifications.info("Tab configuration imported successfully. Refreshing dialog...");
                        this.close();
                        setTimeout(() => { new TabConfigDialog().render(true); }, 100);
                    } catch (err) {
                        ui.notifications.error("Error importing configuration: " + err.message);
                        console.error("Import error: ", err);
                        return false;
                    }
                }
            },
            cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
        },
        default: "save"
    });
    importDialog.render(true);
  }

   /**
   * Setup drag-and-drop listeners for reordering rows
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
  _setupDragListeners(html) {
    // --- Unchanged _setupDragListeners logic ---
    const tabRows = html.find('.tab-row');
    tabRows.off('dragstart dragend dragover dragenter dragleave drop');
    tabRows.each((_, row) => {
      row.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.tagName === 'I' || e.target.tagName === 'DETAILS' || e.target.tagName === 'SUMMARY' || e.target.classList.contains('hide-tab-checkbox')) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', row.dataset.index);
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        html.find('.tab-row').removeClass('drag-over');
      });
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
      row.addEventListener('dragenter', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
      row.addEventListener('dragleave', () => { row.classList.remove('drag-over'); });
      row.addEventListener('drop', (e) => {
        e.preventDefault(); row.classList.remove('drag-over');
        const fromIndexStr = e.dataTransfer.getData('text/plain');
        if (fromIndexStr === null || fromIndexStr === undefined || fromIndexStr === "") { console.warn("Drag data not found."); return; }
        const fromIndex = parseInt(fromIndexStr); const toIndex = parseInt(row.dataset.index);
        if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) return;
        const rowsContainer = html.find('#tab-rows').get(0);
        const rows = Array.from(rowsContainer.querySelectorAll('.tab-row'));
        const draggedRow = rows.find(r => parseInt(r.dataset.index) === fromIndex); if (!draggedRow) { console.error("Could not find dragged row element."); return; }
        const targetRow = rows.find(r => parseInt(r.dataset.index) === toIndex); if (!targetRow) { console.error("Could not find target row element."); return; }
        if (fromIndex < toIndex) { rowsContainer.insertBefore(draggedRow, targetRow.nextSibling); }
        else { rowsContainer.insertBefore(draggedRow, targetRow); }
        this._reindexRows(html);
        this._positionDialog();
        this._validateTabNames(html); // Re-validate after drop
      });
    });
  }

  /**
   * Validates tab names for uniqueness (case-insensitive) and updates UI.
   * @param {jQuery} html - The jQuery object representing the dialog's HTML.
   */
  _validateTabNames(html) {
    const nameInputs = html.find('input[name$=".name"]');
    const saveButton = html.closest('.dialog').find('.dialog-button.save'); // Find save button in dialog footer
    let hasDuplicates = false;
    const namesSeen = new Map(); // Map to store lowercase names and their input elements

    // Clear previous highlights
    nameInputs.css('background-color', '');

    // Check each name
    nameInputs.each((index, input) => {
      const name = $(input).val().trim();
      const lowerCaseName = name.toLowerCase();

      if (lowerCaseName === '') {
        // Treat empty names as potential issues if needed, but not duplicates for now
        // Optionally add highlighting for empty required fields here
        return; // Skip empty names for duplicate check
      }

      if (namesSeen.has(lowerCaseName)) {
        // Duplicate found
        hasDuplicates = true;
        // Highlight this input and the one(s) seen before with the same name
        $(input).css('background-color', 'pink');
        namesSeen.get(lowerCaseName).forEach(previousInput => $(previousInput).css('background-color', 'pink'));
        // Add current input to the list for this name
        namesSeen.get(lowerCaseName).push(input);
      } else {
        // New name encountered
        namesSeen.set(lowerCaseName, [input]); // Store as array
      }
    });

    // Update validation status flag and save button state
    this.hasDuplicateTabNames = hasDuplicates;
    if (saveButton.length) {
         saveButton.prop('disabled', hasDuplicates);
    }

    // Optional: Show/hide a general warning message in the dialog if needed
    // e.g., html.find('.duplicate-warning-message').toggle(hasDuplicates);
  }


  /**
   * Reindex the rows after a delete or reorder operation
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
  _reindexRows(html) {
    // --- Unchanged _reindexRows logic ---
    const rows = html.find('.tab-row');
    rows.each((newIndex, row) => {
      row.setAttribute('data-index', newIndex);
      const nameInput = row.querySelector('input[name^="tabs"][name$=".name"]');
      const sourceInput = row.querySelector('input[name^="tabs"][name$=".source"]');
      const messageTextarea = row.querySelector('textarea[name^="tabs"][name$=".message"]');
      const hideFromPlayerCheckbox = row.querySelector('input[name^="tabs"][name$=".hideFromPlayer"]');
      if (nameInput) nameInput.name = `tabs[${newIndex}].name`;
      if (sourceInput) sourceInput.name = `tabs[${newIndex}].source`;
      if (messageTextarea) messageTextarea.name = `tabs[${newIndex}].message`;
      if (hideFromPlayerCheckbox) hideFromPlayerCheckbox.name = `tabs[${newIndex}].hideFromPlayer`;
    });
  }

  /**
   * Save the tab configuration, including cleanup for deleted tabs and duplicate validation.
   * @param {jQuery} html - The jQuery object representing the dialog's HTML
   */
async _onSave(html) {
    // --- Step 1: Final Duplicate Validation ---
    this._validateTabNames(html); // Ensure validation state is current
    if (this.hasDuplicateTabNames) {
      ui.notifications.error("Tab names must be unique (case-insensitive). Please correct the highlighted fields.");
      console.log("LGS Item Viewer | Save prevented due to duplicate tab names.");
      return false; // Prevent saving and closing dialog
    }

    // --- Step 2: Gather New Configuration from Form ---
    const form = html.find('#tab-config-form').get(0);
    const newTabsConfig = [];
    const rows = html.find('.tab-row'); // Get rows in current DOM order

    rows.each((index, rowElement) => {
      const row = $(rowElement);
      const nameInput = row.find('input[name$=".name"]');
      const sourceInput = row.find('input[name$=".source"]');
      const messageTextarea = row.find('textarea[name$=".message"]');
      const hideFromPlayerCheckbox = row.find('input[name$=".hideFromPlayer"]');

      const nameValue = nameInput.length ? nameInput.val().trim() : '';
      const sourceValue = sourceInput.length ? sourceInput.val().trim() : '';

      if (!nameValue || !sourceValue) {
          console.warn(`LGS Item Viewer | Skipping tab row ${index} due to missing name or source.`);
          return; // Skip incomplete rows
      }

      const messageValue = messageTextarea.length ? messageTextarea.val() : '';
      const hideFromPlayerValue = hideFromPlayerCheckbox.length ? hideFromPlayerCheckbox.is(':checked') : false;

      newTabsConfig.push({
        name: nameValue, // Keep original case for saving
        source: sourceValue,
        message: TabConfigDialog._formatMessageForSave(messageValue),
        hideFromPlayer: hideFromPlayerValue,
      });
    });

    // --- Step 3: Process Renames and Deletions ---
    const oldTabsConfig = game.settings.get('lgs-item-viewer', 'tabConfiguration') || [];
    const currentDisplayStatus = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
    const currentTableOrders = game.settings.get('lgs-item-viewer', 'tableOrders') || {};
    const currentFolderOrders = game.settings.get('lgs-item-viewer', 'folderOrders') || {};
    let settingsUpdated = false; // Flag to track if any settings object needs saving

    // Create maps for efficient lookup of new tabs by source and lowercase name
    const newTabsBySource = new Map(newTabsConfig.map(tab => [tab.source, tab]));
    const newTabsByNameLower = new Map(newTabsConfig.map(tab => [tab.name.toLowerCase(), tab]));

    // --- 3a: Handle Tab Renames (Source Change) ---
    console.log("LGS Item Viewer | Checking for tab source renames...");
    const renamedSources = new Set(); // Track sources that were handled as renames

    for (const oldTab of oldTabsConfig) {
        // Try to find a match in the new config primarily by lowercase name
        const correspondingNewTab = newTabsByNameLower.get(oldTab.name.toLowerCase());

        // Check if a tab with the same name exists AND the source has changed
        if (correspondingNewTab && oldTab.source !== correspondingNewTab.source) {
            const oldSource = oldTab.source;
            const newSource = correspondingNewTab.source;

            console.log(`LGS Item Viewer | Detected source rename for tab "${oldTab.name}": "${oldSource}" -> "${newSource}"`);
            renamedSources.add(oldSource); // Mark this old source as renamed

            // Sanitize sources for displayStatus key matching
            const sanitizedOldSource = oldSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            const sanitizedNewSource = newSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            const oldDisplayStatusPrefix = `${sanitizedOldSource}-`;
            const newDisplayStatusPrefix = `${sanitizedNewSource}-`;

            // Rename tableOrders key
            if (currentTableOrders.hasOwnProperty(oldSource)) {
                console.log(` - Renaming key in tableOrders: "${oldSource}" -> "${newSource}"`);
                currentTableOrders[newSource] = currentTableOrders[oldSource];
                delete currentTableOrders[oldSource];
                settingsUpdated = true;
            }

            // Rename folderOrders key
            if (currentFolderOrders.hasOwnProperty(oldSource)) {
                console.log(` - Renaming key in folderOrders: "${oldSource}" -> "${newSource}"`);
                currentFolderOrders[newSource] = currentFolderOrders[oldSource];
                delete currentFolderOrders[oldSource];
                settingsUpdated = true;
            }

            // Rename displayStatus keys
            const displayKeysToRename = [];
            for (const key in currentDisplayStatus) {
                if (key.startsWith(oldDisplayStatusPrefix)) {
                    displayKeysToRename.push(key);
                }
            }

            if (displayKeysToRename.length > 0) {
                console.log(` - Renaming ${displayKeysToRename.length} keys in displayStatus starting with "${oldDisplayStatusPrefix}"...`);
                for (const oldKey of displayKeysToRename) {
                    const newKey = oldKey.replace(oldDisplayStatusPrefix, newDisplayStatusPrefix);
                    if (oldKey !== newKey) { // Ensure replacement happened
                         currentDisplayStatus[newKey] = currentDisplayStatus[oldKey];
                         delete currentDisplayStatus[oldKey];
                    } else {
                        console.warn(`   - Failed to generate new key for displayStatus key: ${oldKey}`);
                    }
                }
                settingsUpdated = true;
            }
        }
    }

    // --- 3b: Handle Tab Deletions ---
    console.log("LGS Item Viewer | Checking for deleted tabs...");
    // Find tabs in the old config whose source doesn't exist in the new config AND wasn't handled as a rename
    const deletedTabs = oldTabsConfig.filter(oldTab =>
        !newTabsBySource.has(oldTab.source) && !renamedSources.has(oldTab.source)
    );

    if (deletedTabs.length > 0) {
        console.log(`LGS Item Viewer | Found ${deletedTabs.length} deleted tabs to clean up...`);
        for (const deletedTab of deletedTabs) {
            const tabSource = deletedTab.source;
            const sanitizedTabSource = tabSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            const displayStatusPrefix = `${sanitizedTabSource}-`;

            console.log(`LGS Item Viewer | Cleaning settings for deleted tab source: "${tabSource}" (Sanitized Prefix: "${displayStatusPrefix}")`);

            // Remove from tableOrders
            if (currentTableOrders.hasOwnProperty(tabSource)) {
                delete currentTableOrders[tabSource];
                settingsUpdated = true;
                console.log(` - Removed entry from tableOrders.`);
            }
            // Remove from folderOrders
            if (currentFolderOrders.hasOwnProperty(tabSource)) {
                delete currentFolderOrders[tabSource];
                settingsUpdated = true;
                 console.log(` - Removed entry from folderOrders.`);
            }
            // Remove from displayStatus
            const keysToDelete = [];
            for (const key in currentDisplayStatus) {
                if (key.startsWith(displayStatusPrefix)) {
                    keysToDelete.push(key);
                }
            }
            if (keysToDelete.length > 0) {
                keysToDelete.forEach(key => delete currentDisplayStatus[key]);
                settingsUpdated = true;
                console.log(` - Removed ${keysToDelete.length} entries from displayStatus.`);
            }
        }
    } else {
         console.log("LGS Item Viewer | No deleted tabs found requiring cleanup.");
    }

    // --- Step 4: Save Updated Settings Objects (if changed) ---
    if (settingsUpdated) {
        console.log("LGS Item Viewer | Saving updated settings objects (displayStatus, tableOrders, folderOrders)...");
        await game.settings.set('lgs-item-viewer', 'displayStatus', currentDisplayStatus);
        await game.settings.set('lgs-item-viewer', 'tableOrders', currentTableOrders);
        await game.settings.set('lgs-item-viewer', 'folderOrders', currentFolderOrders);
    }

    // --- Step 5: Save the Final Tab Configuration ---
    await game.settings.set('lgs-item-viewer', 'tabConfiguration', newTabsConfig);
    ui.notifications.info('Tab configuration saved');

    // --- Step 6: Close the Dialog (implicit return true) ---
    return true;
  }
}