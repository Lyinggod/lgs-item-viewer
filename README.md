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

<a href="https://github.com/Lyinggod/lgs-item-viewer/wiki/Adding-New-Systems">__Adding New Systems__</a> - To add your own systems, see this wiki.

**Requesting Custom Systems**

To request that your system be added to the viewer, submit a ticket that includes your system and desired results. You may be requested to provide a mockup or object with the desired output if the description is not clear.

I will also consider feature requests and bug reports, including css bugs. I am unlikely to consider an overhaul just to match a systems asthetics or visual theme.

### Currently Defined Systems
- FFG Star Wars
- Conan 2d20

## Features

<img src="https://github.com/Lyinggod/lgs-item-viewer/blob/main/images/interface-map.jpg" width=800>

Items are shown, by default, in tables grouped by type, regardless of source, based on the the compendium folder they are in. 

### Folders in Compendiums

Folder in compendiums are used to assist in filtering display

1. **Tabs** - Defined via settings, these are used to group items based on compendium folders. This tab shows that it is hidden from players.
2. **Table Configuration** - Provides options to configure tables (see below)
3. **Filter Column Configuration** - Allows folders to be hidden from players. In the picture the _Adventure_ folder and all subfolders are hidden from player,
- Filters are based on the folders inside compendiums and appear, by default, alphabetically by name.
- Drag and drop can be used to re-order folders within the level. Example _Armor_ and _Weapons_ can be re-ordered but cannot be moved outside of _Adventurer_.
4. **Filter by Folder** - check to see only items contain in that folder
5. **Live Search Field** - Searches items display from filaters as you type using partial word match. Searching "Cat" "_Cat_ch". Multiple words can be used; e.g. "magic sword"
6. **Table Hidden From Player** - Player hidden tables are collapsed and still accessible by the GM. This is set in #2.
7. **Item Icon** - Click to view sheet or drag to actor. Dragging Journals and non-actor compatible items will have not affect.

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


## Journals Notes

## Viewing journals as items

## Item Icon (left column)

