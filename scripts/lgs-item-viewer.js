//filename:lgs-item-viewer.js

import { registerSettings } from './settings.js';
import { ItemViewerDialog } from './item-viewer-dialog.js';
import { TabConfigDialog } from './tab-config-dialog.js';
import { FieldConfigDialog } from './field-config-dialog.js';
import { journalGetJournalContent } from './lgs-journal-viewer.js';
import {loadTabContent, buildTagFilters, updateTagVisibility, updateVisibleTagCheckboxes } from './tags.js';
import { processSystemVariations, replaceSystemSymbols, loadSystemVariant, getNestedProperty as getNestedPropertyFromSystem } from './system-variations.js'

// --- MODIFICATION: Token for managing asynchronous tab loads ---
let latestRequestToken = null;

Hooks.once('init', async function() {
  console.log('Lyinggods Item Viewer | Initializing module');
  
  // Register module settings
  registerSettings();
});
Hooks.on('renderCompendiumDirectory', (app, html, data) => {
  const buttonHtml = `<button id="item-viewer-button" class="item-viewer-button" type="button" draggable="true" data-type="macro">
    <i class="fas fa-book-open"></i> Item Viewer
  </button>`;
  html.find('.directory-footer').append(buttonHtml);
  html.find('#item-viewer-button').click(ev => {
    ev.preventDefault();
    openItemViewer();
  });
  html.find('#item-viewer-button').on('dragstart', ev => {
    const dragData = {
      type: "Macro",
      data: {
        name: "Item Viewer",
        type: "script",
        img: "icons/sundries/books/book-stack.webp",
        command: "game.modules.get('lgs-item-viewer').api.openItemViewer();"
      }
    };
    ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  });
});

/**
 * Opens the main Item Viewer dialog
 */
function openItemViewer() {
  // --- MODIFICATION: Initialize/reset token for this dialog session ---
  const initialTokenForDialog = Symbol();
  latestRequestToken = initialTokenForDialog; 

  const htmlContent = `
    <div id="headerTabs"></div>
    <div id="displayOptions"></div>
    <div class="viewer-columns">
      <div id="leftColumn"></div>
      <div id="rightColumn"></div>
    </div>
    <div id="initialization-flag" style="display:none;"></div>
  `;
  const dialog = new ItemViewerDialog({
    title: 'Item Viewer',
    content: htmlContent,
    buttons: {},
    render: async (html) => {
      if (html.find('#initialization-flag').data('initialized')) return;
      html.find('#initialization-flag').data('initialized', true);
      // --- MODIFICATION: Pass initial token and getter to initializeDialog ---
      await initializeDialog(html, initialTokenForDialog, () => latestRequestToken);
    }
  }, {
    id: "GenesysItemViewer",
    width: 1200,
    height: 800,
    resizable: true
  });
  dialog.render(true);
}

// Hook to initialize the API for external access
Hooks.once('init', async function() {
  // console.log('Lyinggods Item Viewer | Initializing module'); // Already logged

  // Register module settings
  // registerSettings(); // Already called in the other init

  // --- Register API ---
   console.log('Lyinggods Item Viewer | Initializing module API');
  if (!game.modules.get('lgs-item-viewer')) {
    console.error("LGS Item Viewer | Module object not found during API initialization!");
    return;
  }
  game.modules.get('lgs-item-viewer').api = {
    openItemViewer
  };
   console.log('Lyinggods Item Viewer | API Initialized:', game.modules.get('lgs-item-viewer').api);

});

// --- Load System Variant after settings are ready ---
Hooks.once('ready', async function() {
    console.log('Lyinggods Item Viewer | Ready hook: Loading system variant...');
    await loadSystemVariant(); 
    console.log('Lyinggods Item Viewer | System variant load attempt complete.');
});

/**
 * Gets journal page content for the info tab
 * @param {string} pageName - The name of the page to retrieve
 * @returns {string} The HTML content of the page
 */
function getPageInfo(pageName) {
  const journal = game.journal.getName("Catalog Viewer Journal");
  if (!journal) {
    // --- MODIFICATION: Return null if journal is not found, loadInfoTab will handle this. ---
    return null;
  }

  pageName = pageName.replace("-folder-","-");

  const page = journal.pages.find(p => {
    const pNameLower = p.name.toLowerCase();
    const pageNameLower = pageName.toLowerCase();
    return pNameLower === pageNameLower ||
           (pageNameLower === "info" && pNameLower === "player message") ||
           (pageNameLower === "player message" && pNameLower === "info");
  });

  if (!page) return `<p>Page "${pageName}" not found in "Catalog Viewer Journal". Please create it.</p>`;
  
  let content = page.text?.content ?? "";
  content = content.replace(/@UUID\[(.*?)\]\{(.*?)\}/g, (match, uuid, text) => {
    const parts = uuid.split('.');
    const id = parts[parts.length - 1];
    return `<a class="content-link" draggable="true" data-link="" data-uuid="${uuid}" data-id="${id}" data-type="JournalEntryPage" data-tooltip="Text Page" data-scope=""><i class="fas fa-file-lines"></i>${text}</a>`;
  });
  const processedContent = replaceSystemSymbols(content);
  return processedContent;
}

/**
 * Helper function to get a nested property from an object
 * @param {Object} obj - The object to retrieve from
 * @param {string} path - The dot-notation path to the property
 * @returns {*} The value of the property, or undefined if not found
 */
export function getNestedProperty(obj, path) {
    return getNestedPropertyFromSystem(obj, path);
}

/**
 * Initialize the dialog content after rendering
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 */
async function initializeDialog(html, initialToken, getLatestTokenFn) {
  if (html.find('#headerTabs').children().length > 0) return;

  const tabs = game.settings.get('lgs-item-viewer', 'tabConfiguration');
  const allTabs = [{ name: "Info", source: "info", hideFromPlayer: false, message: '' }, ...tabs];
  const headerTabs = html.find('#headerTabs');
  const tabsHtml = allTabs
    .filter(tab => tab.source === "info" || (game.user.isGM || !tab.hideFromPlayer))
    .map(tab => {
      let displayName = tab.name;
      if (game.user.isGM && tab.hideFromPlayer) displayName = `<i class="fas fa-ban" title="Hidden From Players"></i> ${displayName}`;
      const originalIndex = allTabs.findIndex(t => t.source === tab.source && t.name === tab.name);
      return `<div class="item-viewer-tab" data-tab-index="${originalIndex}" data-source="${tab.source}">${displayName}</div>`;
    }).join('');
  headerTabs.html(tabsHtml);

  const displayOptions = html.find('#displayOptions');
  let displayOptionsHtml = `<div class="display-options-container">
    <div class="search-container">
      <label for="item-search">Search:</label>
      <input type="text" id="item-search" placeholder="Enter search terms (space separated)">
    </div>`;
  if (game.user.isGM) {
    displayOptionsHtml += `<details><summary>Temporary Settings</i></summary>
      <label><input type="checkbox" id="hide-table-rows"><span style="position: relative; top: -5px;">Hide Table Rows</span></label>
	  </details>`;
  }
  displayOptionsHtml += `</div>`;
  displayOptions.html(displayOptionsHtml);

  if (game.user.isGM) {
    html.find('#hide-table-rows').change(async function() {
      const activeTabElement = html.find('.item-viewer-tab.active');
      if (activeTabElement.length) {
        const tabSource = activeTabElement.data('source');
        const tabIndex = parseInt(activeTabElement.data('tab-index'));
        const activeTabData = allTabs[tabIndex];
        const leftColumn = html.find('#leftColumn');
        const rightColumn = html.find('#rightColumn');

        const currentRequestTokenForChange = Symbol();
        latestRequestToken = currentRequestTokenForChange; 

        leftColumn.empty().html('<div class="item-viewer-loader" style="text-align:center; padding:20px;">Loading...</div>');
        rightColumn.empty();

        await prependTabMessage(html, activeTabData); 

        try {
            if (tabSource !== "info") {
                await loadTabContent(html, tabSource, currentRequestTokenForChange, getLatestTokenFn);
            } else {
                await loadInfoTab(html, currentRequestTokenForChange, getLatestTokenFn);
            }
        } catch (error) {
            console.error(`LGS Item Viewer | Error reloading tab ${tabSource} after hide-table-rows change:`, error);
            if (currentRequestTokenForChange === getLatestTokenFn()) {
                leftColumn.html(`<p>Error loading content for ${tabSource}. Check console (F12).</p>`);
            }
        }
      }
    });
  }

  let activeTabSource = null; 
  headerTabs.find('.item-viewer-tab').click(async (ev) => {
    const tabElement = $(ev.currentTarget);
    const tabSource = tabElement.data('source');
    const tabIndex = parseInt(tabElement.data('tab-index'));

    const newRequestToken = Symbol();
    latestRequestToken = newRequestToken; 
    const currentClickedRequestToken = latestRequestToken; 

    headerTabs.find('.item-viewer-tab').removeClass('active');
    tabElement.addClass('active');
    activeTabSource = tabSource; 

    const leftColumn = html.find('#leftColumn');
    const rightColumn = html.find('#rightColumn');

    leftColumn.empty().html('<div class="item-viewer-loader" style="text-align:center; padding:20px;">Loading...</div>');
    rightColumn.empty();

    const currentTabData = allTabs[tabIndex];
    if (!currentTabData) { console.error(`LGS Item Viewer | Could not find tab data for index ${tabIndex}`); return; }

    await prependTabMessage(html, currentTabData);

    try {
        if (tabSource === "info") {
            await loadInfoTab(html, currentClickedRequestToken, getLatestTokenFn);
        } else {
            await loadTabContent(html, tabSource, currentClickedRequestToken, getLatestTokenFn);
        }
    } catch (error) {
        console.error(`LGS Item Viewer | Error loading tab ${tabSource}:`, error);
        if (currentClickedRequestToken === getLatestTokenFn()) { 
            leftColumn.html(`<p>Error loading content for ${tabSource}. Check console (F12).</p>`);
        }
    }
  });

  html.find('#item-search').on('input', function() {
    applySearchFilter(html);
    applyAlternatingRowColors(html);
    checkTableVisibility(html);
  });

  const updateViewerColumnsHeight = () => {
    const dialog = html.closest('#GenesysItemViewer');
    if (dialog.length) {
      const dialogHeight = dialog.height();
      const headerHeight = html.find('#headerTabs').outerHeight(true) || 0;
      const optionsHeight = html.find('#displayOptions').outerHeight(true) || 0;
      const availableHeight = dialogHeight - headerHeight - optionsHeight - 40;
      html.find('.viewer-columns').css('height', `${Math.max(200, availableHeight)}px`);
    }
  };
  updateViewerColumnsHeight();
  const resizeObserver = new ResizeObserver(updateViewerColumnsHeight);
  const dialogElement = html.closest('#GenesysItemViewer');
  if (dialogElement.length) resizeObserver.observe(dialogElement[0]);

  const firstTab = headerTabs.find('.item-viewer-tab').first();
  if (firstTab.length) {
      latestRequestToken = initialToken;
      firstTab.trigger('click');
  } else {
      html.find('#leftColumn').empty().html("<p>No tabs configured or available.</p>"); 
  }
}

/**
 * Replaces @UUID[X]{Y} strings with Foundry VTT content links.
 *
 * @param {string} text - The input string containing @UUID[X]{Y} patterns.
 * @returns {string} The string with @UUID[X]{Y} patterns replaced with HTML links.
 */
function replaceUUIDLinks(text) {
  if (typeof text !== 'string') {
    return text; // Or throw an error, depending on your needs
  }

  const uuidRegex = /@UUID\[([^\]]+)\]\{([^}]+)\}/g;

  return text.replace(uuidRegex, (match, uuid, linkText) => {
    let dataType = null;
    let dataId = null;
    let dataPack = null;
    let tooltip = null;
    let icon = '<i class="fas fa-suitcase"></i>'; // Default icon
    let dataScope = "";


    if (uuid.includes("Compendium.")) {
      const parts = uuid.split('.');
      if (parts.length >= 4) {
        dataPack = `${parts[1]}.${parts[2]}`;
        dataType = parts[3];
        dataId = parts[4];
        dataScope = "";

      }
    } else if (uuid.includes("JournalEntry") && uuid.includes("JournalEntryPage")) {
      const parts = uuid.split('.');
      if (parts.length === 4) {
        dataType = parts[2]; // JournalEntryPage
        dataId = parts[3];
        tooltip = "Text Page";
        icon = '<i class="fas fa-file-lines"></i>';
        dataScope = "";
      }
    } else {
      const parts = uuid.split('.');
      if (parts.length === 2) {
        dataType = parts[0];
        dataId = parts[1];
        dataScope = "";
      }
    }

    if (!dataType || !dataId) {
      console.warn(`Invalid UUID format: ${uuid}`);
      return match; // Return the original string if parsing fails
    }

    let link = `<a class="content-link" draggable="true" data-link="" data-uuid="${uuid}" data-id="${dataId}" data-type="${dataType}" `;

    if(dataPack){
      link += `data-pack="${dataPack}" `
    }
    if(tooltip){
      link += `data-tooltip="${tooltip}" `
    }
    link += `data-scope="">${icon}${linkText}</a>`;

    return link;
  });
}

/**
 * Prepends the tab message to the left column if it exists.
 * @param {jQuery} html - The jQuery object representing the dialog's HTML.
 * @param {object} tabData - The configuration object for the current tab.
 */
async function prependTabMessage(html, tabData) {
    const leftColumn = html.find('#leftColumn');
    const messageHtml = tabData?.message || '';
    leftColumn.find('.tabMessage').remove();

    if (messageHtml.trim() !== '' && messageHtml.trim() !== '<p></p>') {
        try {
            const symbolReplacedMessage = replaceSystemSymbols(messageHtml);
            const enrichedMessage = await TextEditor.enrichHTML(symbolReplacedMessage, { async: true });
            leftColumn.prepend(`<div class="tabMessage"><h2 class="tabDataName">${tabData.name}</h2>${enrichedMessage}</div>`);
        } catch (err) {
            console.error(`LGS Item Viewer | Error processing tab message for tab ${tabData.name}:`, err);
            leftColumn.prepend(`<div class="tabMessage">${messageHtml}</div>`); 
        }
    }
}

/**
 * Load the Info tab content
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {Symbol} requestToken - The token for this specific load request.
 * @param {function} getLatestToken - Function to get the current latestRequestToken.
 */
async function loadInfoTab(html, requestToken, getLatestToken) {
  if (requestToken !== getLatestToken()) {
    console.log("LGS Item Viewer | Info tab load aborted (stale token at start).");
    return;
  }

  const leftColumn = html.find('#leftColumn');
  const infoContainer = $('<div class="info-content-container"></div>');
  let infoContentRaw = getPageInfo("Info");

  // --- MODIFICATION: Handle missing "Catalog Viewer Journal" ---
  if (infoContentRaw === null) {
      if (requestToken === getLatestToken()) {
          leftColumn.empty(); // Clear loader or any previous content
          const setupInstructions = `
              <div class="info-content-container">
                  <h2>Item Viewer Setup Required</h2>
                  <p>The <strong>"Catalog Viewer Journal"</strong> was not found. This journal is used by the Info tab and for providing additional context to item tables and tags.</p>
                  <p><strong>Setting up <i>Catalog Viewer Journal</i></strong></p>
                  <ol>
                      <li>Create a new Journal Entry named exactly: <strong>Catalog Viewer Journal</strong>.</li>
                      <li>Inside this journal, create a Journal Entry Page named exactly: <strong>Player Message</strong>. This page's content will be displayed here on the Info tab.</li>
                      <li>For complete setup instructions, see the github for this module at https://github.com/Lyinggod/lgs-item-viewer.</li>
                  </ol>
                  <p>Once the journal and the "Info" page are created, this message will be replaced by the content of that page.</p>
              </div>
          `;
          leftColumn.append(setupInstructions);
      }
      return; // Stop further processing for Info tab
  }
  // --- END MODIFICATION ---


  if (requestToken === getLatestToken()) {
      leftColumn.empty(); 
      leftColumn.append(infoContainer);
  } else {
      console.log("LGS Item Viewer | Info tab load aborted (stale token before DOM append).");
      return;
  }

  try {
      if (requestToken !== getLatestToken()) { 
          console.log("LGS Item Viewer | Info tab load aborted (stale token before enrich).");
          return;
      }
      const enrichedContent = await TextEditor.enrichHTML(infoContentRaw, { async: true });
      if (requestToken !== getLatestToken()) {
          console.log("LGS Item Viewer | Info tab load aborted (stale token after enrich).");
          return;
      }
      infoContainer.html(enrichedContent);
  } catch (err) {
      console.error("LGS Item Viewer | Error enriching Info tab content:", err);
      if (requestToken === getLatestToken()) {
          infoContainer.html(infoContentRaw);
      }
  }
}

/**
 * Check if a folder name contains the hidden folder marker "(-)"
 * @param {string} folderName - The name of the folder to check
 * @returns {boolean} True if the folder is marked as hidden
 */
export function isHiddenFolder(folderName) {
  return folderName && folderName.includes("(-)");
}
/**
 * Extract folder path from item
 * @param {Object} item - The item document
 * @returns {string} Folder path in the format "folder\subfolder\subfolder\"
 */
/*function getFolderPath(item) {
  // Default to empty string for root items
  if (!item.folder) return "";
  
  // Build folder path by traversing up the folder tree
  let folders = [];
  let currentFolder = item.folder;
  
  while (currentFolder) {
    folders.unshift(currentFolder.name);
    currentFolder = currentFolder.folder;
  }
  
  return folders.join('\\') + '\\';
}
*/

/**
 * Apply search filter to items in the left column
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 */
export function applySearchFilter(html) {
  let searchText = '';
  const searchInput = html.find('#item-search');

  if (searchInput.length > 0 && searchInput.val() !== undefined) {
    searchText = searchInput.val().trim(); // Keep original case for parsing, convert to lower later
  }

  const itemRowsSelector = '#leftColumn .item-type-table .first-row, #leftColumn .item-type-table .second-row';
  html.find(itemRowsSelector).each(function() {
    $(this).data('hidden-by-search', false);
  });

  if (!searchText) {
    html.find('#leftColumn .item-type-table .first-row').each(function() {
      if (!$(this).data('hidden-by-folder') && !$(this).data('hidden-by-tag')) {
        $(this).show();
      }
    });
    updateTagVisibility(html);
    applyAlternatingRowColors(html);
    checkTableVisibility(html);
    return;
  }

  // --- Parse search text into general and column-specific terms ---
  const rawTerms = searchText.split(/\s+/).filter(term => term.length > 0);
  const generalSearchTerms = [];
  const columnSearchTerms = [];
  const colonRegex = /^([^:]+):(.*)$/;

  for (const term of rawTerms) {
    const match = term.match(colonRegex);
    if (match) {
      const headerPrefix = match[1].toLowerCase();
      let valuePartRaw = match[2];
      let valuePartTrimmed = valuePartRaw.trim();

      let values = [];
      let isQuoted = false;

      if ((valuePartTrimmed.startsWith('"') && valuePartTrimmed.endsWith('"')) ||
          (valuePartTrimmed.startsWith("'") && valuePartTrimmed.endsWith("'"))) {
        isQuoted = true;
        let innerContent = valuePartTrimmed.substring(1, valuePartTrimmed.length - 1);
        if (innerContent === "") {
          values = [""]; // Search for exact empty string
        } else {
          // Split by comma or space for quoted values, filter out empty strings resulting from multiple separators
          values = innerContent.split(/[, ]+/).filter(v => v.trim().length > 0).map(v => v.toLowerCase());
        }
      } else {
        // Not quoted
        isQuoted = false;
        if (valuePartTrimmed === "") {
          values = [""]; // Search for cells containing empty string (effectively any content)
        } else {
          values = [valuePartTrimmed.toLowerCase()];
        }
      }

      if (values.length > 0) {
        columnSearchTerms.push({ headerPrefix, values, isQuoted });
      } else {
        // If parsing colon term results in no usable values (e.g. key:" , "), treat original as general.
        generalSearchTerms.push(term.toLowerCase());
      }
    } else {
      generalSearchTerms.push(term.toLowerCase());
    }
  }
  // --- End Search Term Parsing ---


  if (generalSearchTerms.length === 0 && columnSearchTerms.length === 0) {
    html.find('#leftColumn .item-type-table .first-row').each(function() {
      if (!$(this).data('hidden-by-folder') && !$(this).data('hidden-by-tag')) {
        $(this).show();
      }
    });
    updateTagVisibility(html);
    applyAlternatingRowColors(html);
    checkTableVisibility(html);
    return;
  }

  html.find('#leftColumn .item-type-table .first-row').each(function() {
    const row = $(this);
    const uuid = row.data('uuid');
    const secondRow = html.find(`.second-row[data-uuid="${uuid}"]`);
    let matchesSearchCriteria = true;

    // 1. Apply General Search Terms
    if (generalSearchTerms.length > 0) {
      const firstRowText = row.text().toLowerCase();
      const secondRowText = secondRow.length ? secondRow.text().toLowerCase() : '';
      const searchableText = firstRowText + ' ' + secondRowText;
      
      let matchesAllGeneralTerms = true;
      for (const term of generalSearchTerms) {
        if (!searchableText.includes(term)) {
          matchesAllGeneralTerms = false;
          break;
        }
      }
      if (!matchesAllGeneralTerms) {
        matchesSearchCriteria = false;
      }
    }

    // 2. Apply Column-Specific Search Terms (only if still a potential match)
    if (matchesSearchCriteria && columnSearchTerms.length > 0) {
      const parentTable = row.closest('.item-type-table');
      if (parentTable.data('status') !== '+') { // Column search only applies to grid view tables
        matchesSearchCriteria = false; // Row in non-grid table cannot match column-specific criteria
      } else {
        const headerRow = parentTable.find('tr:has(td.itemFieldName)').first();
        const headerCells = headerRow.find('td.itemFieldName'); // These are the <td><b>Header</b></td>
        const rowDataCells = row.children('td').slice(1); // Data cells in current row, skipping button cell

        let satisfiesAllColumnFilters = true;
        for (const colSearch of columnSearchTerms) {
          let foundMatchInAnyApplicableColumn = false;
          headerCells.each((index, headerCellElement) => {
            const headerText = $(headerCellElement).text().trim().toLowerCase();
            if (headerText.startsWith(colSearch.headerPrefix)) {
              // This column's header matches the prefix
              const dataCell = rowDataCells.eq(index);
              if (dataCell.length) {
                const cellText = dataCell.text().trim().toLowerCase();
                const cellMatchesThisFilterValue = colSearch.values.some(searchValue => {
                  if (colSearch.isQuoted) {
                    return cellText === searchValue; // Exact match for OR'd values
                  } else {
                    // This is for non-quoted. colSearch.values will have only one element here.
                    return cellText.includes(searchValue); // MODIFIED: Check if cell text CONTAINS the search value
                  }
                });
                if (cellMatchesThisFilterValue) {
                  foundMatchInAnyApplicableColumn = true;
                  return false; // Break from .each headerCells (found a match for this colSearch)
                }
              }
            }
          });
          if (!foundMatchInAnyApplicableColumn) {
            satisfiesAllColumnFilters = false;
            break; // This row doesn't satisfy one of the column filters
          }
        }
        if (!satisfiesAllColumnFilters) {
          matchesSearchCriteria = false;
        }
      }
    }

    // Show/hide row based on search result and other filters
    if (matchesSearchCriteria) {
      row.data('hidden-by-search', false);
      if (!row.data('hidden-by-folder') && !row.data('hidden-by-tag')) {
        row.show();
      } else {
         row.hide(); // Hidden by other filters
      }
      // Second row state depends on its own flags and if it's expanded
      if (secondRow.length) {
        secondRow.data('hidden-by-search', false);
        // Don't auto-show/hide second row here, its visibility is handled by expansion toggle
        // and its own hidden-by-folder/tag flags if they were set independently (though unlikely)
      }
    } else {
      row.data('hidden-by-search', true);
      row.hide();
      if (secondRow.length) {
        secondRow.data('hidden-by-search', true);
        secondRow.hide(); // If first row is hidden by search, hide second row too
      }
    }
  });

  updateVisibleTagCheckboxes(html);
  applyAlternatingRowColors(html);
  checkTableVisibility(html);
}
/**
 * Apply alternating row background colors to visible rows
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 */
export function applyAlternatingRowColors(html) {
  html.find('.item-type-table').each(function() {
    const table = $(this);
    // Clear existing alternate classes
    table.find('.first-row, .second-row').removeClass('bg-alternate');
    // Iterate over visible first-rows in order
    let visibleCount = 0;
    table.find('.first-row').each(function() {
      if ($(this).css('display') !== 'none') {
        // Apply bg-alternate only to every other visible first-row (starting with the second one)
        if (visibleCount % 2 === 1) {
          $(this).addClass('bg-alternate');
          // Also apply to the paired second-row, if it exists
          const uuid = $(this).data('uuid');
          table.find(`.second-row[data-uuid="${uuid}"]`).addClass('bg-alternate');
        }
        visibleCount++;
      }
    });
  });
}
/**
 * Check and update visibility of tables based on visible rows
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 */
export function checkTableVisibility(html) {
  html.find('.item-type-table').each(function() {
    const table = $(this);
    const firstRows = table.find('.first-row');
    
    // Check if all first-rows have display:none
    let allHidden = true;
    
    firstRows.each(function() {
      if ($(this).css('display') !== 'none') {
        allHidden = false;
        return false; // Break the loop
      }
    });
    
    // Hide the table if all rows are hidden
    if (allHidden && firstRows.length > 0) {
      table.hide();
    } else {
      table.show();
    }
  });
}

/**
 * Build folder filter checkboxes in the right column
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {Array} folderPaths - Array of folder paths
 * @param {string} tabSource - The source tab name
 * @param {boolean} showHiddenFolders - Whether to show hidden folders
 */
export function buildFolderFilters(html, folderPaths, tabSource, showHiddenFolders) { // 'tabSource' here is the parameter passed in
  const rightColumn = html.find('#rightColumn');
  // Sort folder paths to ensure proper hierarchy before building the tree
  folderPaths.sort();

  // Create folder tree structure (needed for rebuild later)
  const folderTree = {};
  folderPaths.forEach(path => {
    const cleanPath = path.endsWith('\\') ? path.slice(0, -1) : path;
    if (!cleanPath) return;
    const parts = cleanPath.split('\\');
    let current = folderTree;
    let shouldAdd = true;
    if (!showHiddenFolders) {
      for (const part of parts) {
        if (isHiddenFolder(part)) {
          shouldAdd = false;
          break;
        }
      }
    }
    if (shouldAdd) {
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const currentPath = parts.slice(0, i + 1).join('\\') + '\\';
        if (!current[part]) {
          current[part] = {
            _path: currentPath,
            _children: {},
            _isHidden: isHiddenFolder(part)
          };
        }
        current = current[part]._children;
      }
    }
  });

  // --- Create HTML for folder tree with BOTH buttons ---
  let folderHeaderButtons = '';
  if (game.user.isGM) {
      folderHeaderButtons = `
        <button id="folder-drag-toggle" class="folder-drag-toggle" title="Toggle Folder Drag-and-Drop Reordering">
          <i class="fas fa-lock"></i>
        </button>
        <button id="folder-order-config" class="folder-drag-toggle" title="Configure Folder Order">
          <i class="fas fa-cog"></i>
        </button>
      `;
  }

  rightColumn.html(`
    <div class="folder-filters">
      <div class="folder-filter-header">
        ${folderHeaderButtons}
        <h3>Filter by Folder</h3>
      </div>
      <div class="folder-filter-container"></div>
    </div>
  `);
  // --- End HTML Creation ---

  const filterContainer = rightColumn.find('.folder-filter-container');

  // Get stored folder visibility settings
  const allFolderOrders = game.settings.get('lgs-item-viewer', 'folderOrders') || {};
  const folderOrder = allFolderOrders[tabSource] || []; // Use parameter 'tabSource'
  const folderVisibility = {};
  folderOrder.forEach(folder => {
    if (folder.path && folder.hasOwnProperty('gmOnly')) {
      folderVisibility[folder.path] = folder.gmOnly;
    }
  });

  // Recursive function to build folder checkboxes
  // (This function itself is unchanged, but it's called initially and during reset)
  function buildFolderCheckboxes(node, container, level = 0) {
    const indent = level * 10;
    // Use Object.keys and sort alphabetically for default order
    const sortedKeys = Object.keys(node).filter(key => !key.startsWith('_')).sort((a, b) => a.localeCompare(b));

    sortedKeys.forEach(key => {
      // if (key.startsWith('_')) return; // Already filtered
      const folderItem = node[key];
      const folderPath = folderItem._path;
      const isHidden = folderItem._isHidden;
      const hasChildren = Object.keys(folderItem._children).filter(k => !k.startsWith('_')).length > 0;
      if (isHidden && !showHiddenFolders) return;
      const isBold = level === 0 ? 'font-weight: bold;' : '';
      const isGmOnly = folderVisibility[folderPath] || false;
      if (isGmOnly && !game.user.isGM) return;
      const checkbox = $(`
        <div class="folder-filter-item${isHidden ? ' hidden-folder' : ''}"
             style="margin-left: ${indent}px;"
             data-path="${folderPath}"
             data-label="${key}"
             data-gm-only="${isGmOnly}">
            <input type="checkbox" class="folder-filter-checkbox" data-path="${folderPath}" data-label="${key}">
            <span class="tagFilterText" style="${isBold}">${key}</span>
            ${game.user.isGM ? `<i class="fas fa-ban gm-only-icon" style="position: relative; top:-5px; margin-left: 5px; color: ${isGmOnly ? 'black' : 'grey'}; cursor: pointer; display: none;"></i>` : ''}
        </div>
      `);
	  const hideGmHiddenFolders = game.user.isGM ? game.settings.get('lgs-item-viewer', 'hideGmHiddenFolders') : false;
      if(!isGmOnly || !hideGmHiddenFolders) container.append(checkbox);
      if (hasChildren && (!isGmOnly || game.user.isGM)) {
        buildFolderCheckboxes(folderItem._children, container, level + 1); // Recursive call for children
      }
    });
  }
  // Initial build of checkboxes
  buildFolderCheckboxes(folderTree, filterContainer);

  // Apply initial styling and GM-only icon visibility
  if (showHiddenFolders) {
    rightColumn.find('.hidden-folder').css({ 'color': '#999', 'font-style': 'italic' });
  }
  if (game.user.isGM) {
    rightColumn.find('.folder-filter-item[data-gm-only="true"] .gm-only-icon').show();
  }

  // Function to attach checkbox change listeners (used initially and after reset)
  function attachCheckboxListeners() {
      rightColumn.find('.folder-filter-checkbox').off('change').on('change', function() {
        // Update item visibility based on folder selection
        updateItemVisibility(html, tabSource); // Use parameter 'tabSource'
        applyAlternatingRowColors(html);
        checkTableVisibility(html);
      });
  }
  // Attach initial listeners
  attachCheckboxListeners();

  // Load stored folder order if available (will apply custom order over default build)
  loadFolderOrder(filterContainer, tabSource); // Use parameter 'tabSource'

  // --- Drag Lock Button Logic (Unchanged except for variable names) ---
  const dragToggleButton = rightColumn.find('#folder-drag-toggle');
  let dragEnabled = false;
  dragToggleButton.off('click').on('click', function() { // Use .off().on() to prevent multiple bindings if buildFolderFilters is called again
    dragEnabled = !dragEnabled;
    if (dragEnabled) {
      dragToggleButton.html('<i class="fas fa-unlock"></i>');
      rightColumn.find('.folder-filter-item').css({ 'border': '1px solid black', 'padding': '3px', 'margin-bottom': '2px', 'cursor': 'move' });
      if (game.user.isGM) {
        rightColumn.find('.gm-only-icon').show();
        rightColumn.find('.gm-only-icon').off('click').on('click', function(e) {
          e.stopPropagation();
          const icon = $(this); const folderItem = icon.closest('.folder-filter-item'); const isGmOnly = folderItem.attr('data-gm-only') === 'true';
          folderItem.attr('data-gm-only', !isGmOnly); icon.css('color', !isGmOnly ? 'black' : 'grey');
          saveFolderOrder(filterContainer, tabSource); // Use parameter 'tabSource'
        });
      }
      enableDragAndDrop(rightColumn);
    } else {
      dragToggleButton.html('<i class="fas fa-lock"></i>');
      rightColumn.find('.folder-filter-item').css({ 'border': 'none', 'padding': '0', 'margin-bottom': '0', 'cursor': 'default' });
      if (game.user.isGM) {
        rightColumn.find('.gm-only-icon').each(function() { const icon = $(this); const folderItem = icon.closest('.folder-filter-item'); const isGmOnly = folderItem.attr('data-gm-only') === 'true'; if (!isGmOnly) { icon.hide(); } });
        rightColumn.find('.gm-only-icon').off('click');
      }
      disableDragAndDrop(rightColumn);
      saveFolderOrder(filterContainer, tabSource); // Use parameter 'tabSource'
      // Reloading main content uses the *active* tab, not necessarily the one these filters were built for
      const currentlyActiveTabSource = html.find('.item-viewer-tab.active').data('source');
      if (currentlyActiveTabSource && currentlyActiveTabSource !== "info") {
          console.log(`LGS Item Viewer | Reloading content for active tab: ${currentlyActiveTabSource} after folder order change.`);
          const leftColumn = html.find('#leftColumn');
          const rightColumnContent = html.find('#rightColumn');
          leftColumn.empty();
          rightColumnContent.empty(); // Clear right column too to rebuild filters for active tab
          loadTabContent(html, currentlyActiveTabSource);
      } else {
          console.log("LGS Item Viewer | Active tab is 'info' or not found, no content reload triggered after folder order change.");
      }
    }
  }); // --- End Drag Lock Button Logic ---

  // --- Cog Icon / Reset Button Logic ---
  const configButton = rightColumn.find('#folder-order-config');
  configButton.off('click').on('click', () => { // Use .off().on()
    new Dialog({
      title: "Folder Order Configuration",
      content: `
        <form>
          <div class="form-group">
            <label for="reset-folder-order-checkbox">
              <input type="checkbox" id="reset-folder-order-checkbox" name="resetOrder">
              <span style="font-weight: bold;">Reset Folder Order</span>
            </label>
            <p class="notes">Checking this box will remove any custom folder order you've set for the '<strong>${tabSource}</strong>' tab using drag-and-drop. Folders will revert to their default alphabetical order within the hierarchy.</p>
          </div>
        </form>
      `,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Apply", // Changed label
          callback: async (dialogHtml) => {
            const shouldReset = dialogHtml.find('#reset-folder-order-checkbox').is(':checked');
            if (shouldReset) {
              const confirmed = await Dialog.confirm({
                title: "Confirm Reset",
                content: `<p>Are you sure you want to reset the folder order for the '<strong>${tabSource}</strong>' tab to the default?</p>`,
                yes: () => true,
                no: () => false,
                defaultYes: false
              });

              if (confirmed) {
                console.log(`LGS Item Viewer | Resetting folder order for tab: ${tabSource}`);
                try {
                  const currentOrders = game.settings.get('lgs-item-viewer', 'folderOrders') || {};
                  if (currentOrders.hasOwnProperty(tabSource)) {
                    delete currentOrders[tabSource];
                    await game.settings.set('lgs-item-viewer', 'folderOrders', currentOrders);
                    console.log(` - Removed folder order settings for tab: ${tabSource}`);

                    // --- Refresh the Folder Filter UI ---
                    // 1. Store currently checked states
                    const checkedPaths = new Set();
                    filterContainer.find('.folder-filter-checkbox:checked').each(function() {
                        checkedPaths.add($(this).data('path'));
                    });

                    // 2. Clear and rebuild the checkbox list using the default order
                    filterContainer.empty();
                    buildFolderCheckboxes(folderTree, filterContainer); // Rebuilds with default (tree/alphabetical) order

                    // 3. Restore checked states
                    filterContainer.find('.folder-filter-checkbox').each(function() {
                        if (checkedPaths.has($(this).data('path'))) {
                            $(this).prop('checked', true);
                        }
                    });

                    // 4. Re-apply styling and GM icon visibility
                    if (showHiddenFolders) {
                        filterContainer.find('.hidden-folder').css({ 'color': '#999', 'font-style': 'italic' });
                    }
                    if (game.user.isGM) {
                        filterContainer.find('.folder-filter-item[data-gm-only="true"] .gm-only-icon').show();
                        // Re-enable GM icon toggling ONLY if drag is currently enabled
                        if (dragEnabled) {
                             rightColumn.find('.gm-only-icon').off('click').on('click', function(e) { /* ... GM toggle logic ... */ });
                        }
                    }

                    // 5. Re-attach checkbox listeners
                    attachCheckboxListeners();

                    // 6. Reprocess journal entries for the new order
                    processLabelJournalEntries(html, tabSource); // Use parameter tabSource

                    // 7. Update item visibility based on potentially restored checkbox states
                    updateItemVisibility(html, tabSource); // Use parameter tabSource
                    applyAlternatingRowColors(html);
                    checkTableVisibility(html);


                    ui.notifications.info(`Folder order for tab '${tabSource}' reset.`);
                  } else {
                    ui.notifications.warn(`No custom folder order found for tab '${tabSource}' to reset.`);
                  }
                } catch (error) {
                  console.error(`LGS Item Viewer | Error resetting folder order for tab '${tabSource}':`, error);
                  ui.notifications.error("Failed to reset folder order. Check console (F12).");
                }
              } else {
                console.log(`LGS Item Viewer | Folder order reset cancelled for tab: ${tabSource}`);
                return false; // Prevent dialog close if reset cancelled after checking box
              }
            }
            // Implicitly return true if reset wasn't checked or confirmation passed
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "cancel", // Default to cancel as it's less destructive
      render: (dialogHtml) => {
        // Optional: Add listeners within the reset dialog if needed later
      }
    }).render(true);
  }); // --- End Cog Icon / Reset Button Logic ---

  // Initial processing of journal entries
  processLabelJournalEntries(html, tabSource); // Use parameter 'tabSource'
}

/**
 * Save the current order of folder items
 * @param {jQuery} container - The folder filter container
 * @param {string} tabSource - The source tab name
 */
function saveFolderOrder(container, tabSource) {
  const folderOrder = [];
  
  // Get all folder items in their current order
  container.find('.folder-filter-item').each(function() {
    const folderPath = $(this).data('path');
    const folderLabel = $(this).data('label');
    const isGmOnly = $(this).attr('data-gm-only') === 'true';
    
    folderOrder.push({
      path: folderPath,
      label: folderLabel,
      gmOnly: isGmOnly // Add GM-only status to saved data
    });
  });
  
  // Save folder order to settings
  const allFolderOrders = game.settings.get('lgs-item-viewer', 'folderOrders') || {};
  allFolderOrders[tabSource] = folderOrder;
  game.settings.set('lgs-item-viewer', 'folderOrders', allFolderOrders);
}

/**
 * Update item visibility based on selected folders
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source tab name
 */
function updateItemVisibility(html, tabSource) {
    const selectedFolders = [];

    // Get all checked folder paths
    html.find('.folder-filter-checkbox:checked').each(function() {
        selectedFolders.push($(this).data('path')); // e.g., "Armored Things\Armor\"
    });

    // Clear any previous filter flags
    html.find('#leftColumn .first-row, #leftColumn .second-row').each(function() {
        $(this).data('hidden-by-folder', false);
    });

    // Show all items if no folders are selected
    if (selectedFolders.length === 0) {
        html.find('#leftColumn .first-row').each(function() {
            if (!$(this).data('hidden-by-search') && !$(this).data('hidden-by-tag')) {
                $(this).show();
            }
            const uuid = $(this).data('uuid');
            html.find(`.second-row[data-uuid="${uuid}"]`).hide();
        });
        updateTagVisibility(html);
        applyAlternatingRowColors(html);
        checkTableVisibility(html); // Added check here too
        return;
    }

    // Filter items based on selected folders
    html.find('#leftColumn .first-row').each(function() {
        const row = $(this);
        const folderPath = row.data('folder'); // e.g., "Armored Things\Armored Addons\" or ""
        let shouldShow = false;
        let isGmOnlyFolder = false;

        if (!folderPath) {
            shouldShow = false;
        } else {
            selectedFolders.forEach(selectedPath => {
                // selectedPath remains unchanged for startsWith, e.g., "Armored Things\Armor\"

                if (folderPath.startsWith(selectedPath)) {
                    shouldShow = true;

                    // --- FIX IS HERE ---
                    // Escape backslashes ('\') with double backslashes ('\\')
                    // *only* for the jQuery selector string.
                    const escapedPathForSelector = selectedPath.replace(/\\/g, '\\\\');
                    // Now the selector will be like:
                    // .folder-filter-item[data-path="Armored Things\\Armor\\"]
                    const selector = `.folder-filter-item[data-path="${escapedPathForSelector}"]`;

                    // Use the corrected selector
                    const folderItem = html.find(selector);
                    // --- END FIX ---

                    if (folderItem.length && folderItem.attr('data-gm-only') === 'true') {
                        isGmOnlyFolder = true;
                    }
                    // No need to break, check all selected paths for GM status
                }
            });
        }

        // Hide from players if this item belongs to a GM-only folder AND the user is not a GM
        if (isGmOnlyFolder && !game.user.isGM) {
            row.data('hidden-by-folder', true);
            row.hide();
            const uuid = row.data('uuid');
            const secondRow = html.find(`.second-row[data-uuid="${uuid}"]`);
            if (secondRow.length) {
                secondRow.data('hidden-by-folder', true);
                secondRow.hide();
            }
            return; // Skip to the next item row
        }

        // Apply visibility based on folder match and other filters
        if (shouldShow) {
            row.data('hidden-by-folder', false);
            if (!row.data('hidden-by-search') && !row.data('hidden-by-tag')) {
                row.show();
            } else {
                row.hide();
            }
        } else {
            row.data('hidden-by-folder', true);
            row.hide();
            const uuid = row.data('uuid');
            const secondRow = html.find(`.second-row[data-uuid="${uuid}"]`);
            if (secondRow.length) {
                secondRow.data('hidden-by-folder', true);
                secondRow.hide();
            }
        }
    });

    // Apply tag filtering after folder filtering
    updateTagVisibility(html);

    // Apply alternating row colors based on final visibility
    applyAlternatingRowColors(html);

    // Check table visibility based on final row visibility
    checkTableVisibility(html);
}
	  
/**
 * Load the stored order of folder items
 * @param {jQuery} container - The folder filter container
 * @param {string} tabSource - The source tab name
 */
function loadFolderOrder(container, tabSource) {
  // Get stored folder orders
  const allFolderOrders = game.settings.get('lgs-item-viewer', 'folderOrders') || {};
  const folderOrder = allFolderOrders[tabSource];
  
  // If no stored order, return
  if (!folderOrder || !folderOrder.length) return;
  
  // Store all current items first
  const currentItems = {};
  
  // Map original positions to paths
  container.find('.folder-filter-item').each(function() {
    const path = $(this).data('path');
    currentItems[path] = $(this);
  });
  
  // Track which items were reattached
  const reattachedPaths = new Set();
  
  // Detach all items
  container.find('.folder-filter-item').detach();
  
  // Reattach in the stored order
  folderOrder.forEach(item => {
    const element = currentItems[item.path];
    if (element) {
      // Apply GM-only status from stored data
      if (item.hasOwnProperty('gmOnly')) {
        element.attr('data-gm-only', item.gmOnly);
        
        // Skip this folder for non-GM users if it's GM-only
        if (item.gmOnly && !game.user.isGM) {
          return;
        }
        
        if (game.user.isGM && item.gmOnly) {
          element.find('.gm-only-icon').css('color', 'black').show();
        }
      }
      
      container.append(element);
      reattachedPaths.add(item.path);
    }
  });
  
  // Process new items that weren't in the saved order
  // Group them by level (based on margin-left value)
  const newItemsByLevel = {};
  
  Object.entries(currentItems).forEach(([path, element]) => {
    if (!reattachedPaths.has(path)) {
      const level = parseInt($(element).css('margin-left') || '0');
      
      if (!newItemsByLevel[level]) {
        newItemsByLevel[level] = [];
      }
      
      newItemsByLevel[level].push({
        path: path,
        label: $(element).data('label'),
        element: element
      });
    }
  });
  
  // Get all container items after reattachment
  const existingItems = container.find('.folder-filter-item').get();
  
  // Sort and insert new items by level, starting with top level (0)
  const allLevels = Object.keys(newItemsByLevel).map(Number).sort((a, b) => a - b);
  
  allLevels.forEach(level => {
    // Get new items at this level
    const itemsAtLevel = newItemsByLevel[level];
    
    // Only sort items at this level
    itemsAtLevel.sort((a, b) => a.label.localeCompare(b.label));
    
    // For each item at this level
    itemsAtLevel.forEach(newItem => {
      // For level 0 (top level), insert alphabetically among other level 0 items
      if (level === 0) {
        let inserted = false;
        
        // Find the position to insert among existing level 0 items
        for (let i = 0; i < existingItems.length; i++) {
          const existingLevel = parseInt($(existingItems[i]).css('margin-left') || '0');
          
          // Only compare with other level 0 items
          if (existingLevel === 0) {
            const existingLabel = $(existingItems[i]).data('label');
            
            // If the new item comes before this existing item alphabetically
            if (newItem.label.localeCompare(existingLabel) < 0) {
              $(newItem.element).insertBefore(existingItems[i]);
              // Adjust the array to include our new item
              existingItems.splice(i, 0, newItem.element);
              inserted = true;
              break;
            }
          }
        }
        
        // If it wasn't inserted (comes after all existing level 0 items), append it
        if (!inserted) {
          container.append(newItem.element);
          existingItems.push(newItem.element);
        }
      } else {
        // For subfolders, find the parent folder and insert after it
        const parentPath = getParentPath(newItem.path);
        
        // Find the last item of the parent in the existing items
        let parentLastIndex = -1;
        for (let i = 0; i < existingItems.length; i++) {
          const itemPath = $(existingItems[i]).data('path');
          if (itemPath === parentPath || itemPath.startsWith(parentPath)) {
            parentLastIndex = i;
          }
        }
        
        // If we found the parent or one of its children, insert after it
        if (parentLastIndex >= 0) {
          if (parentLastIndex + 1 < existingItems.length) {
            $(newItem.element).insertBefore(existingItems[parentLastIndex + 1]);
            existingItems.splice(parentLastIndex + 1, 0, newItem.element);
          } else {
            container.append(newItem.element);
            existingItems.push(newItem.element);
          }
        } else {
          // If parent not found, just append at the end
          container.append(newItem.element);
          existingItems.push(newItem.element);
        }
      }
    });
  });
  
  // Helper function to get parent path
  function getParentPath(path) {
    if (!path) return '';
    // Remove trailing backslash if present
    const cleanPath = path.endsWith('\\') ? path.slice(0, -1) : path;
    // Split by backslash
    const parts = cleanPath.split('\\');
    // Remove the last part (current folder)
    parts.pop();
    // Join back with backslash and add trailing backslash
    return parts.length > 0 ? parts.join('\\') + '\\' : '';
  }
}
	
/**
 * Enable drag-and-drop for folder filter items
 * @param {jQuery} rightColumn - The right column jQuery element
 */
function enableDragAndDrop(rightColumn) {
  const folderItems = rightColumn.find('.folder-filter-item');

  // Make items draggable
  folderItems.attr('draggable', 'true');

  // --- DRAG START ---
  folderItems.off('dragstart').on('dragstart', function(event) { // Use .off().on() for safety
    // Prevent drag start on input/button/icon elements within the item
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.tagName === 'I' || event.target.tagName === 'SPAN') {
         event.preventDefault();
         return;
    }

    const originalEvent = event.originalEvent || event;
    const draggedPath = $(this).data('path');
    const draggedLevel = parseInt($(this).css('margin-left') || '0');
    const isGmOnly = $(this).attr('data-gm-only') === 'true';
    const sourceIndex = $(this).index('.folder-filter-item'); // Get index relative to siblings *with the same class*

    // Store necessary data
    originalEvent.dataTransfer.setData('text/plain', JSON.stringify({
      index: sourceIndex,
      path: draggedPath,
      level: draggedLevel,
      gmOnly: isGmOnly
    }));
    originalEvent.dataTransfer.effectAllowed = "move"; // Indicate it's a move operation

    // Add a class to the dragged element (visual feedback)
    $(this).addClass('dragging');
  });

  // --- DRAG END ---
  folderItems.off('dragend').on('dragend', function() { // Use .off().on()
    // Remove the dragging class from the source element
    $(this).removeClass('dragging');
    // Clear drag-over styles from all potential targets
    rightColumn.find('.folder-filter-item').removeClass('drag-over');
  });

  // --- DRAG OVER ---
  folderItems.off('dragover').on('dragover', function(event) { // Use .off().on()
    event.preventDefault(); // Necessary to allow dropping
    event.stopPropagation();
    const originalEvent = event.originalEvent || event;
    originalEvent.dataTransfer.dropEffect = "move"; // Explicitly set drop effect

    const targetElement = $(this);
    const targetLevel = parseInt(targetElement.css('margin-left') || '0');
    const targetPath = targetElement.data('path');
    const targetIndex = targetElement.index('.folder-filter-item');


    // Validation during dragover (optional but good for UX)
    try {
      const sourceData = JSON.parse(originalEvent.dataTransfer.getData('text/plain'));
      const sourceLevel = sourceData.level;
      const sourcePath = sourceData.path;
      const sourceIndex = sourceData.index;

      // Allow drop only if levels match AND not dropping onto self or its own descendants
      const isSelfOrDescendant = targetPath.startsWith(sourcePath); // Check if target is the source or a child of source

      if (sourceLevel === targetLevel && sourceIndex !== targetIndex && !isSelfOrDescendant) {
        targetElement.addClass('drag-over'); // Show valid drop target
      } else {
        targetElement.removeClass('drag-over'); // Indicate invalid drop
      }
    } catch (e) {
      targetElement.removeClass('drag-over'); // Invalid data or parsing error
    }
  });

  // --- DRAG LEAVE ---
  folderItems.off('dragleave').on('dragleave', function(event) { // Use .off().on()
    // Only remove if leaving the row itself, not moving between child elements
    if (event.target === this || !this.contains(event.relatedTarget)) {
        $(this).removeClass('drag-over');
    }
  });

  // --- DROP ---
  folderItems.off('drop').on('drop', function(event) { // Use .off().on()
    event.preventDefault();
    event.stopPropagation();

    const targetElement = $(this);
    targetElement.removeClass('drag-over'); // Remove drop highlight

    // --- 1. Get Source and Target Data ---
    let sourceData;
    try {
      sourceData = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
    } catch (e) {
      console.error("LGS Item Viewer | Error parsing drag data:", e);
      return; // Abort drop if data is invalid
    }

    const sourceIndex = sourceData.index;
    const sourcePath = sourceData.path;
    const sourceLevel = sourceData.level;
    const sourceGmOnly = sourceData.gmOnly; // Preserve GM Only status

    const targetIndex = targetElement.index('.folder-filter-item');
    const targetLevel = parseInt(targetElement.css('margin-left') || '0');
    const targetPath = targetElement.data('path');

    // --- 2. Final Validation ---
    const isSelfOrDescendant = targetPath.startsWith(sourcePath);
    if (sourceLevel !== targetLevel || sourceIndex === targetIndex || isSelfOrDescendant) {
        // Log reason for invalid drop if needed for debugging
         if(sourceIndex === targetIndex){ console.log("LGS Item Viewer | Drop cancelled: cannot drop item onto itself."); }
         else if (sourceLevel !== targetLevel) { console.log("LGS Item Viewer | Drop cancelled: item level mismatch."); }
         else if (isSelfOrDescendant) { console.log("LGS Item Viewer | Drop cancelled: cannot drop item onto itself or one of its descendants."); }
         else { console.log("LGS Item Viewer | Drop cancelled: Unknown reason."); }
        return; // Abort drop if validation fails
    }

    // --- 3. Identify the Block to Move ---
    const container = rightColumn.find('.folder-filter-container');
    const allItemsBeforeDetach = container.children('.folder-filter-item').toArray(); // Get all items in current order
    const sourceItemElement = allItemsBeforeDetach[sourceIndex]; // The actual dragged element

    if (!sourceItemElement) {
        console.error("LGS Item Viewer | Could not find source element for drop operation at index", sourceIndex);
        return;
    }

    const itemsToMove = [];
    itemsToMove.push(sourceItemElement); // Start with the dragged item

    // Find subsequent children/descendants
    for (let i = sourceIndex + 1; i < allItemsBeforeDetach.length; i++) {
        const currentItem = allItemsBeforeDetach[i];
        const currentItemLevel = parseInt($(currentItem).css('margin-left') || '0');

        if (currentItemLevel > sourceLevel) {
            // This item is a child/descendant of the dragged item
            itemsToMove.push(currentItem);
        } else {
            // Found an item at the same level or higher - end of the block
            break;
        }
    }
    console.log(`LGS Item Viewer | Moving block of ${itemsToMove.length} items starting with:`, $(sourceItemElement).data('label'));

    // --- 4. Detach the Block ---
    const detachedItems = itemsToMove.map(item => $(item).detach());

    // --- 5. Insert the Block ---
    // Re-find the target element in the potentially modified DOM (safer)
    const currentTargetElement = container.children('.folder-filter-item').eq(targetIndex); // Find target by its index *now*

    if (sourceIndex < targetIndex) {
        // Moving DOWN: Insert the block *after* the target element.
        // Iterate in reverse to maintain order when inserting multiple items after the *same* target.
         $.each(detachedItems.reverse(), function(idx, item) {
             item.insertAfter(currentTargetElement);
         });
    } else {
        // Moving UP: Insert the block *before* the target element.
        // Iterate normally when inserting multiple items before the target.
         $.each(detachedItems, function(idx, item) {
             item.insertBefore(currentTargetElement);
         });
    }

    // --- 6. Post-Drop Cleanup and Listener Re-attachment ---
    // Preserve GM-only status visually on the moved header
    $(sourceItemElement).attr('data-gm-only', sourceGmOnly);
    if (game.user.isGM) {
        const gmIcon = $(sourceItemElement).find('.gm-only-icon');
        if (gmIcon.length > 0) {
            gmIcon.css('color', sourceGmOnly ? 'black' : 'grey');
            // Ensure visibility matches drag-lock state
             if (dragToggleButton.find('i').hasClass('fa-unlock')) { // Check if currently unlocked
                 gmIcon.show();
             } else if (!sourceGmOnly) {
                 gmIcon.hide();
             }
        }
    }

    // Re-apply drag and drop listeners to *all* items to ensure functionality
    // after the DOM manipulation. It's crucial to disable/re-enable.
    disableDragAndDrop(rightColumn); // Disable listeners on the potentially old set/order
    enableDragAndDrop(rightColumn);  // Re-enable listeners on the new DOM order

    // Re-apply visual styles (like borders) if drag mode is currently active
    if (dragToggleButton.find('i').hasClass('fa-unlock')) {
      container.find('.folder-filter-item').css({
        'border': '1px solid black',
        'padding': '3px',
        'margin-bottom': '2px',
        'cursor': 'move'
      });
    }

     // Note: Saving the order happens when the lock toggle is clicked off, not on every drop.

  }); // --- End Drop Handler ---
}

/**
 * Disable drag-and-drop for folder filter items
 * @param {jQuery} rightColumn - The right column jQuery element
 */
function disableDragAndDrop(rightColumn) {
  const folderItems = rightColumn.find('.folder-filter-item');
  
  // Disable dragging
  folderItems.attr('draggable', 'false');
  
  // Remove all drag events
  folderItems.off('dragstart dragend dragover dragleave drop');
}
/**
 * Process folder labels to check for journal entries
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source tab name
 */
export function processLabelJournalEntries(html, tabSource) {
    // Get the currently active tab
    const activeTab = html.find('.item-viewer-tab.active');
    if (!activeTab.length || activeTab.data('source') === 'info') {
        return; // Skip if on the info tab or no active tab
    }

    // Get all the folder filter checkboxes (needed for non-grouped folder checks)
    const folderCheckboxes = html.find('.folder-filter-checkbox');

    // Get the display mode setting and dialog dimensions
    const displayMode = game.settings.get('lgs-item-viewer', 'itemSupportDisplay');
    const dialogWidth = game.settings.get('lgs-item-viewer', 'journalDialogWidth');
    const dialogHeight = game.settings.get('lgs-item-viewer', 'journalDialogHeight');

    // Process each item table
    html.find('.item-type-table').each(function() {
        const table = $(this);
        const journalNotesDiv = table.find('.journalNotes');
        const journalTagsDiv = table.find('.journalTags');

        // Clear existing content
        journalNotesDiv.empty();
        journalTagsDiv.empty();

        // --- Get table context ---
        const tableOriginalType = table.data('original-type'); // e.g., "gear"
        const tableFolderGroup = table.data('folder-group'); // e.g., "Magic" or null/undefined
        const isGroupedTable = !!tableFolderGroup; // True if data-folder-group has a value

        // List to track found journal pages for this specific table
        const foundJournalPages = []; // For .journalNotes (Folder support)
        const foundTagPages = []; // For .journalTags (Tag support)

        // --- 1. Check for Folder Support Journal Pages ---
        if (isGroupedTable) {
            // --- Grouped Table Folder Support ---
            // Pattern: "FolderName (Folder-ItemType)" e.g., "Gear (magic-gear)"
            // Here, "FolderName" is the folder group name itself.
            const folderKey = tableFolderGroup.toLowerCase() + '-' + tableOriginalType.toLowerCase();
            const pageNamePattern = `${tableFolderGroup} (${folderKey})`; // Construct the specific page name
            const journalPage = checkJournalPageExists(pageNamePattern); // Case-insensitive check

            if (journalPage) {
                // Check for duplicates (unlikely here, but good practice)
                const alreadyExists = foundJournalPages.some(entry =>
                    entry.label === tableFolderGroup && entry.type === tableOriginalType && !entry.isTag
                );
                if (!alreadyExists) {
                    foundJournalPages.push({
                        label: tableFolderGroup, // Use the folder group name as the label
                        type: tableOriginalType,
                        page: journalPage,
                        isTag: false,
                        lookupName: pageNamePattern // Store the name used for lookup
                    });
                }
            }
        } else {
            // --- Non-Grouped Table Folder Support ---
            // Original logic: Check against visible folder filter checkboxes
            // Pattern: "CheckboxLabel (ItemType)" e.g., "Gear (gear)"
            folderCheckboxes.each(function() {
                const checkboxLabel = $(this).data('label'); // e.g., "Gear"
                const pageNamePattern = `${checkboxLabel} (${tableOriginalType})`; // Construct name
                const journalPage = checkJournalPageExists(pageNamePattern); // Case-insensitive check

                if (journalPage) {
                    // Check for duplicates
                    const alreadyExists = foundJournalPages.some(entry =>
                        entry.label === checkboxLabel && entry.type === tableOriginalType && !entry.isTag
                    );
                    if (!alreadyExists) {
                        foundJournalPages.push({
                            label: checkboxLabel, // Use checkbox label
                            type: tableOriginalType,
                            page: journalPage,
                            isTag: false,
                            lookupName: pageNamePattern // Store the name used for lookup
                        });
                    }
                }
            });
        }

        // --- 2. Check for Tag Support Journal Pages ---
        const uniqueTags = new Set();
        table.find('.first-row').each(function() {
            const tagStr = $(this).attr('data-tags');
            if (tagStr && tagStr.trim()) {
                tagStr.split(',').forEach(tag => {
                    const trimmedTag = tag.trim();
                    if (trimmedTag) {
                        uniqueTags.add(trimmedTag); // Keep original case for display label
                    }
                });
            }
        });

        uniqueTags.forEach(tag => { // tag e.g., "Kit"
            let pageNamePattern;
            if (isGroupedTable) {
                // --- Grouped Table Tag Support ---
                // Pattern: "TagName (tag) (Folder-ItemType)" e.g., "Kit (tag) (magic-gear)"
                const folderKey = tableFolderGroup.toLowerCase() + '-' + tableOriginalType.toLowerCase();
                pageNamePattern = `${tag} (tag) (${folderKey})`;
            } else {
                // --- Non-Grouped Table Tag Support ---
                // Pattern: "TagName (tag) (ItemType)" e.g., "Kit (tag) (gear)"
                pageNamePattern = `${tag} (tag) (${tableOriginalType})`;
            }

            const tagJournalPage = checkJournalPageExists(pageNamePattern); // Case-insensitive check

            if (tagJournalPage) {
                // Check for duplicates
                const alreadyExists = foundTagPages.some(entry =>
                    entry.label === tag && entry.type === tableOriginalType && entry.isTag
                );
                if (!alreadyExists) {
                    foundTagPages.push({
                        label: tag, // Use the original tag case for the label
                        type: tableOriginalType,
                        page: tagJournalPage,
                        isTag: true,
                        lookupName: pageNamePattern // Store the name used for lookup
                    });
                }
            }
        });

        // --- 3. Populate UI based on found pages ---

        // Populate .journalNotes (Folder Support)
        if (foundJournalPages.length > 0) {
            if (displayMode === "collapsable") {
                const linksHtml = foundJournalPages.map(entry =>
                    // Use entry.lookupName for getPageInfo call
                    `<span class="journal-link" data-label="${entry.label}" data-type="${entry.type}" data-is-tag="${entry.isTag}" data-lookup-name="${entry.lookupName}">▶${entry.label}</span>`
                ).join(' ');
                journalNotesDiv.html(linksHtml);
            } else { // journalPage mode
                const buttonsHtml = foundJournalPages.map(entry =>
                     // Use entry.lookupName for getPageInfo call
                    `<button class="journal-pill-button" data-label="${entry.label}" data-type="${entry.type}" data-is-tag="${entry.isTag}" data-lookup-name="${entry.lookupName}">${entry.label}</button>`
                ).join(' ');
                journalNotesDiv.html(buttonsHtml);
            }
        }

        // Populate .journalTags (Tag Support)
        if (foundTagPages.length > 0) {
            if (displayMode === "collapsable") {
                const tagLinksHtml = foundTagPages.map(entry =>
                     // Use entry.lookupName for getPageInfo call
                    `<span class="journal-link tag-link" data-label="${entry.label}" data-type="${entry.type}" data-is-tag="${entry.isTag}" data-lookup-name="${entry.lookupName}">▶${entry.label}</span>`
                ).join(' ');
                journalTagsDiv.html(tagLinksHtml);
                journalTagsDiv.find('.tag-link').css({ // Add styling directly here if needed
                    'color': '#4a86e8',
                    'cursor': 'pointer'
                });
            } else { // journalPage mode
                const tagButtonsHtml = foundTagPages.map(entry =>
                     // Use entry.lookupName for getPageInfo call
                    `<button class="journal-tag-pill-button" data-label="${entry.label}" data-type="${entry.type}" data-is-tag="${entry.isTag}" data-lookup-name="${entry.lookupName}">${entry.label}</button>`
                ).join(' ');
                journalTagsDiv.html(tagButtonsHtml);
            }
        }

        // --- 4. Add Event Listeners ---
        if (displayMode === "collapsable") {
            table.find('.journal-link').click(function() {
                const clickedElement = $(this);
                const clickedLabel = clickedElement.data('label');
                // const clickedType = clickedElement.data('type'); // Not strictly needed for lookup now
                // const isTag = clickedElement.data('is-tag') === true; // Not strictly needed for lookup now
                const pageNameToLoad = clickedElement.data('lookup-name'); // Use the stored lookup name

                const isActive = clickedElement.hasClass('active');

                // Reset state for all links in this table
                table.find('.journal-link').removeClass('active').each(function() {
                    $(this).html(`▶${$(this).data('label')}`);
                });
                table.find('.journal-content-display').remove();

                if (!isActive) {
                    clickedElement.addClass('active').html(`▼${clickedLabel}`);
                    // Get journal page content using the specific lookup name
                    const content = getPageInfo(pageNameToLoad);
                    const contentDiv = $(`<div class="journal-content-display">${content}</div>`);
                    table.find('.journalDescription').html(contentDiv); // Display content
                }
            });
        } else { // journalPage mode
            table.find('.journal-pill-button, .journal-tag-pill-button').click(function() {
                const clickedElement = $(this);
                const clickedLabel = clickedElement.data('label');
                const clickedType = clickedElement.data('type'); // Keep type for Dialog ID
                const pageNameToLoad = clickedElement.data('lookup-name'); // Use the stored lookup name

                const content = getPageInfo(pageNameToLoad); // Get content using specific lookup name

                // Create and render the dialog
                new Dialog({
                    title: clickedLabel, // Use tag/folder name for title
                    content: `<div class="journal-dialog-content" style="min-height:${dialogHeight-85}px">${content}</div>`,
                    buttons: {
                        close: { icon: '<i class="fas fa-times"></i>', label: "Close" }
                    },
                    default: "close"
                }, {
                    width: dialogWidth,
                    height: dialogHeight,
                    id: `${clickedType}-pillDialog-${Date.now()}`, // Add timestamp for uniqueness
                    classes: ["itemViewerJournalDialog"]
                }).render(true);
            });
        }
    }); // End table processing loop
}

/**
 * Check if a journal page exists in the Catalog Viewer Journal
 * @param {string} pageName - The name of the page to check
 * @returns {Object|null} - The journal page or null if not found
 */
function checkJournalPageExists(pageName) {
  pageName = pageName.replaceAll("-folder-","-"); // Keep this existing replacement
  const journal = game.journal.getName("Catalog Viewer Journal"); // Case-sensitive journal name lookup
  if (!journal) {
      // console.warn(`LGS Item Viewer | Journal "Catalog Viewer Journal" not found.`);
      return null;
  }

  // Case insensitive page name search within the found journal
  const lowerCasePageName = pageName.toLowerCase();
  let output = journal.pages.find(p => p.name.toLowerCase() === lowerCasePageName) || null;

  // Debugging log if needed
  // if (output) {
  //     console.log(`LGS Item Viewer | Found page "${pageName}" (lookup was case-insensitive).`);
  // } else {
  //     console.log(`LGS Item Viewer | Page "${pageName}" not found (lookup was case-insensitive).`);
  // }

  return output;
}

/**
 * Create HTML table for a group of items
 * @param {string} type - The item type
 * @param {Array} items - The items of this type
 * @param {Object} typeConfig - The field configuration for this type
 * @param {string} status - The current display status (+ or -)
 * @param {string} tabSource - The source tab name
 * @param {string|null} [folderGroup=null] - The folder group name, if grouping by folder
 * @returns {string} The HTML for the table (potentially wrapped in details/summary for GM)
 */
export async function createItemTable(type, items, typeConfig, status, tabSource, folderGroup = null, requestToken, getLatestToken) {
  if (requestToken !== getLatestToken()) {
    return '';
  }

  let fields;
  let baseItemTypeDisplay = type !== "undefined" ? type : (items[0]?.constructor.name || 'Unknown');
  if (baseItemTypeDisplay.toLowerCase() === 'journalentry') {
    fields = [ { name: 'Name', object: 'name', sortIndex: '', alignLeft: true } ];
    baseItemTypeDisplay = "Journals";
    typeConfig = { type: "JournalEntry", fields: fields };
  } else {
    const fieldConfigs = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
    const foundConfig = fieldConfigs.find(config => config.type.toLowerCase() === type.toLowerCase() && config.type.toLowerCase() !== 'journalentry');
    if (foundConfig && foundConfig.fields.length > 0) {
      fields = foundConfig.fields;
      typeConfig = foundConfig;
    } else {
      fields = [{ name: 'Name', object: 'name', sortIndex: '', alignLeft: false }];
      typeConfig = { type: type, fields: fields };
    }
  }

  const sanitizedTabSource = tabSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const sanitizedType = type.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const settingsKey = folderGroup ?
    `${sanitizedTabSource}-${sanitizedType}-folder-${folderGroup.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}` :
    `${sanitizedTabSource}-${sanitizedType}`;

  const hideFromPlayerKey = `${settingsKey}-hideFromPlayer`;
  const tableNameKey = `${settingsKey}-tableName`;
  const subHeaderNameKey = `${settingsKey}-subHeaderName`;
  const tableMessageKey = `${settingsKey}-tableMessage`;
  const imgHeightKey = `${settingsKey}-imgHeight`;
  const imgWidthKey = `${settingsKey}-imgWidth`;
  const imgLocationKey = `${settingsKey}-imgLocation`;
  const imgTrimKey = `${settingsKey}-imgTrim`;
  const hideFolderNameKey = `${settingsKey}-hideFolderName`;

  const displaySettings = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
  const hideFromPlayer = displaySettings[hideFromPlayerKey] === true;

  if (hideFromPlayer && !game.user.isGM) return '';

  const customTableName = displaySettings[tableNameKey] || '';
  const customSubHeaderName = displaySettings[subHeaderNameKey] || '';
  const tableMessageRaw = displaySettings[tableMessageKey] || '';
  let tableMessageProcessed = replaceSystemSymbols(tableMessageRaw);

  const imgHeight = parseInt(displaySettings[imgHeightKey]) || 500;
  const imgWidth = parseInt(displaySettings[imgWidthKey]) || 400;
  const imgLocation = displaySettings[imgLocationKey] || 'right';
  const imgTrim = displaySettings[imgTrimKey] || false;
  const hideFolderName = displaySettings[hideFolderNameKey] === true;
  const dataType = settingsKey;

  let tableHtml = `<table class="item-type-table" data-type="${dataType}" data-status="${status}" data-original-type="${type}" ${folderGroup ? `data-folder-group="${folderGroup}"` : ''} data-hide-from-player="${hideFromPlayer}"><tbody>`;
  let displayHeaderName = customTableName || (baseItemTypeDisplay.charAt(0).toUpperCase() + baseItemTypeDisplay.slice(1));
  let subHeaderText = customSubHeaderName || (folderGroup && !hideFolderName ? folderGroup : '');
  let headerTitle = `<span class="tableHeader">${displayHeaderName}</span>`;
  if (subHeaderText) headerTitle += `<br><span class="tableSubHeader">(${subHeaderText})</span>`;
  let gmIconHtml = (game.user.isGM && hideFromPlayer) ? `<i class="fas fa-ban" title="Hidden From Players"></i> ` : '';
  headerTitle = gmIconHtml + headerTitle;

  const gridViewFields = fields.filter(f => !f.object.includes('description') && !f.object.includes('biography') && !(type.toLowerCase() === 'journalentry' && f.object === 'content'));
  const colspanValue = status === '+' ? gridViewFields.length + 1 : 2;

  let enrichedTableMessage = '';
  if (tableMessageProcessed && tableMessageProcessed.trim() !== '' && tableMessageProcessed.trim() !== '<p></p>') {
      try {
          if (requestToken !== getLatestToken()) return '';
          enrichedTableMessage = await TextEditor.enrichHTML(tableMessageProcessed, {async: true});
          if (requestToken !== getLatestToken()) return '';
      } catch (e) {
          console.error("Error enriching table message:", e);
          enrichedTableMessage = tableMessageProcessed;
      }
  }


  tableHtml += `<tr class="itemCategoryHeader"><td style="padding:10px;" colspan="${colspanValue}">
    <div class="itemCategoryContainer" style="text-align:center;"><strong>${headerTitle}</strong></div>
    ${game.user.isGM ? `<button class="table-config-button" data-tab="${tabSource}" data-type="${type}" ${folderGroup ? `data-folder-group="${folderGroup}"` : ''}><i class="fas fa-cog"></i></button>` : ''}
    <div class="allNotes"><div class="journalNotes"></div><div class="journalTags"></div></div>
    <div class="journalDescription"></div>
    <div class="itemCategoryMessage">${enrichedTableMessage}</div></td></tr>`;

  const hideRows = $('#hide-table-rows').is(':checked');

  if (status === '+') { // Grid View
    tableHtml += `<tr><td></td>`;
    gridViewFields.forEach(field => {
        const textAlign = field.alignLeft ? 'text-align: left;' : 'text-align: center;';
        tableHtml += `<td class="itemFieldName" style="${textAlign}"><b>${replaceSystemSymbols(field.name)}</b></td>`;
    });
    tableHtml += `</tr>`;

    if (!hideRows) {
        const rowGenerationPromises = items.map(async item => {
            if (requestToken !== getLatestToken()) return ''; 

            let firstRowHtml = '';
            let secondRowHtml = '';
            const itemUuid = item.uuid;
            const itemTags = getNestedPropertyFromSystem(item, 'flags.item-tags.tags');
            const tagsCSV = itemTags && Array.isArray(itemTags) ? itemTags.join(',') : '';
            const linkDataType = (item instanceof JournalEntry) ? "JournalEntry" : "Item";
            const linkIcon = (item instanceof JournalEntry) ? "fa-book-open" : "fa-file-lines";
            const hasHiddenTag = tagsCSV ? tagsCSV.includes("hide") : false;

            if((game.user.isGM == false && hasHiddenTag == false) || game.user.isGM == true) {
                firstRowHtml += `<tr class="first-row" data-uuid="${itemUuid}" data-folder="${item.folderPath || ''}" data-tags="${tagsCSV}">`;
                firstRowHtml += `<td class="showItemButton"><a class="content-link" draggable="true" data-link="" data-uuid="${item.uuid}" data-id="${item._id}" data-type="${linkDataType}" data-scope=""><i class="fas ${linkIcon}"></i></a></td>`;
                gridViewFields.forEach(field => {
                    const objectPath = field.object.startsWith('item.') ? field.object.substring(5) : field.object;
                    const bannedRow = hasHiddenTag && objectPath == "name"  ? ` <i class="fas fa-ban" title="Hidden From Players"></i>` : "";
                    let fieldValue = getNestedPropertyFromSystem(item, objectPath);
                    fieldValue = processSystemVariations(item, objectPath, fieldValue); 
                    const processedFieldValue = replaceSystemSymbols(String(fieldValue ?? '')); 
                    const textAlign = field.alignLeft ? 'text-align: left;' : 'text-align: center;';
                    firstRowHtml += `<td style="${textAlign}">${processedFieldValue !== undefined ? processedFieldValue : 'field?'}${bannedRow}</td>`;
                });
                firstRowHtml += `</tr>`;

                let secondRowContentCombined = '';
                if (item instanceof JournalEntry) {
                    secondRowContentCombined = journalGetJournalContent(item.uuid, false); 
                } else {
                    if (requestToken !== getLatestToken()) return '';
                    secondRowContentCombined = await getDescriptionContent(fields, item, requestToken, getLatestToken);
                    if (requestToken !== getLatestToken() || secondRowContentCombined === null) return '';
                }

                const hasTextContent = secondRowContentCombined && typeof secondRowContentCombined === 'string' && secondRowContentCombined.trim() !== '' && secondRowContentCombined.trim() !== '<p></p>';
                let secondRowTextHtml = '';
                if (hasTextContent) {
                    if (requestToken !== getLatestToken()) return '';
                    const enrichedSecondRowContent = await TextEditor.enrichHTML(secondRowContentCombined, {async: true});
                    if (requestToken !== getLatestToken()) return '';
                    let textForWrapper = `<div class="${(item instanceof JournalEntry) ? 'journal-entry-content' : ''}">${enrichedSecondRowContent}</div>`;
                    secondRowTextHtml = `<div class="item-details-text">${textForWrapper}</div>`; 
                } else {
                    secondRowTextHtml = '<div class="item-details-text no-description">No description</div>';
                }
                const secondRowImageHtml = generateItemImageHtml(item, imgHeight, imgWidth, imgLocation, imgTrim);
                const secondRowColspan = colspanValue;
                const locationClass = `image-location-${imgLocation}`;
                secondRowHtml += `<tr class="second-row" data-uuid="${itemUuid}" data-folder="${item.folderPath || ''}" data-tags="${tagsCSV}" style="display:none;">`;
                secondRowHtml += `<td colspan="${secondRowColspan}"><div class="item-details-wrapper ${locationClass}">${secondRowImageHtml}${secondRowTextHtml}</div></td></tr>`;
            }
            return firstRowHtml + secondRowHtml;
        });
        if (requestToken !== getLatestToken()) return '';
        const resolvedRowsHtmlArray = await Promise.all(rowGenerationPromises);
        if (requestToken !== getLatestToken()) return '';
        tableHtml += resolvedRowsHtmlArray.filter(r => r !== '').join('');
    }
  } else { // Collapsed View
    if (!hideRows) {
        const rowGenerationPromises = items.map(async item => {
            if (requestToken !== getLatestToken()) return '';

            let rowHtml = '';
            const itemUuid = item.uuid;
            const itemTags = getNestedPropertyFromSystem(item, 'flags.item-tags.tags');
            const tagsCSV = itemTags && Array.isArray(itemTags) ? itemTags.join(',') : '';
            const linkDataType = (item instanceof JournalEntry) ? "JournalEntry" : "Item";
            const linkIcon = (item instanceof JournalEntry) ? "fa-book-open" : "fa-file-lines";
            const itemButton = `<a class="content-link" draggable="true" data-link="" data-uuid="${item.uuid}" data-id="${item._id}" data-type="${linkDataType}" data-scope=""><i class="fas ${linkIcon}"></i></a>`;
            const locationClass = `image-location-${imgLocation}`;
            const hasHiddenTag = tagsCSV ? tagsCSV.includes("hide") : false;

            if((game.user.isGM == false && hasHiddenTag == false) || game.user.isGM == true) {
                rowHtml += `<tr class="first-row" data-uuid="${itemUuid}" data-folder="${item.folderPath || ''}" data-tags="${tagsCSV}">`;
                rowHtml += `<td class="showItemButton">${itemButton}</td><td><div class="item-details-wrapper ${locationClass}">`;
                rowHtml += generateItemImageHtml(item, imgHeight, imgWidth, imgLocation, imgTrim);
                rowHtml +=`<div class="allRowData item-details-text">`;

                fields.forEach((field, index) => {
                   if (!field.object.includes('description') && !field.object.includes('biography') && !(type.toLowerCase() === 'journalentry' && field.object === 'content')) {
                     const objectPath = field.object.startsWith('item.') ? field.object.substring(5) : field.object;
                     const bannedRow = hasHiddenTag && objectPath == "name"  ? ` <i class="fas fa-ban" title="Hidden From Players"></i>` : "";
                     let fieldValue = getNestedPropertyFromSystem(item, objectPath);
                     fieldValue = processSystemVariations(item, objectPath, fieldValue); 
                     let processedFieldValue = replaceSystemSymbols(String(fieldValue ?? '')); 
                     if (index === 0) { 
                       rowHtml += `<span class="itemNameCombinedView">${processedFieldValue !== undefined ? processedFieldValue : 'field?'}${bannedRow}</span>`;
                     } else {
                       rowHtml += `<div class="fullTableView"><span class="singleCellCat">${replaceSystemSymbols(field.name)}</span>: ${processedFieldValue !== undefined ? processedFieldValue : 'field?'}${bannedRow}</div>`;
                     }
                   }
                });

                let collapsedContentRaw = '';
                if (item instanceof JournalEntry) {
                     collapsedContentRaw = journalGetJournalContent(item.uuid, false); 
                } else {
                     if (requestToken !== getLatestToken()) return '';
                     collapsedContentRaw = await getDescriptionContent(fields, item, requestToken, getLatestToken); 
                     if (requestToken !== getLatestToken() || collapsedContentRaw === null) return '';
                }

                if (collapsedContentRaw && typeof collapsedContentRaw === 'string' && collapsedContentRaw.trim() !== '' && collapsedContentRaw.trim() !== '<p></p>') {
                    const contentClass = item instanceof JournalEntry ? "journalContentsCollapsed journal-entry-content" : "itemContentsCollapsed";
                    if (requestToken !== getLatestToken()) return '';
                    const enrichedCollapsedContent = await TextEditor.enrichHTML(collapsedContentRaw, {async: true});
                    if (requestToken !== getLatestToken()) return '';
                    rowHtml += `<div class="${contentClass}">${enrichedCollapsedContent}</div>`;
                }
                rowHtml += `</div></div></td></tr>`;
              }
              return rowHtml;
          });
          if (requestToken !== getLatestToken()) return '';
          const resolvedRowsHtmlArray = await Promise.all(rowGenerationPromises);
          if (requestToken !== getLatestToken()) return '';
          tableHtml += resolvedRowsHtmlArray.filter(r => r !== '').join('');
    }
  }
  tableHtml += `</tbody></table>`;

  if (game.user.isGM && hideFromPlayer) {
      let summaryText = customTableName || (baseItemTypeDisplay.charAt(0).toUpperCase() + baseItemTypeDisplay.slice(1));
      if (subHeaderText) summaryText += ` (${subHeaderText})`;
      summaryText = gmIconHtml + summaryText;
      tableHtml = `<details class="hidden-item-table-details" data-type="${dataType}"><summary>${summaryText}</summary>${tableHtml}</details>`;
  }
  return tableHtml;
}

/**
 * Generate HTML for item image if it's valid
 * @param {Object} item - The item object
 * @param {string} imageClass - The CSS class to apply to the image
 * @returns {string} HTML for the image or empty string
 */
function generateItemImageHtml(item, maxHeight, maxWidth, location, trim) {
  // Check if the item has a valid image
  const hasValidImage = item.img && !item.img.includes("item-bag") && !item.img.includes("mystery-man");

  if (!hasValidImage) return '';

  // Base container class
  let containerClass = 'item-image-container';
  let containerStyle = ''; // No inline styles needed for location anymore if using flex parent

  // Add trim class if needed
  if (trim) {
    containerClass += ' image-container-trim';
    // Set fixed height on the container for trimming to work
    //containerStyle += `height: ${maxHeight}px; width: ${maxWidth}px;`; // Trim needs fixed dimensions on container
  } else {
      // If not trimming, apply max dimensions directly to container, img maxes will handle aspect ratio
    //  containerStyle += `height: ${maxHeight}px; width: ${maxWidth}px;`;
  }


  // Apply max dimensions to the image tag itself via style to respect aspect ratio
  let imgStyle="";
  if(trim){
	imgStyle = `height: ${maxHeight}px; width: ${maxWidth}px;`;
  } else {
	imgStyle = `max-height: ${maxHeight}px; max-width: ${maxWidth}px;`;
  }
  // Return the image HTML wrapped in a styled container
  // The parent TD needs the 'image-location-*' class for flex layout
  return `
    <div class="${containerClass}" style="${containerStyle}">
      <img class="item-viewer-image" src="${item.img}" style="${imgStyle}" data-edit="img" title="${item.name}">
    </div>
  `;
}

/**
 * Check if the item has description or biography fields
 * @param {Array} fields - The configured fields
 * @param {Object} item - The item to check
 * @returns {boolean} True if item has description or biography
 */
function hasDescriptionOrBiography(fields, item) {
  const descriptionField = fields.find(f => f.object.includes('description'));
  const biographyField = fields.find(f => f.object.includes('biography'));
  
  if (!descriptionField && !biographyField) return false;
  
  // Check if the description field has content
  if (descriptionField) {
    const objectPath = descriptionField.object.startsWith('item.') ? 
      descriptionField.object.substring(5) : descriptionField.object;
    const description = getNestedProperty(item, objectPath);
    if (description && description.trim() !== '') return true;
  }
  
  // Check if the biography field has content
  if (biographyField) {
    const objectPath = biographyField.object.startsWith('item.') ? 
      biographyField.object.substring(5) : biographyField.object;
    const biography = getNestedProperty(item, objectPath);
    if (biography && biography.trim() !== '') return true;
  }
  
  return false;
}

/**
 * Get the description or biography content from an item
 * @param {Array} fields - The configured fields
 * @param {Object} item - The item to get content from
 * @returns {string} The description or biography content
 */
async function getDescriptionContent(fields, item, requestToken, getLatestToken) {
  if (requestToken !== getLatestToken()) {
    return null; 
  }

  const descriptionField = fields.find(f => f.object.includes('description'));
  const biographyField = fields.find(f => f.object.includes('biography'));
  let rawContent = '';

  if (descriptionField) {
    const objectPath = descriptionField.object.startsWith('item.') ? descriptionField.object.substring(5) : descriptionField.object;
    let description = getNestedPropertyFromSystem(item, objectPath) || '';
    let processedDescription = processSystemVariations(item, objectPath, description);
    if (processedDescription instanceof Promise) {
        if (requestToken !== getLatestToken()) return null; 
        processedDescription = await processedDescription;
        if (requestToken !== getLatestToken()) return null; 
    }
    rawContent = processedDescription;
  }

  if (requestToken !== getLatestToken()) return null; 

  if ((!rawContent || rawContent === '') && biographyField) {
    const objectPath = biographyField.object.startsWith('item.') ? biographyField.object.substring(5) : biographyField.object;
    let biography = getNestedPropertyFromSystem(item, objectPath) || '';
    let processedBiography = processSystemVariations(item, objectPath, biography); 
    if (processedBiography instanceof Promise) {
        if (requestToken !== getLatestToken()) return null; 
        processedBiography = await processedBiography;
        if (requestToken !== getLatestToken()) return null; 
    }
    rawContent = processedBiography;
  }
  const contentString = (typeof rawContent === 'string') ? rawContent : String(rawContent ?? '');
  return replaceSystemSymbols(contentString); 
}

// Export the main ItemViewer functionality and the modified createItemTable
//export { openItemViewer, createItemTable };
/**
 * Add event listeners for item table interactions
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source tab name
 */
export function addItemTableEventListeners(html, tabSource) {
  // Toggle description visibility when clicking on an item row
  html.find('.first-row').click(function(ev) {
    // Ignore clicks on the config button cell or links within the row
    if ($(ev.target).closest('.table-config-button').length || $(ev.target).closest('a').length) {
      return;
    }

    // Toggle visibility of the corresponding description row
    const uuid = $(this).data('uuid');
    const secondRow = html.find(`.second-row[data-uuid="${uuid}"]`);
    if (secondRow.length) {
      secondRow.toggle();
    }
  });

  // Handle table configuration button clicks
  html.find('.table-config-button').click(function() {
    const button = $(this);
    const table = button.closest('table.item-type-table'); // Ensure targeting the correct table
    // Find the containing element (table or details wrapper) to pass to config dialog
    const containingElement = table.closest('details.hidden-item-table-details').length ? table.closest('details.hidden-item-table-details') : table;

    // Get necessary data from the button or table attributes
    const type = button.data('type') || table.data('original-type');
    const folderGroup = button.data('folder-group') || table.data('folder-group') || null; // Ensure null if undefined
    const currentStatus = table.data('status') || '+'; // Default to grid view

    // Show configuration dialog, passing the main dialog html context and the containing element
    showTableConfigDialog(html, tabSource, type, currentStatus, containingElement, folderGroup);
  });

  // Apply initial item visibility based on folder filters
  updateItemVisibility(html, tabSource);

  // Check if any tables need to be hidden initially
  checkTableVisibility(html);
}

/**
 * Show the table configuration dialog
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source tab name
 * @param {string} type - The item type
 * @param {string} currentStatus - The current display status (+ or -)
 * @param {jQuery} table - The table element being configured
 */
function showTableConfigDialog(mainDialogHtml, tabSource, type, currentStatus, configuredElement, folderGroup = null) {
  // Prevent multiple instances by checking a static flag on the function
  if (showTableConfigDialog.dialogOpen) return;
  showTableConfigDialog.dialogOpen = true;

  // Generate a unique settings key for table-specific settings
  const sanitizedTabSource = tabSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const sanitizedType = type.replace(/\s+/g, '-').replace(/[^\w-]/g, ''); // Sanitize type as well
  const settingsKey = folderGroup ? `${sanitizedTabSource}-${sanitizedType}-folder-${folderGroup.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}` : `${sanitizedTabSource}-${sanitizedType}`;

  // Keys for specific settings
  const hideFromPlayerKey = `${settingsKey}-hideFromPlayer`;
  const tableNameKey = `${settingsKey}-tableName`;
  const subHeaderNameKey = `${settingsKey}-subHeaderName`;
  const tableMessageKey = `${settingsKey}-tableMessage`;
  const imgHeightKey = `${settingsKey}-imgHeight`;
  const imgWidthKey = `${settingsKey}-imgWidth`;
  const imgLocationKey = `${settingsKey}-imgLocation`;
  const imgTrimKey = `${settingsKey}-imgTrim`;
  const hideFolderNameKey = `${settingsKey}-hideFolderName`;

  // Keys for type-wide settings
  const typeSettingsPrefix = `${sanitizedTabSource}-${sanitizedType}`; // Prefix for type-wide settings
  const groupByFolderKey = `${typeSettingsPrefix}-groupByFolder`;
  const sortByFolderSortKey = `${typeSettingsPrefix}-sortByFolderSort`;

  // Get current settings
  const displaySettings = game.settings.get('lgs-item-viewer', 'displayStatus') || {};

  // Read settings using the correct keys
  const hideFromPlayer = displaySettings[hideFromPlayerKey] || false;
  const currentEffectiveStatus = displaySettings[settingsKey] || '+'; // Use the base key for status
  const currentTableName = displaySettings[tableNameKey] || '';
  const currentSubHeaderName = displaySettings[subHeaderNameKey] || '';
  const currentTableMessage = displaySettings[tableMessageKey] || '';
  const currentImgHeight = displaySettings[imgHeightKey] || 500; // Use specific key
  const currentImgWidth = displaySettings[imgWidthKey] || 400;   // Use specific key
  const currentImgLocation = displaySettings[imgLocationKey] || 'right'; // Use specific key
  const currentImgTrim = displaySettings[imgTrimKey] || false; // Use specific key
  const currentHideFolderName = displaySettings[hideFolderNameKey] || false;

  // Type-wide settings:
  const groupByFolder = displaySettings[groupByFolderKey] || false;
  const sortByFolderSort = displaySettings[sortByFolderSortKey] || false;

  // Determine placeholder for SubHeader input
  const subHeaderPlaceholder = folderGroup ? `Defaults to folder name: ${folderGroup}` : 'Optional subheader text';

  // Create dialog content
  const dialogContent = `
    <form>
      <div class="form-group">
        <label for="table-name-input">Table Name:</label>
        <input type="text" id="table-name-input" name="tableName" value="${currentTableName}" placeholder="${type.charAt(0).toUpperCase() + type.slice(1)}${folderGroup ? ` (${folderGroup})` : ''}">
        <p class="notes">Custom name to display in the table header. Leave blank to use default.</p>
      </div>
      <div class="form-group">
        <label for="sub-header-name-input">SubHeader Name:</label>
        <input type="text" id="sub-header-name-input" name="subHeaderName" value="${currentSubHeaderName}" placeholder="${subHeaderPlaceholder}">
        <p class="notes">Add sub header or Replace folder name sub header. Leave blank to use default behavior (show folder name if grouped and not hidden, otherwise nothing).</p>
      </div>
      <div class="form-group table-message-group">
        <label for="table-message-button">Table Message:</label>
        <button type="button" id="table-message-button" class="edit-table-message" title="Define table message">
            <i class="fas fa-pen-to-square"></i> Edit Message
        </button>
        <p class="notes">Optional rich text message to display below the table header.</p>
      </div>
      <div class="form-group">
        <label for="grid-view-checkbox">
          <input type="checkbox" id="grid-view-checkbox" name="gridView" ${currentEffectiveStatus === '+' ? 'checked' : ''}>
          <span>Grid View</span>
        </label>
        <p class="notes">Enable grid view to display items in a detailed table format with all fields.</p>
      </div>
      <div class="form-group">
        <label for="group-by-folder-checkbox">
          <input type="checkbox" id="group-by-folder-checkbox" name="groupByFolder" ${groupByFolder ? 'checked' : ''}>
          <span>Group items by Folder</span>
        </label>
        <p class="notes">Group items into separate tables based on their top-level folder. (Applies to all '${type}' tables in this tab)</p>
      </div>
      <div class="form-group" style="margin-left: 20px;"> <!-- Indented Sort by Folder Sort Checkbox -->
        <label for="sort-by-folder-sort-checkbox">
          <input type="checkbox" id="sort-by-folder-sort-checkbox" name="sortByFolderSort" ${sortByFolderSort ? 'checked' : ''} ${!groupByFolder ? 'disabled' : ''}>
          <span>Sort Using Folder Sort</span>
        </label>
        <p class="notes">Sort table using compendium folder sorting. (Requires "Group items by Folder" to be checked)</p>
      </div>
      <div class="form-group">
        <label for="hide-from-player-checkbox">
          <input type="checkbox" id="hide-from-player-checkbox" name="hideFromPlayer" ${hideFromPlayer ? 'checked' : ''}>
          <span>Hide This Table From Players</span>
        </label>
        <p class="notes">When checked, this specific table (or group) will only be visible to GMs.</p>
      </div>
      <div class="form-group">
        <label for="hide-folder-name-checkbox">
          <input type="checkbox" id="hide-folder-name-checkbox" name="hideFolderName" ${currentHideFolderName ? 'checked' : ''}>
          <span>Hide Folder Name</span>
        </label>
        <p class="notes">When checked, hide the folder name in the table header (only applies if "Group items by Folder" is enabled and no "SubHeader Name" is set).</p>
      </div>
      <hr>
      <div class="form-groupx imageDisplayOptions">
        <label><strong>Image Display Options</strong></label>
        <div class="image-options-gridx indent">
          <div class="imageInput">
              <label for="img-max-height">Max Height (px):</label>
              <input type="number" id="img-max-height" name="imgHeight" value="${currentImgHeight}" style="width: 60px;">
          </div>
          <div class="imageInput">
              <label class="label-img-max-width" for="img-max-width">Max Width (px):</label>
              <input type="number" id="img-max-width" name="imgWidth" value="${currentImgWidth}" style="width: 60px;">
          </div>
          <div class="imageInput">
              <label for="img-location">Image Location:</label>
              <select id="img-location" name="imgLocation">
                  <option value="left" ${currentImgLocation === 'left' ? 'selected' : ''}>Image Left</option>
                  <option value="right" ${currentImgLocation === 'right' ? 'selected' : ''}>Image Right</option>
                  <option value="top" ${currentImgLocation === 'top' ? 'selected' : ''}>Image Top</option>
                  <option value="bottom" ${currentImgLocation === 'bottom' ? 'selected' : ''}>Image Bottom</option>
              </select>
          </div>
          <div class="span-3">
              <label for="img-trim">
                  <input type="checkbox" id="img-trim" name="imgTrim" ${currentImgTrim ? 'checked' : ''}>
                  <span>Trim Large Images</span>
              </label>
              <p class="notes" style="margin-left: 25px;">Unchecked: Maximum image is height or width in pixels.<br>Checked: Image at maximum width, excess is trimmed at the bottom.</p>
           </div>
        </div>
      </div>
      <hr>
      <div class="form-group">
        <label for="reset-config-checkbox">
          <input type="checkbox" id="reset-config-checkbox" name="resetConfig">
          <span style="color: red; font-weight: bold;">Reset Item Configuration</span>
        </label>
        <p class="notes">Remove all configuration data associated with the <strong>'${type}'</strong> item type in the <strong>'${tabSource}'</strong> tab, including settings for folder-grouped tables. This cannot be undone.</p>
      </div>
      <hr>
      <div class="move-group">
        <label class="move-label">Move:</label>
        <div class="table-position-buttons">
          <button type="button" id="move-up-button" class="move-button">
            <i class="fas fa-arrow-up"></i>
          </button>
          <button type="button" id="move-down-button" class="move-button">
            <i class="fas fa-arrow-down"></i>
          </button>
        </div>
        <span style="margin-left: 9px;"> <i>Reposition tables within the tab</i></span>
      </div>
    </form>
    <style>
      .table-message-group { display: flex; align-items: center; gap: 10px; }
      .edit-table-message { flex-shrink: 0; }
      .image-options-grid { display: grid; grid-template-columns: auto auto auto; gap: 10px; align-items: center; }
      .image-options-grid > div { display: flex; align-items: center; gap: 5px; }
      .image-options-grid label { margin-right: 5px; }
      .image-options-grid .span-3 { grid-column: span 3; }
      .move-group { display: flex; align-items: center; gap: 5px; margin-top: 10px; }
      .move-label { font-weight: bold; }
      .table-position-buttons { display: flex; gap: 5px; }
      .move-button { padding: 2px 5px; }
      .notes { font-size: 0.8em; color: #666; margin: 2px 0 0 0; flex-grow: 1; }
    </style>
  `;

  // Create and render the dialog; include a close callback to reset the flag
  const dialog = new Dialog({
    title: `Table Configuration: ${type.charAt(0).toUpperCase() + type.slice(1)}${folderGroup ? ` - ${folderGroup}` : ''}`,
    content: dialogContent,
    buttons: {
      save: {
        icon: '<i class="fas fa-save"></i>',
        label: "Save",
        callback: async (dialogHtml) => {
          const form = dialogHtml.find('form');
          const isResetChecked = form.find('#reset-config-checkbox').is(':checked');

          // --- RESET LOGIC ---
          if (isResetChecked) {
            const confirmed = await Dialog.confirm({
              title: "Confirm Reset",
              content: `<p>Are you sure you want to delete <strong>all</strong> configuration settings for item type '<strong>${type}</strong>' in the '<strong>${tabSource}</strong>' tab? This includes grid/collapsed view, grouping, sorting, custom names, messages, image settings, and hidden status for this type and all its folder groups within this tab.</p><p style="color: red;">This action cannot be undone.</p>`,
              yes: () => true,
              no: () => false,
              defaultYes: false
            });

            if (!confirmed) {
              console.log(`LGS Item Viewer | Configuration reset for type '${type}' in tab '${tabSource}' cancelled.`);
              // Uncheck the box visually before preventing close
              form.find('#reset-config-checkbox').prop('checked', false);
              return false; // Prevent dialog closure
            }

            console.log(`LGS Item Viewer | Resetting configuration for type '${type}' in tab '${tabSource}'...`);
            try {
              // 1. Update displayStatus setting
              const currentDisplayStatus = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
              const keysToDelete = [];
              // Construct the prefix using the SAME sanitization as key generation
              const keyPrefix = `${sanitizedTabSource}-${sanitizedType}`;

              for (const key in currentDisplayStatus) {
                if (key.startsWith(keyPrefix)) {
                  keysToDelete.push(key);
                }
              }
              keysToDelete.forEach(key => delete currentDisplayStatus[key]);
              await game.settings.set('lgs-item-viewer', 'displayStatus', currentDisplayStatus);
              console.log(`LGS Item Viewer | Removed displayStatus keys starting with: ${keyPrefix}`);

              // 2. Update tableOrders setting
              const currentTableOrders = game.settings.get('lgs-item-viewer', 'tableOrders') || {};
              if (currentTableOrders[tabSource] && Array.isArray(currentTableOrders[tabSource])) {
                // Filter out entries matching the type prefix
                currentTableOrders[tabSource] = currentTableOrders[tabSource].filter(tableKey => !tableKey.startsWith(keyPrefix));
                await game.settings.set('lgs-item-viewer', 'tableOrders', currentTableOrders);
                console.log(`LGS Item Viewer | Updated tableOrders for tab '${tabSource}', removed entries starting with: ${keyPrefix}`);
              }

              // 3. Reload tab content in the main viewer
              console.log(`LGS Item Viewer | Reloading tab content for '${tabSource}' after reset.`);
              const leftColumn = mainDialogHtml.find('#leftColumn');
              const rightColumn = mainDialogHtml.find('#rightColumn');
              if (leftColumn.length && rightColumn.length) {
                 leftColumn.empty(); // Clear previous content
                 rightColumn.empty(); // Clear filters etc.
                 // Prepend tab message if it exists (assuming initializeDialog logic is robust)
                 // Find the active tab data to get the message - requires access to allTabs or recalculation
                 // Simplified: Assume reload handles message if needed. Better approach would pass tabData.
                 // await prependTabMessage(mainDialogHtml, currentTabData); // Need tabData here

                 await loadTabContent(mainDialogHtml, tabSource); // Reload content
                 ui.notifications.info(`Configuration for '${type}' in tab '${tabSource}' has been reset.`);
              } else {
                 console.error("LGS Item Viewer | Could not find left/right columns in main dialog HTML to reload content.");
                 ui.notifications.warn(`Configuration for '${type}' reset, but failed to automatically reload the tab view.`);
              }

             showTableConfigDialog.dialogOpen = false; // Allow opening new dialogs
             return true; // Close this dialog

            } catch (error) {
                console.error(`LGS Item Viewer | Error resetting configuration for type '${type}' in tab '${tabSource}':`, error);
                ui.notifications.error("An error occurred while resetting the configuration. Check the console (F12).");
                showTableConfigDialog.dialogOpen = false; // Still reset flag on error
                return false; // Prevent dialog close on error
            }
          }
          // --- END RESET LOGIC ---

          // --- NORMAL SAVE LOGIC (executes only if reset checkbox was NOT checked) ---
          const isGridView = form.find('#grid-view-checkbox').is(':checked');
          const isGroupByFolder = form.find('#group-by-folder-checkbox').is(':checked');
          const isSortByFolderSort = form.find('#sort-by-folder-sort-checkbox').is(':checked');
          const isHideFromPlayer = form.find('#hide-from-player-checkbox').is(':checked');
          const isHideFolderName = form.find('#hide-folder-name-checkbox').is(':checked');
          const newStatus = isGridView ? '+' : '-';
          const newTableName = form.find('#table-name-input').val().trim();
          const newSubHeaderName = form.find('#sub-header-name-input').val().trim();
          const newImgHeight = parseInt(form.find('#img-max-height').val()) || 500;
          const newImgWidth = parseInt(form.find('#img-max-width').val()) || 400;
          const newImgLocation = form.find('#img-location').val() || 'right';
          const newImgTrim = form.find('#img-trim').is(':checked');

          const displayStatus = game.settings.get('lgs-item-viewer', 'displayStatus') || {};

          // Keys (re-establish for clarity)
          const statusKey = settingsKey; // Unique key for this table/group status
          // Table/Group-specific keys
          const tableNameKey = `${settingsKey}-tableName`;
          const subHeaderNameKey = `${settingsKey}-subHeaderName`;
          const tableMessageKey = `${settingsKey}-tableMessage`; // Message saved separately
          const imgHeightKey = `${settingsKey}-imgHeight`;
          const imgWidthKey = `${settingsKey}-imgWidth`;
          const imgLocationKey = `${settingsKey}-imgLocation`;
          const imgTrimKey = `${settingsKey}-imgTrim`;
          const hideFolderNameKey = `${settingsKey}-hideFolderName`;
          const hideFromPlayerKey = `${settingsKey}-hideFromPlayer`;
          // Type-wide keys (prefix already defined)
          const groupByFolderKey = `${typeSettingsPrefix}-groupByFolder`;
          const sortByFolderSortKey = `${typeSettingsPrefix}-sortByFolderSort`;

          const updatedTableMessage = displayStatus[tableMessageKey] || ''; // Get latest message

          // Check if settings have changed
          const statusChanged = newStatus !== currentEffectiveStatus;
          const tableNameChanged = newTableName !== currentTableName;
          const subHeaderNameChanged = newSubHeaderName !== currentSubHeaderName;
          const tableMessageChanged = updatedTableMessage !== currentTableMessage; // Compare against latest saved msg
          const imgHeightChanged = newImgHeight !== currentImgHeight;
          const imgWidthChanged = newImgWidth !== currentImgWidth;
          const imgLocationChanged = newImgLocation !== currentImgLocation;
          const imgTrimChanged = newImgTrim !== currentImgTrim;
          const hideFolderNameChanged = isHideFolderName !== currentHideFolderName;
          const hideFromPlayerChanged = isHideFromPlayer !== hideFromPlayer;
          const groupByFolderChanged = isGroupByFolder !== groupByFolder;
          const sortByFolderSortChanged = isSortByFolderSort !== sortByFolderSort;

          const anyChange = statusChanged || tableNameChanged || subHeaderNameChanged || /* message handled by editor */
                            imgHeightChanged || imgWidthChanged || imgLocationChanged || imgTrimChanged ||
                            hideFolderNameChanged || hideFromPlayerChanged || groupByFolderChanged || sortByFolderSortChanged;

          const forceFullReload = groupByFolderChanged || hideFromPlayerChanged || sortByFolderSortChanged;

          if (anyChange) {
            // Save the settings
            displayStatus[statusKey] = newStatus; // Save status for this specific table/group
            displayStatus[tableNameKey] = newTableName;
            displayStatus[subHeaderNameKey] = newSubHeaderName;
            displayStatus[imgHeightKey] = newImgHeight;
            displayStatus[imgWidthKey] = newImgWidth;
            displayStatus[imgLocationKey] = newImgLocation;
            displayStatus[imgTrimKey] = newImgTrim;
            displayStatus[hideFolderNameKey] = isHideFolderName;
            displayStatus[hideFromPlayerKey] = isHideFromPlayer; // Save hide status for this specific table/group
            // Save type-wide settings
            displayStatus[groupByFolderKey] = isGroupByFolder;
            displayStatus[sortByFolderSortKey] = isSortByFolderSort;

            await game.settings.set('lgs-item-viewer', 'displayStatus', displayStatus);
            console.log("LGS Item Viewer | Settings saved.");

            // Decide how to refresh
            if (forceFullReload) {
               let reloadReason = [];
               if (groupByFolderChanged) reloadReason.push('groupByFolder');
               if (hideFromPlayerChanged) reloadReason.push('hideFromPlayer'); // Might affect current view
               if (sortByFolderSortChanged) reloadReason.push('sortByFolderSort');
               console.log(`LGS Item Viewer | Reloading tab content due to ${reloadReason.join(' and ')} change.`);
               const leftColumn = mainDialogHtml.find('#leftColumn');
               const rightColumn = mainDialogHtml.find('#rightColumn');
               if (leftColumn.length && rightColumn.length) {
                   leftColumn.empty();
                   rightColumn.empty();
                   await loadTabContent(mainDialogHtml, tabSource);
               } else {
                   console.error("LGS Item Viewer | Could not find columns for full reload.");
               }
            } else if (anyChange) { // Only non-reload-forcing changes
                console.log(`LGS Item Viewer | Updating specific table/details in place: type=${type}, folderGroup=${folderGroup}`);
                 // Find the element that was configured (passed as configuredElement)
                const elementToUpdate = configuredElement;

                if (elementToUpdate && elementToUpdate.length) {
                    console.log("LGS Item Viewer | Found element to update:", elementToUpdate);
                    const tableItems = [];
                    const tableInside = elementToUpdate.is('table') ? elementToUpdate : elementToUpdate.find('table.item-type-table').first();

                    if (tableInside.length) {
                        tableInside.find('.first-row').each(function() {
                            const uuid = $(this).data('uuid');
                            const folderPath = $(this).data('folder');
                            if (uuid) {
                                try {
                                    const item = fromUuidSync(uuid);
                                    if (item) {
                                        item.folderPath = folderPath; // Re-attach folderPath needed for sorting/grouping logic? No, fetched fresh.
                                        tableItems.push(item);
                                    } else { console.warn(`LGS Item Viewer | Could not find item for UUID: ${uuid}`); }
                                } catch (e) { console.error(`LGS Item Viewer | Error fetching item for UUID ${uuid}:`, e); }
                            }
                        });

                        // --- Sorting logic (only if not using folder sort) ---
                        if (!(isGroupByFolder && isSortByFolderSort)) {
                             const fieldConfigs = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
                             const configType = type === "JournalEntry" ? "journal" : type;
                             const config = fieldConfigs.find(c => c.type.toLowerCase() === configType.toLowerCase());

                             if (config) {
                                 const sortingFields = config.fields.filter(field => field.sortIndex && field.sortIndex !== '');
                                 if (sortingFields.length > 0) {
                                     const sortedFields = sortingFields.sort((a, b) => (parseInt(a.sortIndex) || 9999) - (parseInt(b.sortIndex) || 9999));
                                     tableItems.sort((a, b) => {
                                         for (const sortField of sortedFields) {
                                             const objectPath = sortField.object.startsWith('item.') ? sortField.object.substring(5) : sortField.object;
                                             const aValue = getNestedProperty(a, objectPath);
                                             const bValue = getNestedProperty(b, objectPath);
                                             if (aValue === bValue) continue;
                                             if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
                                             const numA = Number(aValue); const numB = Number(bValue);
                                             if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                             return String(aValue || '').localeCompare(String(bValue || ''), undefined, { sensitivity: 'base' });
                                         }
                                         return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
                                     });
                                 } else { // Default sort by name if config exists but no sortIndex
                                     tableItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
                                 }
                             } else { // Default sort by name if no config at all
                                 tableItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
                             }
                        }
                        // --- End Sorting Logic ---

                        if (tableItems.length > 0 || tableInside.find('.first-row').length === 0) { // Allow recreating empty tables
                            const fieldConfigs = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
                            const configType = type === "JournalEntry" ? "journal" : type;
                            const typeConfig = fieldConfigs.find(config => config.type.toLowerCase() === configType.toLowerCase());

                            const newElementHtml = await createItemTable(type, tableItems, typeConfig, newStatus, tabSource, folderGroup);

                            // Get currently expanded second rows before replacing
                            const expandedUUIDs = new Set();
                            tableInside.find('.second-row').filter(function() { return $(this).css('display') !== 'none'; }).each(function() {
                                expandedUUIDs.add($(this).data('uuid'));
                            });

                            elementToUpdate.replaceWith(newElementHtml);
                            console.log("LGS Item Viewer | Element replaced in place.");

                            // Re-find the newly added element and re-attach listeners/restore state
                             const newElement = mainDialogHtml.find(`[data-type="${settingsKey}"]`); // Use the unique key
                             if (newElement.length) {
                                 // Re-attach listeners
                                 const configButton = newElement.is('details') ? newElement.find('.table-config-button') : newElement.find('.table-config-button').first();
                                 if (configButton.length) {
                                    configButton.off('click').on('click', function() {
                                         const button = $(this);
                                         const actualTableElement = newElement.is('details') ? newElement.find('table.item-type-table').first() : newElement;
                                         const type = button.data('type') || actualTableElement.data('original-type');
                                         const folderGroup = button.data('folder-group') || actualTableElement.data('folder-group') || null;
                                         const currentStatus = actualTableElement.data('status') || '+';
                                         showTableConfigDialog(mainDialogHtml, tabSource, type, currentStatus, newElement, folderGroup); // Pass the new element
                                     });
                                 }
                                 const tableForListeners = newElement.is('details') ? newElement.find('table.item-type-table').first() : newElement;
                                  tableForListeners.find('.first-row').off('click').on('click', function(ev) {
                                      if ($(ev.target).closest('.table-config-button').length || $(ev.target).closest('a').length) { return; }
                                      const uuid = $(this).data('uuid');
                                      const secondRow = mainDialogHtml.find(`.second-row[data-uuid="${uuid}"]`);
                                      if (secondRow.length) { secondRow.toggle(); }
                                  });

                                 // Restore expanded state
                                 expandedUUIDs.forEach(uuid => {
                                     newElement.find(`.second-row[data-uuid="${uuid}"]`).show();
                                 });

                                 applyAlternatingRowColors(mainDialogHtml.find('#leftColumn'));
                                 checkTableVisibility(mainDialogHtml.find('#leftColumn'));
                                 processLabelJournalEntries(mainDialogHtml, tabSource);
                                 updateTagVisibility(mainDialogHtml); // Update tag filters based on potentially changed rows
                                 updateVisibleTagCheckboxes(mainDialogHtml); // Update visible tag checkboxes

                                 // Save potentially changed table order (though unlikely here unless hiding changed things)
                                 saveTableOrder(mainDialogHtml, tabSource);
                             }

                        } else { console.warn(`LGS Item Viewer | No items found for table type=${type}, folderGroup=${folderGroup}. Cannot recreate table in place.`); }
                    } else { console.error("LGS Item Viewer | Could not find inner table element for update."); }
                } else { console.error(`LGS Item Viewer | Could not find element to update with key: ${settingsKey}`); }
            } else {
                console.log("LGS Item Viewer | No relevant non-reload changes detected requiring UI update.");
            }
          } else {
            console.log("LGS Item Viewer | No settings changed.");
          }

         // Reset the flag regardless of whether changes were made (unless reset cancelled)
         showTableConfigDialog.dialogOpen = false;
         // --- END NORMAL SAVE LOGIC ---
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel",
        callback: () => {
             // Reset the flag on cancel too
             showTableConfigDialog.dialogOpen = false;
        }
      }
    },
    default: "save",
    render: (dialogHtml) => {
      // Enable/disable folder sort checkbox based on group checkbox
      dialogHtml.find('#group-by-folder-checkbox').on('change', function() {
        const isChecked = $(this).is(':checked');
        const folderSortCheckbox = dialogHtml.find('#sort-by-folder-sort-checkbox');
        folderSortCheckbox.prop('disabled', !isChecked);
        if (!isChecked) {
          folderSortCheckbox.prop('checked', false);
        }
      });

      // Move buttons
      dialogHtml.find('#move-up-button').click(() => {
        // Pass the originally configured element (table or details wrapper)
        moveTable(mainDialogHtml, configuredElement, 'up');
      });

      dialogHtml.find('#move-down-button').click(() => {
        // Pass the originally configured element (table or details wrapper)
        moveTable(mainDialogHtml, configuredElement, 'down');
      });

      // Table message editor button
      dialogHtml.find('#table-message-button').click(() => {
          const latestSettings = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
          const latestMessage = latestSettings[tableMessageKey] || ''; // Use specific key
          openTableMessageEditor(settingsKey, latestMessage, type, folderGroup); // Pass specific key
      });
    },
    close: () => {
      // Reset the flag if the dialog is closed by other means (e.g., Escape key)
      showTableConfigDialog.dialogOpen = false;
    }
  }, {
    classes: ["dialog", "lgs-item-viewer-config"],
    width: 500
  });

  dialog.render(true);
}

/**
 * Opens a dialog to view and optionally edit the table message.
 * Initially shows rendered content, with an edit icon to switch to TinyMCE.
 * Hooks into TinyMCE's internal save mechanism via save_onsavecallback.
 * @param {string} settingsKey - The unique key for this table's settings.
 * @param {string} currentMessage - The current message content (HTML). Initial value.
 * @param {string} type - The item type (for dialog title).
 * @param {string|null} [folderGroup=null] - The folder group name (for dialog title).
 */
async function openTableMessageEditor(settingsKey, currentMessage, type, folderGroup = null) {
    const editorId = `table-message-editor-${settingsKey}`;
    const displayId = `table-message-display-${settingsKey}`;
    const dialogId = `table-message-editor-dialog-${settingsKey}`;
    const editButtonId = `edit-message-button-${settingsKey}`;
    const editorContainerId = `editor-container-${settingsKey}`;

    // Ensure initial message is a string
    let liveMessageContent = currentMessage || '<p></p>';

    const dialogContent = `
        <div class="table-message-viewer">
            <div id="${displayId}" class="message-display-content">
                <!-- Rendered content will be placed here -->
            </div>
            <div class="message-controls">
                <button type="button" id="${editButtonId}" class="edit-message-icon" title="Edit Message">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
        <div id="${editorContainerId}" class="editor-container" style="display: none;">
            <form>
                <textarea id="${editorId}" name="tableMessageContent" style="visibility: hidden;"></textarea>
            </form>
        </div>
        <style>
            /* --- Styles remain largely the same --- */
            #${dialogId} .dialog-content { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
            .table-message-viewer { flex-shrink: 0; overflow-y: auto; border: 1px solid #ccc; padding: 5px; margin-bottom: 5px; position: relative; min-height: 50px; max-height: 80%; }
            .message-display-content { word-wrap: break-word; padding-right: 50px; }
            .message-controls { position: absolute; top: 5px; right: 5px; }
            .edit-message-icon { background: rgba(200, 200, 200, 0.7); border: 1px solid #888; border-radius: 3px; padding: 2px 5px; cursor: pointer; }
            .edit-message-icon:hover { background: rgba(180, 180, 180, 0.9); }
            .editor-container { flex-grow: 1; height: 100%; min-height: 300px; display: flex; flex-direction: column; }
            .editor-container form { flex-grow: 1; display: flex; flex-direction: column; }
            .editor-container .tox-tinymce { border: 1px solid #aaa !important; flex-grow: 1; }
        </style>
    `;

    let editorInstance = null;
    let isEditing = false;
    let dirty = false; // Track if changes were made in the editor

    // --- Function to handle saving the content to settings ---
    const saveContentToSettings = async (content) => {
        // Added check to prevent saving placeholder content if editor hasn't loaded properly
        if (content === null || content === undefined || content.trim() === '') {
             console.warn(`LGS Item Viewer | Attempted to save empty or invalid content. Aborting save.`);
             ui.notifications.warn("Cannot save empty message.");
             return false;
        }
        try {
            const displaySettings = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
            const messageKey = `${settingsKey}-tableMessage`;
            const oldMessage = displaySettings[messageKey] || '<p></p>';

            if (content !== oldMessage) {
                displaySettings[messageKey] = content;
                await game.settings.set('lgs-item-viewer', 'displayStatus', displaySettings);
                console.log(`LGS Item Viewer | Table message saved for key: ${messageKey}`);
                liveMessageContent = content; // Update live content tracker
                dirty = false; // Reset dirty flag after successful save
                ui.notifications.info("Table message saved.");
                return true; // Indicate success
            } else {
                console.log(`LGS Item Viewer | Table message unchanged, no save needed.`);
                // Still reset dirty flag even if content is same as original, user clicked save.
                dirty = false;
                return false; // Indicate no *change* was saved
            }
        } catch (err) {
            console.error(`LGS Item Viewer | Error saving message for key ${messageKey}:`, err);
            ui.notifications.error("Error saving table message. See console (F12).");
            return false; // Indicate failure
        }
    };

    // --- Dialog Definition ---
    const dialog = new Dialog({
        title: `View/Edit Table Message: ${type.charAt(0).toUpperCase() + type.slice(1)}${folderGroup ? ` - ${folderGroup}` : ''}`,
        content: dialogContent,
        buttons: {
            close: {
                icon: '<i class="fas fa-times"></i>',
                label: "Close",
                callback: async (html) => {
                    console.log("LGS Item Viewer | Close button clicked.");
                    if (isEditing && dirty) { // Check dirty flag even if editorInstance is somehow null
                        const confirmClose = await Dialog.confirm({
                            title: "Unsaved Changes",
                            content: "<p>You have unsaved changes in the table message. Close without saving?</p>",
                            yes: () => true, no: () => false, defaultYes: false
                        });
                        if (!confirmClose) {
                            console.log("LGS Item Viewer | Close cancelled due to unsaved changes.");
                            throw new Error("Close cancelled"); // Prevent dialog from closing
                        }
                        console.log("LGS Item Viewer | Closing without saving changes.");
                    }
                }
            }
        },
        default: 'close',
        render: (html) => {
            Promise.resolve().then(async () => {
                console.log("LGS Item Viewer | Rendering message editor dialog content.");
                const displayDiv = html.find(`#${displayId}`);
                const editButton = html.find(`#${editButtonId}`);
                const editorContainer = html.find(`#${editorContainerId}`);
                const viewerDiv = html.find('.table-message-viewer');
                const textarea = editorContainer.find(`#${editorId}`);

                // --- Initial display ---
                try {
                     displayDiv.html(await TextEditor.enrichHTML(liveMessageContent));
                } catch (err) {
                     console.error("LGS Item Viewer | Error enriching initial HTML:", err);
                     displayDiv.html("<p>Error rendering message.</p>");
                }

                // --- Edit Button Logic ---
                editButton.off('click').on('click', async () => {
                    console.log("LGS Item Viewer | Edit button clicked.");
                    if (isEditing || editorInstance) return; // Prevent multiple edits/instances

                    isEditing = true;
                    dirty = false; // Reset dirty flag when starting edit
                    viewerDiv.hide();
                    editorContainer.show();
                    textarea.val(liveMessageContent);
                    textarea.css('visibility', 'visible');

                    try {
                        console.log("LGS Item Viewer | Initializing TinyMCE editor with save_onsavecallback...");
                        // Destroy previous instance just in case
                        if (editorInstance) {
                            await editorInstance.destroy();
                            editorInstance = null;
                        }

                        editorInstance = await TextEditor.create({
                            target: textarea[0],
                            // Let Foundry apply default menus/toolbars
                            // Use Foundry's intended callback for the internal save button
                            save_onsavecallback: async (editor) => {
                                console.log("LGS Item Viewer | TinyMCE save_onsavecallback triggered.");
                                if (!editor) { // Use the passed editor instance
                                    console.error("LGS Item Viewer | save_onsavecallback received no editor instance!");
                                    return;
                                }
                                const currentContent = editor.getContent();
                                await saveContentToSettings(currentContent);
                                // No need to reset dirty flag here, saveContentToSettings does it on success
                            },
                            // Use setup *only* for things not covered by other options (like tracking dirty state)
                            setup: (editor) => {
                                editor.on('change dirty', () => {
                                    // Check if editor is initialized before setting dirty
                                    if (editor.initialized) {
                                        // console.log("LGS Item Viewer | Editor content changed (dirty)."); // Can be noisy
                                        dirty = true;
                                    }
                                });
                                // Optional: Log when editor is fully initialized
                                editor.on('init', () => {
                                    console.log("LGS Item Viewer | TinyMCE editor fully initialized.");
                                });
                            }
                        });

                        if (editorInstance) {
                            console.log("LGS Item Viewer | TinyMCE editor initialization started.");
                            // Focus might happen automatically or after init event
                            // editorInstance.focus();
                        } else {
                            throw new Error("TextEditor.create returned null or undefined.");
                        }

                    } catch (err) {
                        console.error("LGS Item Viewer | Error initializing TinyMCE editor:", err);
                        ui.notifications.error("Error initializing text editor. See console (F12).");
                        // Attempt to gracefully revert state
                        isEditing = false;
                        viewerDiv.show();
                        editorContainer.hide();
                        textarea.css('visibility', 'hidden');
                        if (editorInstance) { // Clean up if instance was partially created
                           try { await editorInstance.destroy(); } catch (e) {}
                           editorInstance = null;
                        }
                    }
                });
                console.log("LGS Item Viewer | Edit button listener attached.");
            });
        },
        close: async () => {
            console.log("LGS Item Viewer | Closing message editor dialog (final close handler).");
            if (editorInstance) {
                console.log("LGS Item Viewer | Destroying editor instance on close.");
                try {
                    // Check if editor has a destroy method before calling
                    if (typeof editorInstance.destroy === 'function') {
                         await editorInstance.destroy();
                    } else {
                         console.warn("LGS Item Viewer | Editor instance does not have a destroy method?");
                    }
                } catch (err) {
                    // Catch potential errors during destroy, especially if editor wasn't fully init
                    console.error("LGS Item Viewer | Error destroying editor instance:", err);
                }
                editorInstance = null;
            }
            // Reset state flags regardless
            isEditing = false;
            dirty = false;
        }
    }, {
        id: dialogId,
        width: 700,
        height: 700,
        resizable: true,
        classes: ["dialog", "lgs-item-viewer-editor"]
    });

    dialog.render(true);
}
/**
 * Replace a table with multiple tables based on top-level folder grouping
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source tab name
 * @param {string} type - The item type
 * @param {Array} items - The items to display
 * @param {Object} typeConfig - The field configuration for this type
 * @param {string} newStatus - The current display status (+ or -)
 * @param {jQuery} originalTable - The original table element being replaced
 */
 /*
 function xreplaceTablesWithGroupedTables(html, tabSource, type, items, typeConfig, newStatus, originalTable) {
  // Group items by top-level folder
  const itemsByFolder = {};
  
  items.forEach(item => {
    // Get the top-level folder from the folder path
    const folderPath = item.folderPath || '';
    let topLevelFolder = 'No Folder';
    
    if (folderPath) {
      // Extract the first folder in the path (before the first backslash)
      const folders = folderPath.split('\\');
      if (folders.length > 0 && folders[0]) {
        topLevelFolder = folders[0];
      }
    }
    
    // Initialize array for this folder if needed
    if (!itemsByFolder[topLevelFolder]) {
      itemsByFolder[topLevelFolder] = [];
    }
    
    // Add item to the folder group
    itemsByFolder[topLevelFolder].push(item);
  });
  
  // Create a container for the grouped tables
  const groupedTablesContainer = $('<div class="grouped-tables-container"></div>');
  
  // Create a table for each folder group
  let isFirst = true;
  Object.entries(itemsByFolder).forEach(([folderName, folderItems]) => {
    if (folderItems.length === 0) return;
    
    // Create a unique type identifier for this folder group
    const folderType = `${type}-${folderName.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;
    
    // Create the table
    const tableHtml = createItemTable(type, folderItems, typeConfig, newStatus, tabSource, folderName);
    const tableElement = $(tableHtml);
    
    // Set data attributes for the table
    tableElement.attr('data-folder-group', folderName);
    tableElement.attr('data-original-type', type);
    
    // Get the display settings to check for a custom name
    const displaySettings = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
    const settingsKey = `${tabSource}-${type}-folder-${folderName.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;
	console.info("settingsKey 1",settingsKey)
    const tableNameKey = `${settingsKey}-tableName`;
    const customTableName = displaySettings[tableNameKey] || '';
    
    // Only update the table header if there's no custom name (the createItemTable function handles custom names)
    if (!customTableName) {
      // Update the table header to include folder name
      tableElement.find('.itemCategoryHeader td div:first').html(`
        <strong><span class="tableHeader">${type.charAt(0).toUpperCase() + type.slice(1)}</span><br>(${folderName})</strong>
        ${game.user.isGM ? `<button class="table-config-button" data-tab="${tabSource}" data-type="${type}" data-folder-group="${folderName}"><i class="fas fa-cog"></i></button>` : ''}
      `);
    }
    
    // Add to the container
    groupedTablesContainer.append(tableElement);
    
    // If this is the first table, position it where the original table was
    if (isFirst) {
      originalTable.replaceWith(groupedTablesContainer);
      isFirst = false;
    }
  });
  
  // If no tables were created (unlikely), create an empty placeholder
  if (isFirst) {
    originalTable.replaceWith(groupedTablesContainer);
    groupedTablesContainer.html(`<p>No items found for ${type}.</p>`);
  }
}
/*
/**
 * Move a table or its containing details wrapper up or down in the left column
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {jQuery} table - The table element (.item-type-table) that was configured
 * @param {string} direction - The direction to move ('up' or 'down')
 */
function moveTable(html, table, direction) {
  const leftColumn = html.find('#leftColumn');

  // Determine the actual element to move. Check if the table is inside a details wrapper.
  const detailsWrapper = table.closest('details.hidden-item-table-details');
  // If a details wrapper exists, move the wrapper; otherwise, move the table itself.
  const elementToMove = detailsWrapper.length ? detailsWrapper : table;

  // Find all potential siblings: direct tables or direct details wrappers in the left column.
  // These are the elements whose order we can change.
  const siblings = leftColumn.children('table.item-type-table, details.hidden-item-table-details');

  // Find the index of the element we are moving within its siblings collection.
  const elementIndex = siblings.index(elementToMove);

  // Perform the move based on direction and index validity.
  if (direction === 'up' && elementIndex > 0) {
    // Move up: Get the sibling element immediately before the current one.
    const targetElement = siblings.eq(elementIndex - 1);
    // Insert the element to move before the target element.
    elementToMove.insertBefore(targetElement);
  } else if (direction === 'down' && elementIndex < siblings.length - 1) {
    // Move down: Get the sibling element immediately after the current one.
    const targetElement = siblings.eq(elementIndex + 1);
    // Insert the element to move after the target element.
    elementToMove.insertAfter(targetElement);
  } else {
    // Cannot move further in the requested direction.
    console.log(`LGS Item Viewer | Cannot move table ${direction}. Already at boundary.`);
    // Optional: provide feedback like disabling the button temporarily.
    return; // Exit early if no move is possible.
  }

  // Apply alternating row colors to all tables after the move.
  // This function should handle finding rows inside details/summary correctly if needed.
  applyAlternatingRowColors(html);

  // Save the new table order after moving.
  // saveTableOrder finds tables based on '.item-type-table', their DOM order should now reflect the visual order.
  saveTableOrder(html, html.find('.item-viewer-tab.active').data('source'));
}

/**
 * Save the current order of tables
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source tab name
 */
function saveTableOrder(html, tabSource) {
  const tableOrder = [];
  // Get all direct children of leftColumn that are tables or details wrappers containing tables
  // This ensures we capture the correct order of user-arranged elements.
  html.find('#leftColumn').children('table.item-type-table, details.hidden-item-table-details').each(function() {
      const element = $(this);
      let table;

      // Find the actual table element, whether it's the element itself or inside a details wrapper
      if (element.is('table.item-type-table')) {
          table = element;
      } else if (element.is('details.hidden-item-table-details')) {
          table = element.find('table.item-type-table').first(); // Find the table inside details
      } else {
          // Skip elements that aren't tables or details wrappers (like .tabMessage)
          return;
      }

      // Ensure we found a table element within the wrapper if it was details
      if (table && table.length > 0) {
          const tableTypeIdentifier = table.data('type'); // This IS the unique settingsKey

          if (tableTypeIdentifier) {
              // Always push the unique settingsKey (data-type) as the identifier
              tableOrder.push(tableTypeIdentifier);
              // console.log(`LGS Item Viewer | Saving order identifier: ${tableTypeIdentifier}`); // Debug log
          } else {
              console.warn("LGS Item Viewer | Found table element without a 'data-type' attribute during saveTableOrder.", table);
          }
      } else if (element.is('details')) {
          console.warn("LGS Item Viewer | Found details wrapper without a table inside during saveTableOrder.", element);
      }
  });

  // Log the final order being saved for debugging
  // console.log(`LGS Item Viewer | Final tableOrder for tab "${tabSource}":`, tableOrder);

  // Save table order to settings
  const allTableOrders = game.settings.get('lgs-item-viewer', 'tableOrders') || {};
  allTableOrders[tabSource] = tableOrder;
  game.settings.set('lgs-item-viewer', 'tableOrders', allTableOrders);
}