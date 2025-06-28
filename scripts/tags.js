//filename:tags.js
import { applySearchFilter, processLabelJournalEntries, checkTableVisibility, applyAlternatingRowColors, isHiddenFolder, createItemTable, buildFolderFilters, addItemTableEventListeners } from "./lgs-item-viewer.js";
import { getNestedProperty as getNestedPropertyFromSystem } from './system-variations.js';

/**
 * Load and display items for the selected tab
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {string} tabSource - The source (compendium folder name) for the selected tab
 */
export async function loadTabContent(html, tabSource, requestToken, getLatestToken) {
  const leftColumn = html.find('#leftColumn');
  const rightColumn = html.find('#rightColumn');

  if (requestToken !== getLatestToken()) {
    console.log(`LGS Item Viewer | loadTabContent for ${tabSource} aborted (stale token at start).`);
    return;
  }

  console.log('LGS Item Viewer | Loading tab content for:', tabSource);
  // initializeDialog now handles clearing leftColumn and showing loader.
  // rightColumn is for filters, safe to clear here for the new tab.
  rightColumn.empty();


  const compendiums = game.packs.filter(pack =>
    pack.metadata.folder === tabSource || (pack.folder && pack.folder.name === tabSource)
  );
  if (compendiums.length === 0) {
    if (requestToken === getLatestToken()) {
        leftColumn.empty().append(`<p>No compendiums found in folder "${tabSource}"</p>`);
    }
    return;
  }

  const showHiddenFolders = game.user.isGM && html.closest('#GenesysItemViewer').find('#hidden-folders-toggle').prop('checked');
  const allItems = [];
  const folderPaths = new Set();

  for (const pack of compendiums) {
    if (pack.limited && !game.user.isGM) continue;
    if (requestToken !== getLatestToken()) {
        console.log(`LGS Item Viewer | Compendium processing for ${tabSource} from ${pack.collection} aborted (token check before getDocuments).`);
        return;
    }
     try {
         const packItems = await pack.getDocuments();
         if (requestToken !== getLatestToken()) {
             console.log(`LGS Item Viewer | Item processing for ${tabSource} from ${pack.collection} aborted (token check after getDocuments).`);
             return;
         }
         packItems.forEach(item => {
             let folderPath = "";
             if (item.folder) {
                 const pathSegments = [];
                 let currentFolder = item.folder;
                 while (currentFolder) { pathSegments.unshift(currentFolder.name); currentFolder = currentFolder.folder; }
                 folderPath = pathSegments.join('\\') + '\\';
             }
             item.folderPath = folderPath;
             if (shouldDisplayItem(item, showHiddenFolders)) {
                 if (folderPath) {
                     const pathParts = folderPath.split('\\').filter(p => p);
                     let currentPathAccum = "";
                     for (const part of pathParts) {
                         currentPathAccum += part + '\\';
                         if (!isHiddenFolder(part) || showHiddenFolders) folderPaths.add(currentPathAccum);
                     }
                 }
                 allItems.push(item);
             }
         });
     } catch (error) {
         console.error(`Error loading documents from compendium ${pack.collection}:`, error);
         if (requestToken === getLatestToken()) {
             ui.notifications.warn(`Could not load items from compendium: ${pack.metadata.label}`);
         }
     }
  }

  if (requestToken !== getLatestToken()) {
    console.log(`LGS Item Viewer | loadTabContent for ${tabSource} aborted (token check before item grouping/sorting).`);
    return;
  }

  const fieldConfigs = game.settings.get('lgs-item-viewer', 'fieldConfiguration');
  const displayStatus = game.settings.get('lgs-item-viewer', 'displayStatus') || {};
  const groupedItems = {};
  allItems.forEach(item => {
    const type = item instanceof JournalEntry ? "JournalEntry" : item.type;
    if (!groupedItems[type]) groupedItems[type] = [];
    groupedItems[type].push(item);
  });

  for (const type in groupedItems) {
      const groupByFolderKey = `${tabSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${type.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-groupByFolder`;
      const sortByFolderSortKey = `${tabSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-${type.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-sortByFolderSort`;
      const isGroupByFolder = displayStatus[groupByFolderKey] === true;
      const isSortByFolderSort = displayStatus[sortByFolderSortKey] === true;

      if (!(isGroupByFolder && isSortByFolderSort)) {
          const configType = type === "JournalEntry" ? "journal" : type;
          const config = fieldConfigs.find(c => c.type.toLowerCase() === configType.toLowerCase());
          if (config) {
              const sortingFields = config.fields.filter(field => field.sortIndex && field.sortIndex !== '');
              if (sortingFields.length > 0) {
                  const sortedFields = sortingFields.sort((a, b) => (parseInt(a.sortIndex) || 9999) - (parseInt(b.sortIndex) || 9999));
                  groupedItems[type].sort((a, b) => {
                      for (const sortField of sortedFields) {
                          const objectPath = sortField.object.startsWith('item.') ? sortField.object.substring(5) : sortField.object;
                          const aValue = getNestedPropertyFromSystem(a, objectPath);
                          const bValue = getNestedPropertyFromSystem(b, objectPath);
                          if (aValue === bValue) continue;
                          if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
                          const numA = Number(aValue); const numB = Number(bValue);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          return String(aValue || '').localeCompare(String(bValue || ''), undefined, { sensitivity: 'base' });
                      }
                      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
                  });
              } else { groupedItems[type].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })); }
          } else { groupedItems[type].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })); }
      }
  }

  const allTableOrders = game.settings.get('lgs-item-viewer', 'tableOrders') || {};
  const savedTableOrder = allTableOrders[tabSource] || [];
  const allPossibleTables = new Map();

  for (const [type, items] of Object.entries(groupedItems)) {
    if (items.length === 0) continue;
    const sanitizedTabSource = tabSource.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const sanitizedType = type.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const groupByFolderKey = `${sanitizedTabSource}-${sanitizedType}-groupByFolder`;
    const isGroupByFolder = displayStatus[groupByFolderKey] === true;

    if (isGroupByFolder) {
      const itemsByFolder = {};
      items.forEach(item => {
        const folderPath = item.folderPath || '';
        let topFolder = 'No Folder';
        if (folderPath) { const folders = folderPath.split('\\'); if (folders.length > 0 && folders[0]) topFolder = folders[0]; }
        if (!itemsByFolder[topFolder]) itemsByFolder[topFolder] = [];
        itemsByFolder[topFolder].push(item);
      });
      Object.entries(itemsByFolder).forEach(([folder, folderItems]) => {
        if (folderItems.length > 0) {
          const tableId = `${sanitizedTabSource}-${sanitizedType}-folder-${folder.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;
          allPossibleTables.set(tableId, { type, folder, items: folderItems, isGrouped: true });
        }
      });
    } else {
      const tableId = `${sanitizedTabSource}-${sanitizedType}`;
      allPossibleTables.set(tableId, { type, folder: null, items, isGrouped: false });
    }
  }

  const renderedTables = new Set();
  const tableCreationPromises = [];

  if (savedTableOrder.length > 0) {
    for (const tableId of savedTableOrder) {
      if (allPossibleTables.has(tableId)) {
        const tableInfo = allPossibleTables.get(tableId);
        const configType = tableInfo.type === "JournalEntry" ? "journal" : tableInfo.type;
        const typeConfig = fieldConfigs.find(config => config.type.toLowerCase() === configType.toLowerCase());
        const currentStatus = displayStatus[tableId] || '+';
        tableCreationPromises.push(createItemTable(tableInfo.type, tableInfo.items, typeConfig, currentStatus, tabSource, tableInfo.folder, requestToken, getLatestToken));
        renderedTables.add(tableId);
      }
    }
  }

  const remainingTables = Array.from(allPossibleTables.entries())
     .filter(([tableId]) => !renderedTables.has(tableId))
     .sort(([idA, infoA], [idB, infoB]) => {
         let typeCompare = infoA.type.localeCompare(infoB.type);
         if (typeCompare !== 0) return typeCompare;
         const folderA = infoA.folder || ""; const folderB = infoB.folder || "";
         return folderA.localeCompare(folderB);
     });

  for (const [tableId, tableInfo] of remainingTables) {
    const configType = tableInfo.type === "JournalEntry" ? "journal" : tableInfo.type;
    const typeConfig = fieldConfigs.find(config => config.type.toLowerCase() === configType.toLowerCase());
    const currentStatus = displayStatus[tableId] || '+';
    tableCreationPromises.push(createItemTable(tableInfo.type, tableInfo.items, typeConfig, currentStatus, tabSource, tableInfo.folder, requestToken, getLatestToken));
  }

  if (requestToken !== getLatestToken()) {
      console.log(`LGS Item Viewer | loadTabContent for ${tabSource} aborted (token check before Promise.all(createItemTable)).`);
      return;
  }
  const tableHtmlResults = await Promise.all(tableCreationPromises);

  if (requestToken !== getLatestToken()) {
    console.log(`LGS Item Viewer | DOM update for ${tabSource} aborted (stale token before rendering tables).`);
    return;
  }

  leftColumn.empty(); 

  tableHtmlResults.forEach(tableHtmlString => {
      if (tableHtmlString) leftColumn.append(tableHtmlString);
  });
  
  if (leftColumn.is(':empty') && compendiums.length > 0 && allItems.length === 0 && tableHtmlResults.every(s => s === '')) {
      leftColumn.html('<p>No items to display for the current filters/settings or loading was interrupted.</p>');
  } else if (leftColumn.is(':empty') && tableHtmlResults.every(s => s === '')) { // If all tables were aborted or empty
      leftColumn.html('<p>No content to display for this tab.</p>');
  }


  buildFolderFilters(html, Array.from(folderPaths), tabSource, showHiddenFolders);
  const uniqueTags = collectUniqueTags(html); 
  if (uniqueTags.length > 0) buildTagFilters(html, uniqueTags);

  addItemTableEventListeners(html, tabSource);
  applyAlternatingRowColors(html);
  checkTableVisibility(html);
  processLabelJournalEntries(html, tabSource);
  applySearchFilter(html); 
  updateTagVisibility(html);
  applyAlternatingRowColors(html);
  checkTableVisibility(html);
}

/**
 * Collect unique tags from all items in the tables
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @returns {Array} Array of unique tags
 */
function collectUniqueTags(html) {
  const uniqueTags = new Set();
  html.find('#leftColumn .item-type-table .first-row').each(function() {
    const uuid = $(this).data('uuid');
    if (!uuid) return;
    try {
        const item = fromUuidSync(uuid);
        if (!item) return;
        const itemTags = getNestedPropertyFromSystem(item, 'flags.item-tags.tags'); // Use shared helper
        if (itemTags && Array.isArray(itemTags)) itemTags.forEach(tag => uniqueTags.add(tag));
    } catch (e) { console.warn(`LGS Item Viewer | Error retrieving item ${uuid} for tag collection:`, e); }
  });
  return Array.from(uniqueTags).sort();
}

/**
 * Create tag filter checkboxes 
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {Array} tags - Array of unique tags
 */
/**
 * Create tag filter checkboxes
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 * @param {Array} tags - Array of unique tags
 */
export function buildTagFilters(html, tags) {
  // Create container for tag filters below folder filters
  const tagFiltersContainer = $('<div class="tag-filters"><h3>Filter by Tag</h3></div>');

  // Create checkbox elements first, without appending yet
  const checkboxElements = [];
  tags.forEach(tag => {
    const checkboxDiv = $(`
      <div class="tag-filter-item">
        <label>
          <input type="checkbox" class="tag-filter-checkbox" data-tag="${tag}">
          <span class="tagFilterText">${tag}</span>
        </label>
      </div>
    `);
    checkboxElements.push(checkboxDiv);
  });

  // Sort the checkbox elements based on the text in the span.tagFilterText, ignoring leading spaces
  checkboxElements.sort((a, b) => {
    // --- MODIFICATION START ---
    // Get text, trim leading spaces, and convert to lowercase for comparison
    const textA = a.find('.tagFilterText').text().trimStart().toLowerCase();
    const textB = b.find('.tagFilterText').text().trimStart().toLowerCase();
    // --- MODIFICATION END ---
    return textA.localeCompare(textB);
  });

  // Append the sorted elements to the container
  checkboxElements.forEach(element => {
    tagFiltersContainer.append(element);
  });

  // Insert the tag filters container after folder filters
  html.find('.folder-filters').after(tagFiltersContainer);

  // Add event listener for tag checkboxes
  tagFiltersContainer.find('.tag-filter-checkbox').change(function() {
    updateTagVisibility(html);

    // Apply alternating row colors
    applyAlternatingRowColors(html);

    // Check if any tables need to be hidden
    checkTableVisibility(html);
  });
}

/**
 * Update item visibility based on selected tags using AND logic
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 */
export function updateTagVisibility(html) {
  const selectedTags = [];
  
  // Get all checked tags
  html.find('.tag-filter-checkbox:checked').each(function() {
    selectedTags.push($(this).data('tag'));
  });
  
  // If no tags selected, show all first-rows that aren't hidden by other filters
  if (selectedTags.length === 0) {
    html.find('.first-row').each(function() {
      // Make first-rows visible if they were hidden by tag filtering
      // This preserves visibility from folder filters and search
      if ($(this).data('hidden-by-tag') === true) {
        $(this).data('hidden-by-tag', false);
        
        // Only show if not hidden by other filters
        if (!$(this).data('hidden-by-folder') && !$(this).data('hidden-by-search')) {
          $(this).show();
        }
      }
    });
    
    // Make sure all second-rows with hidden-by-tag are still marked hidden
    // but don't change their display status (they should remain hidden)
    html.find('.second-row').each(function() {
      if ($(this).data('hidden-by-tag') === true) {
        $(this).data('hidden-by-tag', false);
        // Do not show second-rows - they remain hidden until clicked
      }
    });
    
    // Update the visible tags
    updateVisibleTagCheckboxes(html);
    return;
  }
  
  // Process each row to update visibility
  html.find('.first-row, .second-row').each(function() {
    const row = $(this);
    const rowTags = row.attr('data-tags');
    
    // Skip rows without tags
    if (!rowTags) {
      row.data('hidden-by-tag', true);
      row.hide();
      return;
    }
    
    // Convert row tags to array
    const rowTagsArray = rowTags.split(',');
    
    // Check if ALL selected tags exist in this row's tags (AND logic)
    let allTagsMatch = true;
    
    for (const tag of selectedTags) {
      if (!rowTagsArray.includes(tag)) {
        allTagsMatch = false;
        break;
      }
    }
    
    // Show/hide row based on AND logic match
    if (allTagsMatch) {
      // Only show first-rows if not hidden by other filters
      if (row.hasClass('first-row')) {
        if (row.data('hidden-by-tag') === true) {
          row.data('hidden-by-tag', false);
          
          // Only show if not hidden by other filters
          if (!row.data('hidden-by-folder') && !row.data('hidden-by-search')) {
            row.show();
          }
        }
      } else {
        // For second-rows, just update the flag but don't change display
        // (they should remain hidden until the first-row is clicked)
        row.data('hidden-by-tag', false);
      }
    } else {
      // Hide this row and mark it as hidden by tag filter
      row.data('hidden-by-tag', true);
      row.hide();
    }
  });
  
  // Update visible tags based on visible rows
  updateVisibleTagCheckboxes(html);
}
/**
 * Update which tag checkboxes are shown based on visible rows
 * @param {jQuery} html - The jQuery object representing the dialog's HTML
 */
export function updateVisibleTagCheckboxes(html) {
  // Get all rows that are not hidden by folder filters or search
  const availableRows = html.find('.first-row').filter(function() {
    // For updating checkboxes, we only consider rows hidden by folder or search,
    // not ones hidden by tag filters (since that's what we're controlling)
    return !$(this).data('hidden-by-folder') && !$(this).data('hidden-by-search');
  });
  
  // Collect tags from available rows
  const availableTags = new Set();
  availableRows.each(function() {
    const rowTags = $(this).attr('data-tags');
    if (rowTags) {
      rowTags.split(',').forEach(tag => availableTags.add(tag));
    }
  });
  
  // Get currently checked tags
  const checkedTags = new Set();
  html.find('.tag-filter-checkbox:checked').each(function() {
    checkedTags.add($(this).data('tag'));
  });
  
  // Show/hide tag checkboxes based on available tags
  html.find('.tag-filter-checkbox').each(function() {
    const checkbox = $(this);
    const tag = checkbox.data('tag');
    
    // If checkbox is checked, always show it
    if (checkbox.prop('checked')) {
      checkbox.parent().parent().show();
      return;
    }
    
    // Only show unchecked checkboxes for tags that appear in rows 
    // that have ALL currently selected tags
    let shouldShow = availableTags.has(tag);
    
    // If there are checked tags, we need to filter more precisely
    if (checkedTags.size > 0) {
      shouldShow = false;
      
      // Check each available row that has all currently checked tags
      availableRows.each(function() {
        const rowTags = $(this).attr('data-tags');
        if (!rowTags) return;
        
        const rowTagsArray = rowTags.split(',');
        
        // Check if this row has all currently checked tags
        let hasAllCheckedTags = true;
        checkedTags.forEach(checkedTag => {
          if (!rowTagsArray.includes(checkedTag)) {
            hasAllCheckedTags = false;
          }
        });
        
        // If this row has all checked tags AND the tag we're checking
        if (hasAllCheckedTags && rowTagsArray.includes(tag)) {
          shouldShow = true;
          return false; // Break the loop early
        }
      });
    }
    
    // Show/hide based on our determination
    checkbox.parent().parent().toggle(shouldShow);
  });
}

/**
 * Check if an item should be displayed based on hidden folder settings
 * @param {Object} item - The item document
 * @param {boolean} showHiddenFolders - Whether to show items in hidden folders
 * @returns {boolean} Whether to display the item
 */
function shouldDisplayItem(item, showHiddenFolders) {
  // If no folder, always display
  if (!item.folder) return true;

  // Build folder path and check for hidden marker
  let currentFolder = item.folder;

  while (currentFolder) {
    if (isHiddenFolder(currentFolder.name)) {
      // If folder is hidden, only show if hidden folders toggle is on
      return showHiddenFolders;
    }
    currentFolder = currentFolder.folder;
  }

  // If not in any hidden folder, always display
  return true;
}