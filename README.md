# Lyinggods Compendium Item Viewer

This is a mostly system agnostic compendium viewer for showing items, journals, and actors in a centralized location. It allows for organization of items by compendium folder and folders in compendiums. If offers options for filtering by text, folders, and tags.

Some data may require system specific coding to be added.

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/item-viewer.jpg" width=800>

## Item Viewer Configuration

The item viewer will not work until it is configured. See the configuration wiki to setup the viewer.

<a href="https://github.com/Lyinggod/lgs-item-viewer/wiki/Configuring-Item-Viewer">Configure Table Viewer</a> Wiki

## Compatible systems

Some fields require special coding to be seen correctly because of how they are stored. If a desired field does not appear in the Fields macro, this may be the case.  It may also be desired to add special text into the description. In the following example, additional code was added to display attributes in the description as a table:

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/custom-desc-example.jpg" width=400>

To request that your system be added to the viewer, submit a ticket that includes your system and desired results. You may be requested to provide a mockup or object with the desired output if the description is not clear.

I will also consider feature requests and bug reports, including css bugs. I am unlikely to consider an overhaul just to match a systems asthetics or visual theme.

### Systems
- FFG Star Wars
- Conan 2d20

## Features

Items are shown, by default, in tables grouped by type, regardless of source, based on the the compendium folder they are in. 

### Folders in Compendiums

Folder in compendiums are used to assist in filtering display

**Filter by Folder** - Checking a checkbox will show only items associated with that folder.

**Lock Button** - Click to unlock additional options

- **Folder Order** - Folders may be re-ordered within their folder level and group via the lock button and using drag and drop. You cannot move a subfolder out from under its parent folder (1 level higher).
- **Hide Folders** - Folders may be hidden from players. Clicking the grey ban symbol will hide a folder, and any subfolders, from player view. 

**Filter by Tags** - If the module _Item Tags_ is used, items also be sorted by tags.

**Search** - Live search using a partial, multiple word search; "cat" will show "cat", "catch", "scatter". "cat" and "bug" will show only show items that have words that contain both these groups of text.


### Table View

Each table has a cog which opens a configuration dialog for that table.

- **Grid View**
  - Cheched: Shows fields in grids. Description is shown by clicking on the row
  - Unchecked: All fields are shown as a list.
- **Group Items by Folder**
  - Checked: Shows separate tables based folder name and type. Therefore if a Compendium had a folder named "Melee" and a folder named "Range" that had items of type "weapon" then, instead of one table, there would be two.
  - Unchecked: A single table is displayed for each type.
- **Hide from Players** - Hides the specific table from players. This is marked with a ban icon in the GM view.
- **Select Image Type** - This defines how images appear, if assigned to the item. This is per table.
- **Move**: - This is used to move the relative position of the table compared to other tables in the tab each time the up or down arrow is clicked. The _Hide Table Rows_ checkbox will collapse tables, making them easier to see.

## Journals Notes

## Viewing journals as items

## Item Icon (left column)

