// Cursor Manager for remote user cursors
class CursorManager {
    constructor(overlayId) {
        this.overlay = document.getElementById(overlayId);
        this.cursors = new Map(); // userId -> cursor element
    }

    updateRemoteCursor(userId, user, position) {
        if (!this.overlay) return;

        let cursor = this.cursors.get(userId);
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'remote-cursor';
            cursor.style.borderColor = user.color || '#ffffff';
            cursor.style.color = user.color || '#ffffff';
            
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.top = '25px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            label.style.background = 'rgba(0, 0, 0, 0.7)';
            label.style.color = '#ffffff';
            label.style.padding = '2px 6px';
            label.style.borderRadius = '4px';
            label.style.fontSize = '10px';
            label.style.whiteSpace = 'nowrap';
            label.textContent = user.name || 'User';
            cursor.appendChild(label);
            
            this.overlay.appendChild(cursor);
            this.cursors.set(userId, cursor);
        }

        // Update position - convert canvas coordinates to overlay coordinates
        const canvas = document.getElementById('drawing-canvas');
        if (canvas) {
            const scaleX = canvas.offsetWidth / canvas.width;
            const scaleY = canvas.offsetHeight / canvas.height;
            
            const x = position.x * scaleX;
            const y = position.y * scaleY;
            
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }
    }

    removeCursor(userId) {
        const cursor = this.cursors.get(userId);
        if (cursor) {
            cursor.remove();
            this.cursors.delete(userId);
        }
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize canvas manager
    window.canvasManager = new CanvasManager('drawing-canvas');
    
    // Initialize WebSocket manager
    window.wsManager = new WebSocketManager();
    window.wsManager.connect();
    
    // Initialize cursor manager
    window.cursorManager = new CursorManager('cursors-overlay');

    // Setup tool buttons
    const brushTool = document.getElementById('brush-tool');
    const eraserTool = document.getElementById('eraser-tool');

    brushTool.addEventListener('click', () => {
        window.canvasManager.setTool('brush');
        brushTool.classList.add('active');
        eraserTool.classList.remove('active');
    });

    eraserTool.addEventListener('click', () => {
        window.canvasManager.setTool('eraser');
        eraserTool.classList.add('active');
        brushTool.classList.remove('active');
    });

    // Setup color picker
    const colorPicker = document.getElementById('color-picker');
    const colorPresets = document.querySelectorAll('.color-preset');

    colorPicker.addEventListener('change', (e) => {
        window.canvasManager.setColor(e.target.value);
        // Update active preset
        colorPresets.forEach(preset => {
            if (preset.dataset.color === e.target.value) {
                preset.classList.add('active');
            } else {
                preset.classList.remove('active');
            }
        });
    });

    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            window.canvasManager.setColor(color);
            colorPicker.value = color;
            colorPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
        });
    });

    // Set default color preset as active
    if (colorPresets.length > 0) {
        colorPresets[0].classList.add('active');
    }

    // Setup stroke width slider
    const strokeWidthSlider = document.getElementById('stroke-width');
    const strokeWidthValue = document.getElementById('stroke-width-value');

    strokeWidthSlider.addEventListener('input', (e) => {
        const width = parseInt(e.target.value);
        window.canvasManager.setLineWidth(width);
        strokeWidthValue.textContent = `${width}px`;
    });

    // Setup action buttons
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const clearBtn = document.getElementById('clear-btn');

    undoBtn.addEventListener('click', () => {
        window.wsManager.sendUndo();
    });

    redoBtn.addEventListener('click', () => {
        window.wsManager.sendRedo();
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
            window.wsManager.sendClearCanvas();
        }
    });

    // Track cursor movement for remote users
    const canvas = document.getElementById('drawing-canvas');
    let lastCursorUpdate = 0;
    const cursorUpdateInterval = 50; // Update every 50ms

    canvas.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastCursorUpdate > cursorUpdateInterval) {
            const point = window.canvasManager.getCanvasCoordinates(e);
            window.wsManager.sendCursorMove(point);
            lastCursorUpdate = now;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        // Could send a cursor-leave event here if needed
    });

    // Setup username change
    const usernameInput = document.getElementById('username-input');
    const changeNameBtn = document.getElementById('change-name-btn');

    // Function to update username input from user list
    function updateUsernameInput() {
        if (!window.wsManager || !window.wsManager.socketId || !usernameInput) return;
        
        const currentUserId = window.wsManager.socketId;
        const currentUser = Array.from(window.wsManager.users.values()).find(u => u.id === currentUserId);
        
        if (currentUser) {
            // Only update if the value is different to avoid cursor jumping
            if (usernameInput.value !== currentUser.name) {
                usernameInput.value = currentUser.name;
            }
        }
    }

    // Make function globally accessible for WebSocket manager
    window.updateUsernameInput = updateUsernameInput;

    // Update username input when user list is updated
    const originalUpdateUsersList = window.wsManager.updateUsersList.bind(window.wsManager);
    window.wsManager.updateUsersList = function(users) {
        originalUpdateUsersList(users);
        // Update username input immediately
        updateUsernameInput();
    };

    // Handle name change button click
    changeNameBtn.addEventListener('click', () => {
        const newName = usernameInput.value.trim();
        if (newName) {
            window.wsManager.sendNameChange(newName);
            // The server will confirm and update via users-updated event
        }
    });

    // Handle Enter key in username input
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const newName = usernameInput.value.trim();
            if (newName) {
                window.wsManager.sendNameChange(newName);
            }
        }
    });

    // Update username when socket connects and gets initial user list
    // The socket connection is already handled in websocket.js, 
    // so we just need to ensure update happens when users are received

    console.log('Collaborative Canvas initialized');
});

