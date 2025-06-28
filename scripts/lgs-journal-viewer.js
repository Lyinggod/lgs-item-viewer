import { replaceSystemSymbols } from './system-variations.js';

/**
 * lgs-journal-viewer.js
 * This module provides journal‐reading functionality.
 * All functions in this file start with "journal" to avoid naming conflicts.
 */
/**
 * Retrieve and format the content of a journal by its UUID.
 * If the journal has more than one page, each page is rendered as a
 * <details> element with a <summary> (page name) and an indented <div class="detail"> (page content).
 * If there is only one page, its content is shown directly.
 * The returned HTML is wrapped in a <td> element whose class depends on grid view mode.
 * 
 * @param {string} journalUuid - The UUID of the journal to read.
 * @param {boolean} isGridView - True if Grid View is enabled.
 * @returns {string} HTML string for the journal content.
 */
export function journalGetJournalContent(journalUuid, isGridView) { // isGridView parameter seems unused here
  const journal = fromUuidSync(journalUuid);
  if (!journal) return `<p>Journal with UUID "${journalUuid}" not found.</p>`;

  const pagesCollection = journal.pages;
  let combinedContent = "";

  if (pagesCollection.size > 1) {
    pagesCollection.contents.forEach(page => {
      const level = (page.flags && page.flags.lgs && page.flags.lgs.level) ? page.flags.lgs.level : 0;
      const indent = " ".repeat(level * 4);
      const pageContentRaw = page.text?.content ?? "";
      const pageContentProcessed = replaceSystemSymbols(pageContentRaw); // Uses dynamic replacer

      combinedContent += `<div class="journal-page" style="margin-left: ${level * 20}px;">`;
      combinedContent += `<details><summary>${indent}${page.name}</summary>`;
      combinedContent += `<div class="detail">${indent}${pageContentProcessed}</div></details>`;
      combinedContent += `</div>`;
    });
  } else if (pagesCollection.size === 1) {
    const pageContentRaw = pagesCollection.contents[0].text?.content ?? "";
    combinedContent = replaceSystemSymbols(pageContentRaw); // Uses dynamic replacer
  } else {
    combinedContent = `<p>No pages found in journal.</p>`;
  }
  return combinedContent;
}