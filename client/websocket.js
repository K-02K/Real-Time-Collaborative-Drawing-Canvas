class WebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentUser = null;
        this.users = new Map();
    }

    connect() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            // Store socket ID for later use
            this.socketId = this.socket.id;
            // Trigger username update after connection
            if (window.updateUsernameInput) {
                setTimeout(() => window.updateUsernameInput(), 100);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
        });

        // Receive canvas state on connection
        this.socket.on('canvas-state', (data) => {
            if (window.canvasManager && data.history) {
                window.canvasManager.loadCanvasState(data.history);
            }
        });

        // Receive drawing events
        this.socket.on('draw-start', (data) => {
            if (window.canvasManager && data.id) {
                window.canvasManager.addRemoteStroke({
                    id: data.id,
                    tool: data.tool,
                    userColor: data.userColor || data.color,
                    lineWidth: data.lineWidth,
                    points: data.points || []
                });
            }
        });

        this.socket.on('draw-move', (data) => {
            if (window.canvasManager && data.strokeId && data.point) {
                window.canvasManager.addRemotePoint(data.strokeId, data.point);
            }
        });

        this.socket.on('draw-end', (data) => {
            if (window.canvasManager && data.strokeId) {
                window.canvasManager.finalizeRemoteStroke(data.strokeId);
            }
        });

        // Receive cursor movements
        this.socket.on('cursor-move', (data) => {
            if (window.cursorManager && data.userId && data.position) {
                window.cursorManager.updateRemoteCursor(data.userId, data.user, data.position);
            }
        });

        // Receive initial user info on connection
        this.socket.on('user-connected', (data) => {
            if (data.user && data.users) {
                this.currentUser = data.user;
                this.updateUsersList(data.users);
                // Trigger custom event for username input update
                if (window.updateUsernameInput) {
                    setTimeout(() => window.updateUsernameInput(), 50);
                }
            }
        });

        // Receive notification when a user joins
        this.socket.on('user-joined', (data) => {
            if (data.user) {
                // User list will be updated via users-updated event
                console.log('User joined:', data.user.name);
            }
        });

        // Receive user updates
        this.socket.on('users-updated', (users) => {
            if (users && Array.isArray(users)) {
                this.updateUsersList(users);
                // Trigger custom event for username input update
                if (window.updateUsernameInput) {
                    setTimeout(() => window.updateUsernameInput(), 50);
                }
            }
        });

        this.socket.on('user-disconnected', (data) => {
            if (data.userId && window.cursorManager) {
                window.cursorManager.removeCursor(data.userId);
            }
            // Update user list if provided
            if (data.users && Array.isArray(data.users)) {
                this.updateUsersList(data.users);
            }
        });

        // Receive undo/redo events
        this.socket.on('undo', (data) => {
            if (window.canvasManager && data.strokeId) {
                window.canvasManager.removeStroke(data.strokeId);
            }
        });

        this.socket.on('redo', (data) => {
            if (window.canvasManager && data.strokeId) {
                window.canvasManager.addStrokeToHistory(data.strokeId);
            }
        });

        // Receive clear canvas
        this.socket.on('clear-canvas', () => {
            if (window.canvasManager) {
                window.canvasManager.clearCanvas();
            }
        });
    }

    sendDrawStart(data) {
        if (this.connected && this.socket) {
            this.socket.emit('draw-start', data);
        }
    }

    sendDrawMove(data) {
        if (this.connected && this.socket) {
            this.socket.emit('draw-move', data);
        }
    }

    sendDrawEnd(data) {
        if (this.connected && this.socket) {
            this.socket.emit('draw-end', data);
        }
    }

    sendCursorMove(position) {
        if (this.connected && this.socket) {
            this.socket.emit('cursor-move', { position });
        }
    }

    sendUndo() {
        if (this.connected && this.socket) {
            this.socket.emit('undo');
        }
    }

    sendRedo() {
        if (this.connected && this.socket) {
            this.socket.emit('redo');
        }
    }

    sendClearCanvas() {
        if (this.connected && this.socket) {
            this.socket.emit('clear-canvas');
        }
    }

    sendNameChange(newName) {
        if (this.connected && this.socket) {
            this.socket.emit('change-name', { name: newName });
        }
    }

    updateUsersList(users) {
        if (!users || !Array.isArray(users)) {
            return;
        }

        // Clear and update user map
        this.users.clear();
        users.forEach(user => {
            if (user && user.id) {
                this.users.set(user.id, user);
            }
        });

        // Update UI
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            
            // Sort users by name for consistent display
            const sortedUsers = [...users].sort((a, b) => {
                if (a.id === this.socketId) return -1; // Current user first
                if (b.id === this.socketId) return 1;
                return a.name.localeCompare(b.name);
            });

            sortedUsers.forEach(user => {
                if (user && user.id) {
                    const badge = document.createElement('div');
                    badge.className = 'user-badge';
                    // Highlight current user
                    if (user.id === this.socketId) {
                        badge.style.borderColor = user.color;
                        badge.style.borderWidth = '2px';
                    }
                    badge.innerHTML = `
                        <span class="user-color-indicator" style="background-color: ${user.color || '#808080'};"></span>
                        <span class="user-name">${user.name || 'Unknown'}</span>
                    `;
                    usersList.appendChild(badge);
                }
            });
        }
    }
}

