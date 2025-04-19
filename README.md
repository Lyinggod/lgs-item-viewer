# Lyinggods Compendium Item Viewer

This is a mostly system agnostic compendium viewer for showing items, journals, and actors in a centralized location. It allows for organization of items by compendium folder and folders in compendiums. If offers options for filtering by text, folders, and tags.

Some data may require system specific coding to be added.

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/item-viewer.jpg" width=800>

## Item Viewer Configuration

The item viewer will not work until it is configured. See the configuration wiki to setup the viewer.

<a href="https://github.com/Lyinggod/lgs-item-viewer/wiki/Configuring-Item-Viewer">Configure Table Viewer</a> Wiki

## Compatible systems

This offers basic compatibility "out of the box", once fields have been defined. If simple values are used, such as number or string (text characters), then these will be displayed in the view exactly as they are stored.

### Special Fields

Some fields have special values, such as a list of weapon qualites. These are not stored as simple but as arrays or objects. These fields require specific coding for the system.

In some cases it may be desired to add additional content to the description that is derived from stored values such as the example attributes in the following image being displayed as part of the description.

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/custom-desc-example.jpg" width=400>

<a href="https://github.com/Lyinggod/lgs-item-viewer/wiki/Adding-New-Systems">__Adding New Systems__</a> - To add your own systems, see this wiki.

**Requesting Custom Systems**

To request that your system be added to the viewer, submit a ticket that includes your system and desired results. You may be requested to provide a mockup or object with the desired output if the description is not clear.

I will also consider feature requests and bug reports, including css bugs. I am unlikely to consider an overhaul just to match a systems asthetics or visual theme.

### Currently Defined Systems
- FFG Star Wars
- Conan 2d20

The defined fields for these system can be found in <a href="https://github.com/Lyinggod/lgs-item-viewer/tree/main/setting%20files">System Files</a>. Paste the content into the _Field Configuration_ dialog via the _Import_ button.

## Recommended Modules

The _Item Tags_ module, in installed uses tags for additional filtering.

## Features

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/interface-map.jpg" width=800>

Items are shown, by default, in tables grouped by type, regardless of source, based on the the compendium folder they are in. 

### Folders in Compendiums

Folder in compendiums are used to assist in filtering display

1. **Info Tab**: This is a permanent tab. It will show the contents of page "Player Message" from journal _Catalog Viewer Journal_.
2. **Additional Tabs** - Defined via settings, these are used to group items based on compendium folders. This tab shows that it is hidden from players.
3. **Table Configuration** - Provides options to configure tables (see below)
4. **Filter Column Configuration** - Allows folders to be hidden from players. In the picture the _Adventure_ folder and all subfolders are hidden from player,
  - Filters are based on the folders inside compendiums and appear, by default, alphabetically by name.
  - Drag and drop can be used to re-order folders within the level. Example _Armor_ and _Weapons_ can be re-ordered but cannot be moved outside of _Adventurer_.
5. **Filter by Folder** - check to see only items contain in that folder
6. **Filter by Tag** - If using the _Item Tags_ module, the tags will appear here.
7. **Live Search Field** - Searches items display from filaters as you type using partial word match. Searching "Cat" "_Cat_ch". Multiple words can be used; e.g. "magic sword"
8. **Table Hidden From Player** - Player hidden tables are collapsed and still accessible by the GM. This is set in #2.
9. **Item Icon** - Click to view sheet or drag to actor. Dragging Journals and non-actor compatible items will have not affect.

**Table Configuration**

This dialog is used to configure the appearance of tables

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/table-configuration-dialog.jpg" width=400>

- **Table Name** - By default the table name is the name of the item type.
- **Table Message** - A HTML message placed below the table name.
- **Grid View**
  -  Checked: Shows the table in a a grid as in the above image. Click on the row to show the item description.
  -  Unchecked: Shows only one column with all fields displayed horizontally, with the description as the last element.
-  **Group Items by folder**: Subdivides tables based on folder source. This causes table name to default back to item type.
-  **Hide From Players**: Hides the table from players. Collapses the table in GM view
-  **Hide Folder Name**: When using _Group Items by Folder_, the source folder is shown below the name. This hides the folder name.
-  **Image Display Options**: Sets the maximum height and width of the table and its location. In grid view, image appears with description.
  - **Trim large Images**: Sets image to full size. If image is wider or taller then maximum size then it trims the left/right or bottom the image based on whether it is wider or higher then max.
- **Move** - Change relative position of table compared to other tables in the tab. Changed _Group Items by Folder_ resets this to original position. This functions in real time.
  - Use _Hide Folder Rows_ in _Temporary Settings_ section to hide table rows to make changing row positions easier to see.

## Catalog Viewer Journal

The _Catalog Viewer Journal_ is used to provide information to the players and auguement folder or tag information. 

A player message may be shown to the user by creating a page called _Player Message_. This may conain @UUID links to journals, actors, or items.

Additionally _journal pills_ may be create that amplifying information associated with the folders or tags that appear on the right. Clicking the pill will show the related journal.

### Journals Pills

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/journal-pills.jpg" width=600>

Depending on the chosen methods of organization, it may be beneficial to have additional information available to the player based on the folder name or the tag as it relates to a folder. 

This information is provided via Journal pills, which are buttons that will show a journal page relating to folder names or tags. 

In the above image, the _Gear_ button is folder note and the _Kit_ button is a tag note. Clicking the button will show the journal page relating to the button. These are assigned per table since a _Kit_ could have a different definition or description, depending on the table.

## Creating a Journal Pill

To create a journal pill, create a page in journal _Catalog Viewer Journal_ and name the page based on the following formats. 

Using _Groups Items by Folder_ in _Table Configuration_ dialog affects the format:

- _Group Items by Type_: Checked
  - {Tag Name from Filter List} (tag) ({OriginalItemType}-folder-{Folder-Name-with-hyphens})
  - {Folder Name from Filter List} ({OriginalItemType}-folder-{SanitizedTopLevelFolderName})
- _Group Items by Type_: Unchecked
  - {Tag Name from Filter List} (tag) (OriginalItemType)
  - {Folder Name from Filter List} ({OriginalItemType})

- _Tag Name_: Name of the tag as defined via the _Item Tags_ module. It can be multiple words
- _(tag)_:  This must be as shown and defines that a page is for a tag and not a folder.
- _OriginalItemType_: The item type of the item. This same as the default table name for the item type
- _-folder-_: This must be exactly folder, including dashes.
- _Folder-Name-with-hyphens_: The name of the folder seen under _Filter by Folder_, with spaces replaced with hyphens. Therefore if the folder name is _Combat Kits_, this would be _Combat-Kits_.

Example of creating journal entry for the tag _Kit_ for items in the _Kits_ Folder that are of item type "gear" (_Group Items by Folder_ is checked).

- Kit (tag) (gear-folder-Kits)

Example of creating journal entry for the folder _Melee Weapons_ for item type _weapon_ (_Group Items by Folder_ is **not** checked).

- Melee Weapons (weapon)

## Tags

Tags are a convienient method of organizing items by type. _Item Tags_ module offers a simple way to do this.

### Special Tags

If the _Item Tags_ module is installed, the tag "hide" can be used to hide individual items from players, showing a Ban icon, next to the item, to the GM.

## Installation

This module can be installed through Foundry

Alternately

Click on <a href="https://github.com/Lyinggod/lgs-item-viewer/releases">Releases</a> on the right, then, under the _Lastest Release_, right click on module.json and copy the link. Paste this link into the _Install from Manifest_ option in Forge or Foundry.
