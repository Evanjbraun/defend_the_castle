import * as THREE from 'three';

/**
 * UI Manager for inventory displays
 */
export class InventoryUI extends THREE.EventDispatcher {
    /**
     * Create a new inventory UI manager
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        super();
        
        this.inventory = config.inventory || null;
        this.container = config.container || document.createElement('div');
        this.itemTooltip = config.itemTooltip || this._createTooltip();
        this.isDragging = false;
        this.draggedItem = null;
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // UI state
        this.isOpen = false;
        this.activeTab = 'all';
        this.sortMethod = 'default';
        this.filterText = '';
        
        // Initialize the UI
        this._initialize(config);
    }
    
    /**
     * Initialize the inventory UI
     * @param {Object} config - Configuration options
     * @private
     */
    _initialize(config) {
        // Create the UI structure
        this._createUIStructure();
        
        // Connect to inventory events if available
        if (this.inventory) {
            this._connectInventoryEvents();
            this.refresh();
        }
        
        // Add event listeners
        this._setupEventListeners();
    }
    
    /**
     * Create the tooltip element
     * @returns {HTMLElement} The tooltip element
     * @private
     */
    _createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'item-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.zIndex = '1000';
        tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '10px';
        tooltip.style.borderRadius = '5px';
        tooltip.style.pointerEvents = 'none';
        
        document.body.appendChild(tooltip);
        
        return tooltip;
    }
    
    /**
     * Create the UI structure
     * @private
     */
    _createUIStructure() {
        this.container.innerHTML = '';
        this.container.className = 'inventory-ui';
        
        // Create the header
        const header = document.createElement('div');
        header.className = 'inventory-header';
        
        const title = document.createElement('h2');
        title.textContent = 'Inventory';
        header.appendChild(title);
        
        // Create tabs
        const tabs = document.createElement('div');
        tabs.className = 'inventory-tabs';
        
        const tabData = [
            { id: 'all', label: 'All' },
            { id: 'weapons', label: 'Weapons' },
            { id: 'armor', label: 'Armor' },
            { id: 'accessories', label: 'Accessories' },
            { id: 'consumables', label: 'Consumables' },
            { id: 'materials', label: 'Materials' }
        ];
        
        tabData.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = 'inventory-tab';
            tabElement.dataset.tab = tab.id;
            tabElement.textContent = tab.label;
            
            if (tab.id === this.activeTab) {
                tabElement.classList.add('active');
            }
            
            tabElement.addEventListener('click', () => {
                this.setActiveTab(tab.id);
            });
            
            tabs.appendChild(tabElement);
        });
        
        header.appendChild(tabs);
        
        // Create the filter/sort controls
        const controls = document.createElement('div');
        controls.className = 'inventory-controls';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search items...';
        searchInput.className = 'inventory-search';
        searchInput.addEventListener('input', (e) => {
            this.filterText = e.target.value;
            this.refresh();
        });
        
        const sortSelect = document.createElement('select');
        sortSelect.className = 'inventory-sort';
        
        const sortOptions = [
            { value: 'default', label: 'Default' },
            { value: 'name', label: 'Name' },
            { value: 'rarity', label: 'Rarity' },
            { value: 'value', label: 'Value' },
            { value: 'weight', label: 'Weight' }
        ];
        
        sortOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.label;
            sortSelect.appendChild(optElement);
        });
        
        sortSelect.addEventListener('change', (e) => {
            this.sortMethod = e.target.value;
            this.refresh();
        });
        
        controls.appendChild(searchInput);
        controls.appendChild(sortSelect);
        
        header.appendChild(controls);
        
        // Create the inventory slots container
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'inventory-slots';
        
        // Create the stats panel
        const statsPanel = document.createElement('div');
        statsPanel.className = 'inventory-stats';
        
        const weightInfo = document.createElement('div');
        weightInfo.className = 'weight-info';
        weightInfo.innerHTML = 'Weight: 0 / 0';
        
        const valueInfo = document.createElement('div');
        valueInfo.className = 'value-info';
        valueInfo.innerHTML = 'Total Value: 0';
        
        statsPanel.appendChild(weightInfo);
        statsPanel.appendChild(valueInfo);
        
        // Create the action buttons
        const actions = document.createElement('div');
        actions.className = 'inventory-actions';
        
        const useButton = document.createElement('button');
        useButton.textContent = 'Use';
        useButton.disabled = true;
        useButton.addEventListener('click', () => {
            if (this.selectedItem) {
                this._useItem(this.selectedItem);
            }
        });
        
        const equipButton = document.createElement('button');
        equipButton.textContent = 'Equip';
        equipButton.disabled = true;
        equipButton.addEventListener('click', () => {
            if (this.selectedItem) {
                this._equipItem(this.selectedItem);
            }
        });
        
        const dropButton = document.createElement('button');
        dropButton.textContent = 'Drop';
        dropButton.disabled = true;
        dropButton.addEventListener('click', () => {
            if (this.selectedItem) {
                this._dropItem(this.selectedItem);
            }
        });
        
        actions.appendChild(useButton);
        actions.appendChild(equipButton);
        actions.appendChild(dropButton);
        
        // Store references
        this.elements = {
            slotsContainer,
            weightInfo,
            valueInfo,
            useButton,
            equipButton,
            dropButton
        };
        
        // Assemble the UI
        this.container.appendChild(header);
        this.container.appendChild(slotsContainer);
        this.container.appendChild(statsPanel);
        this.container.appendChild(actions);
    }
    
    /**
     * Connect to inventory events
     * @private
     */
    _connectInventoryEvents() {
        this.inventory.addEventListener('item_added', () => this.refresh());
        this.inventory.addEventListener('item_removed', () => this.refresh());
        this.inventory.addEventListener('item_moved', () => this.refresh());
        this.inventory.addEventListener('slot_updated', () => this.refresh());
        this.inventory.addEventListener('cleared', () => this.refresh());
    }
    
    /**
     * Set up drag and drop event listeners
     * @private
     */
    _setupEventListeners() {
        document.addEventListener('mousemove', this._handleMouseMove.bind(this));
        document.addEventListener('mouseup', this._handleMouseUp.bind(this));
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - The mouse event
     * @private
     */
    _handleMouseMove(e) {
        if (this.isDragging && this.draggedElement) {
            this.draggedElement.style.left = (e.clientX - this.dragOffset.x) + 'px';
            this.draggedElement.style.top = (e.clientY - this.dragOffset.y) + 'px';
        }
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e - The mouse event
     * @private
     */
    _handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            
            if (this.draggedElement) {
                document.body.removeChild(this.draggedElement);
                this.draggedElement = null;
                
                // Find the slot under the cursor
                const elements = document.elementsFromPoint(e.clientX, e.clientY);
                
                for (const element of elements) {
                    if (element.classList.contains('inventory-slot') && element.dataset.slotId) {
                        const targetSlotId = element.dataset.slotId;
                        
                        if (this.draggedItem && this.draggedItem.slotId !== targetSlotId) {
                            this._moveItem(this.draggedItem.slotId, targetSlotId);
                        }
                        
                        break;
                    }
                }
            }
            
            this.draggedItem = null;
        }
    }
    
    /**
     * Show item tooltip
     * @param {Object} item - The item to show tooltip for
     * @param {HTMLElement} element - The element to position tooltip near
     * @private
     */
    _showTooltip(item, element) {
        if (!item || !element) return;
        
        const rect = element.getBoundingClientRect();
        
        let tooltipHTML = '';
        
        // Apply rarity color
        const rarityColors = {
            'JUNK': '#9d9d9d',
            'COMMON': '#ffffff',
            'UNCOMMON': '#1eff00',
            'RARE': '#0070dd',
            'EPIC': '#a335ee',
            'LEGENDARY': '#ff8000'
        };
        
        const color = item.tooltipColor || rarityColors[item.rarity] || rarityColors.COMMON;
        
        // If there's a custom tooltip function, use it
        if (typeof this.customTooltipRenderer === 'function') {
            tooltipHTML = this.customTooltipRenderer(item);
        } else {
            // Default tooltip
            tooltipHTML = `<div style="color:${color};font-weight:bold;">${item.name}</div>`;
            tooltipHTML += `<div style="font-style:italic;">${item.rarity}</div>`;
            
            if (item.description) {
                tooltipHTML += `<div>${item.description}</div>`;
            }
            
            if (item.isEquippable) {
                tooltipHTML += `<div>Equip: ${item.equipSlot}</div>`;
                
                if (Object.keys(item.stats || {}).length > 0) {
                    tooltipHTML += `<div>Stats:</div>`;
                    Object.entries(item.stats).forEach(([stat, value]) => {
                        tooltipHTML += `<div>${stat}: ${value > 0 ? '+' : ''}${value}</div>`;
                    });
                }
                
                if (item.requiredLevel > 0) {
                    tooltipHTML += `<div>Requires Level: ${item.requiredLevel}</div>`;
                }
            }
            
            if (item.value > 0 || item.weight > 0) {
                tooltipHTML += `<hr style="opacity:0.5;margin:5px 0;">`;
                
                if (item.value > 0) {
                    tooltipHTML += `<div>Value: ${item.value} gold</div>`;
                }
                
                if (item.weight > 0) {
                    tooltipHTML += `<div>Weight: ${item.weight} lbs</div>`;
                }
            }
        }
        
        this.itemTooltip.innerHTML = tooltipHTML;
        this.itemTooltip.style.display = 'block';
        
        // Position the tooltip
        this.itemTooltip.style.left = (rect.right + 10) + 'px';
        this.itemTooltip.style.top = rect.top + 'px';
        
        // Make sure tooltip stays in viewport
        const tooltipRect = this.itemTooltip.getBoundingClientRect();
        
        if (tooltipRect.right > window.innerWidth) {
            this.itemTooltip.style.left = (rect.left - tooltipRect.width - 10) + 'px';
        }
        
        if (tooltipRect.bottom > window.innerHeight) {
            this.itemTooltip.style.top = (window.innerHeight - tooltipRect.height - 10) + 'px';
        }
    }
    
    /**
     * Hide the item tooltip
     * @private
     */
    _hideTooltip() {
        this.itemTooltip.style.display = 'none';
    }
    
    /**
     * Start dragging an item
     * @param {Object} item - The item being dragged
     * @param {HTMLElement} element - The element being dragged
     * @param {MouseEvent} e - The mouse event
     * @private
     */
    _startDrag(item, element, e) {
        if (!item) return;
        
        this.isDragging = true;
        this.draggedItem = item;
        
        // Create a drag image
        const dragImage = document.createElement('div');
        dragImage.className = 'item-drag-image';
        dragImage.style.position = 'absolute';
        dragImage.style.zIndex = '1001';
        dragImage.style.width = element.offsetWidth + 'px';
        dragImage.style.height = element.offsetHeight + 'px';
        dragImage.style.background = `url(${item.icon}) no-repeat center/contain`;
        dragImage.style.opacity = '0.8';
        dragImage.style.pointerEvents = 'none';
        
        document.body.appendChild(dragImage);
        
        this.draggedElement = dragImage;
        
        // Calculate drag offset
        const rect = element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Set initial position
        dragImage.style.left = (e.clientX - this.dragOffset.x) + 'px';
        dragImage.style.top = (e.clientY - this.dragOffset.y) + 'px';
        
        // Hide tooltip while dragging
        this._hideTooltip();
    }
    
    /**
     * Move an item between slots
     * @param {string|number} fromSlotId - The source slot ID
     * @param {string|number} toSlotId - The target slot ID
     * @private
     */
    _moveItem(fromSlotId, toSlotId) {
        if (!this.inventory) return;
        
        this.inventory.moveItem(fromSlotId, toSlotId);
    }
    
    /**
     * Use an item
     * @param {Object} item - The item to use
     * @private
     */
    _useItem(item) {
        if (!this.inventory) return;
        
        this.inventory.useItem(item.slotId);
        this.dispatchEvent({
            type: 'item_used',
            item
        });
    }
    
    /**
     * Equip an item
     * @param {Object} item - The item to equip
     * @private
     */
    _equipItem(item) {
        if (!this.inventory || !this.inventory.owner) return;
        
        const character = this.inventory.owner;
        
        if (character.equipment) {
            character.equipment.equipItem(item.item, item.slotId);
            
            this.dispatchEvent({
                type: 'item_equipped',
                item
            });
        }
    }
    
    /**
     * Drop an item
     * @param {Object} item - The item to drop
     * @private
     */
    _dropItem(item) {
        if (!this.inventory) return;
        
        if (confirm(`Are you sure you want to drop ${item.item.name}?`)) {
            this.inventory.removeItem(item.slotId);
            
            this.dispatchEvent({
                type: 'item_dropped',
                item
            });
        }
    }
    
    /**
     * Refresh the inventory display
     */
    refresh() {
        if (!this.inventory) return;
        
        const slots = this.inventory.getSlots();
        
        // Clear the slots container
        this.elements.slotsContainer.innerHTML = '';
        
        // Filter items based on active tab and search text
        const filteredSlots = this._filterSlots(slots);
        
        // Sort items based on sort method
        const sortedSlots = this._sortSlots(filteredSlots);
        
        // Create slot elements
        sortedSlots.forEach(slot => {
            const slotElement = this._createSlotElement(slot);
            this.elements.slotsContainer.appendChild(slotElement);
        });
        
        // Update stats
        this._updateStats();
        
        // Reset selected item
        this.selectedItem = null;
        this._updateActionButtons();
    }
    
    /**
     * Filter slots based on active tab and search text
     * @param {Array} slots - The slots to filter
     * @returns {Array} Filtered slots
     * @private
     */
    _filterSlots(slots) {
        return slots.filter(slot => {
            const item = slot.getItem();
            
            // Always show empty slots
            if (!item) return true;
            
            // Filter by tab
            if (this.activeTab !== 'all') {
                if (this.activeTab === 'weapons' && item.type !== 'WEAPON') return false;
                if (this.activeTab === 'armor' && item.type !== 'ARMOR') return false;
                if (this.activeTab === 'accessories' && item.type !== 'ACCESSORY') return false;
                if (this.activeTab === 'consumables' && item.type !== 'CONSUMABLE') return false;
                if (this.activeTab === 'materials' && item.type !== 'MATERIAL') return false;
            }
            
            // Filter by search text
            if (this.filterText) {
                const searchText = this.filterText.toLowerCase();
                return item.name.toLowerCase().includes(searchText) || 
                       (item.description && item.description.toLowerCase().includes(searchText));
            }
            
            return true;
        });
    }
    
    /**
     * Sort slots based on sort method
     * @param {Array} slots - The slots to sort
     * @returns {Array} Sorted slots
     * @private
     */
    _sortSlots(slots) {
        return [...slots].sort((a, b) => {
            const itemA = a.getItem();
            const itemB = b.getItem();
            
            // Empty slots go to the end
            if (!itemA && !itemB) return 0;
            if (!itemA) return 1;
            if (!itemB) return -1;
            
            switch (this.sortMethod) {
                case 'name':
                    return itemA.name.localeCompare(itemB.name);
                case 'rarity':
                    const rarityOrder = {
                        'JUNK': 0,
                        'COMMON': 1,
                        'UNCOMMON': 2,
                        'RARE': 3,
                        'EPIC': 4,
                        'LEGENDARY': 5
                    };
                    return rarityOrder[itemB.rarity] - rarityOrder[itemA.rarity];
                case 'value':
                    return (itemB.value || 0) - (itemA.value || 0);
                case 'weight':
                    return (itemB.weight || 0) - (itemA.weight || 0);
                default:
                    return a.id - b.id;
            }
        });
    }
    
    /**
     * Create a slot element
     * @param {Object} slot - The slot to create element for
     * @returns {HTMLElement} The created slot element
     * @private
     */
    _createSlotElement(slot) {
        const item = slot.getItem();
        
        const slotElement = document.createElement('div');
        slotElement.className = 'inventory-slot';
        slotElement.dataset.slotId = slot.id;
        
        if (item) {
            // Add item content
            const rarityBorder = document.createElement('div');
            rarityBorder.className = `rarity-border ${item.rarity.toLowerCase()}`;
            
            const itemImg = document.createElement('img');
            itemImg.src = item.icon;
            itemImg.alt = item.name;
            
            slotElement.appendChild(rarityBorder);
            slotElement.appendChild(itemImg);
            
            // Add quantity if stackable
            if (item.isStackable && item.quantity > 1) {
                const quantity = document.createElement('div');
                quantity.className = 'item-quantity';
                quantity.textContent = item.quantity;
                slotElement.appendChild(quantity);
            }
            
            // Add equipped indicator if item is equipped
            if (item.isEquipped) {
                const equipped = document.createElement('div');
                equipped.className = 'item-equipped';
                equipped.textContent = 'E';
                slotElement.appendChild(equipped);
            }
            
            // Add tooltip event listeners
            slotElement.addEventListener('mouseenter', () => {
                this._showTooltip(item, slotElement);
            });
            
            slotElement.addEventListener('mouseleave', () => {
                this._hideTooltip();
            });
            
            // Add click event listener
            slotElement.addEventListener('click', () => {
                this._selectItem({ item, slotId: slot.id });
            });
            
            // Add drag start event listener
            slotElement.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left click only
                    this._startDrag({ item, slotId: slot.id }, slotElement, e);
                }
            });
        }
        
        return slotElement;
    }
    
    /**
     * Update the inventory stats display
     * @private
     */
    _updateStats() {
        if (!this.inventory) return;
        
        const currentWeight = this.inventory.getCurrentWeight();
        const maxWeight = this.inventory.getMaxWeight();
        const totalValue = this.inventory.getTotalValue();
        
        this.elements.weightInfo.innerHTML = `Weight: ${currentWeight.toFixed(1)} / ${maxWeight}`;
        this.elements.valueInfo.innerHTML = `Total Value: ${totalValue} gold`;
    }
    
    /**
     * Select an item
     * @param {Object} itemData - The item data
     * @private
     */
    _selectItem(itemData) {
        // Deselect previous
        const selected = this.elements.slotsContainer.querySelector('.selected');
        if (selected) {
            selected.classList.remove('selected');
        }
        
        // Select new
        const slotElement = this.elements.slotsContainer.querySelector(`[data-slot-id="${itemData.slotId}"]`);
        if (slotElement) {
            slotElement.classList.add('selected');
        }
        
        this.selectedItem = itemData;
        this._updateActionButtons();
        
        this.dispatchEvent({
            type: 'item_selected',
            item: itemData.item,
            slotId: itemData.slotId
        });
    }
    
    /**
     * Update action buttons based on selected item
     * @private
     */
    _updateActionButtons() {
        const item = this.selectedItem ? this.selectedItem.item : null;
        
        if (item) {
            this.elements.useButton.disabled = !item.isConsumable;
            this.elements.equipButton.disabled = !item.isEquippable || item.isEquipped;
            this.elements.dropButton.disabled = false;
        } else {
            this.elements.useButton.disabled = true;
            this.elements.equipButton.disabled = true;
            this.elements.dropButton.disabled = true;
        }
    }
    
    /**
     * Set the active tab
     * @param {string} tabId - The tab ID
     */
    setActiveTab(tabId) {
        this.activeTab = tabId;
        
        // Update tab UI
        const tabs = this.container.querySelectorAll('.inventory-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        this.refresh();
    }
    
    /**
     * Open the inventory
     */
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.container.style.display = 'block';
        this.refresh();
        
        this.dispatchEvent({ type: 'opened' });
    }
    
    /**
     * Close the inventory
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.container.style.display = 'none';
        this._hideTooltip();
        
        this.dispatchEvent({ type: 'closed' });
    }
    
    /**
     * Toggle the inventory open/closed
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Set the inventory to display
     * @param {Object} inventory - The inventory to display
     */
    setInventory(inventory) {
        // Disconnect from old inventory if exists
        if (this.inventory) {
            // TODO: Remove event listeners
        }
        
        this.inventory = inventory;
        
        if (inventory) {
            this._connectInventoryEvents();
            this.refresh();
        }
    }
    
    /**
     * Set a custom tooltip renderer
     * @param {Function} renderer - The tooltip renderer function
     */
    setTooltipRenderer(renderer) {
        if (typeof renderer === 'function') {
            this.customTooltipRenderer = renderer;
        }
    }
    
    /**
     * Clean up the UI manager
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('mousemove', this._handleMouseMove);
        document.removeEventListener('mouseup', this._handleMouseUp);
        
        // Remove tooltip
        if (this.itemTooltip && this.itemTooltip.parentNode) {
            this.itemTooltip.parentNode.removeChild(this.itemTooltip);
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Remove references
        this.inventory = null;
        this.elements = null;
    }
} 