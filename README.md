# Lyinggods Compendium Item Viewer

This is a mostly system agnostic compendium viewer for showing items, journals, and actors in a centralized location. It allows for organization of items by compendium folder and folders in compendiums. If offers options for filtering by text, folders, and tags.

Some data may require system specific coding to be added.

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/item-viewer.jpg" width=800>

## Compendium Preparation

Compendiums must be placed in a compendium folder called _Item Viewer_. Folders within the Item Viewer folder are used to orgranize compendiums are into logical groups.

**Setup**

- Create a compendium folder called "Item Viewer".
- Inside the folder _Item Viewer_, place one folder for tab that will appear in the viewer. The folder names will not be representative of the tab names.
- Inside each tab folder, place the compendiums who contents will be associated with the tab.

### Tab Configuration

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/tab-configuration-dialog.jpg" width=400>

Before the item viewer can be used, it must be configured by assigning a tab name and the name of the folder that will show the tab contents.

- **+**: Add a new tab row
- **Tab Name**: The name of the tab as shown in the viewer.
- **Folder Name**: The name of the folder, inside the _Item Viewer_ Folder that is associated with the tab.
- **Hide**: Hides the tab from players. The tab name will have a ban icon next to it.
- **Export Button**: Shows a dialog that contains the saved tab information.
- **Import Button**: Creates a dialog that allowed the exported data to be pasted into.
- **Tab Header**: Reveals a text field to add text or HTML that will appear at the top of the tab.

Drag and Drop rows to set the tab order.

### Item Configuration

Due to the agnostic nature of the viewer, tab names as well as all items and actor item types, as well as journals, must be defined in the module.

For the purposes of this module, an item is considered to be any actor or item such as PC or a weapon, or journal.

**Field Values**

Before an item can be defined, its type and desired fields must determined.  

- If familiar with JSON, a (dummy) item can be exported and the contents examined.
- Use the provided macros to view actors and items: _Show Actor Info_ and _Show Item Info_.
  - Modules will read items placed in folder _Field Test_.
  - Modules show the field paths and values with items.
  - Use custom field values to help identify correct paths.
  - Click a path to selected it. Use CTRL+C to copy the path into memory.
- Journals are not shown in the macros as they are addressed below.

_Macro Example_

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/macro-example.jpg" width=400>

### Defining Items and Fields

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/configure-fields-dialog.jpg" width=400>

**+ Add Item Type** button - Adds a new item block

**Import Button** - Same function as in defining tabs

**Export Button** - Same function as in defining tabs

**item Type**: This name of the type such as _weapon_, _armor_, _talent_, _npcaction_, etc.

**Name**: The name of the field that the user will see. This can be anything.

**Object**: the full path of the field on the item. 
- For name, this will be _name_
- For journals, this is will be _journal_
- For everythig else, this will usually start with "system" and be similar to _system.description_ or _system.brawn.value_.

**Sort**: This sorts fields based on this number as the prioritiy for sorting. The assumption is that the name field will have a 1 and other rows will leave this blank.

**!Center**: aka _Not Centered_. In grid view, cells will be centered unless this is checked.

If a path is incorrect, the value _field?_ will be shown. 

**Journals**

Journals only have one field, _Name_. Other fields that are automatically added should be deleted.

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/journal-field-example.jpg" width=400>

**Drag and Drop**

Rows in the _Configure Fields_ dialog may be dragged and dropped to determine the order they appear in the viewer, except for description or biography. These will always appear after all other fields defined in this dialog regardless of their order in the item list.

## Compatible systems

Some fields require special coding to be seen correctly because they are stored in array or similar issues.  It may also be desired to add special text into the description. In the following example, additional code was added to display attributes in the description as a table:

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

