/**
 * Dialog class for the Item Viewer
 */
export class ItemViewerDialog extends Dialog {
  /** @override */
  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    
    // Store a reference to render function for later use
    this._renderFunction = dialogData.render;
  }
  
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 800,
      height: 600,
      resizable: true,
      classes: ['item-viewer-dialog'],
      minimizable: true
    });
  }
  
  /** @override */
  getData() {
    const data = super.getData();
    
    // Additional data for the template
    data.isGM = game.user.isGM;
    
    return data;
  }
  
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Call the render function passed in the constructor
    if (this._renderFunction) {
      this._renderFunction(html);
    }
  }
  
  /** @override */
  async _onResize(event) {
    super._onResize(event);
    
    // Update column widths when the dialog is resized
    const rightColumn = this.element.find('#rightColumn');
    if (rightColumn.length) {
      rightColumn.css('width', '200px');
      
      const leftColumn = this.element.find('#leftColumn');
      const dialogWidth = this.element.width();
      if (leftColumn.length && dialogWidth) {
        leftColumn.css('width', `${dialogWidth - 220}px`);
      }
    }
  }
}