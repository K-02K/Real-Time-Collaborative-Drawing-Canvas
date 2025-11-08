const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./rooms');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

const roomManager = new RoomManager();
const drawingStates = new Map(); // roomId -> DrawingState

// Generate random color for user
function generateUserColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  let currentRoom = 'default';
  let currentUser = {
    id: socket.id,
    name: `User-${socket.id.substring(0, 6)}`,
    color: generateUserColor()
  };

  // Initialize drawing state for room if it doesn't exist
  if (!drawingStates.has(currentRoom)) {
    drawingStates.set(currentRoom, new DrawingState());
  }

  const drawingState = drawingStates.get(currentRoom);

  // Join default room
  socket.join(currentRoom);
  roomManager.addUser(currentRoom, currentUser);

  // Send current canvas state to new user
  socket.emit('canvas-state', {
    history: drawingState.getHistory(),
    currentState: drawingState.getCurrentState()
  });

  // Send current user info to the new user
  socket.emit('user-connected', {
    user: currentUser,
    users: roomManager.getUsers(currentRoom)
  });

  // Notify all other users in the room about the new user
  socket.broadcast.to(currentRoom).emit('user-joined', {
    user: currentUser
  });

  // Send updated user list to all users in room (including the new user)
  io.to(currentRoom).emit('users-updated', roomManager.getUsers(currentRoom));

  // Handle drawing events
  socket.on('draw-start', (data) => {
    const strokeId = uuidv4();
    const stroke = {
      id: strokeId,
      userId: currentUser.id,
      userColor: currentUser.color,
      tool: data.tool,
      color: data.color,
      lineWidth: data.lineWidth,
      points: [data.point],
      timestamp: Date.now()
    };

    drawingState.addStroke(stroke);
    socket.broadcast.to(currentRoom).emit('draw-start', {
      ...stroke,
      user: currentUser
    });
  });

  socket.on('draw-move', (data) => {
    const stroke = drawingState.getStroke(data.strokeId);
    if (stroke && stroke.userId === currentUser.id) {
      stroke.points.push(data.point);
      socket.broadcast.to(currentRoom).emit('draw-move', {
        strokeId: data.strokeId,
        point: data.point
      });
    }
  });

  socket.on('draw-end', (data) => {
    const stroke = drawingState.getStroke(data.strokeId);
    if (stroke && stroke.userId === currentUser.id) {
      drawingState.finalizeStroke(data.strokeId);
      socket.broadcast.to(currentRoom).emit('draw-end', {
        strokeId: data.strokeId
      });
    }
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    socket.broadcast.to(currentRoom).emit('cursor-move', {
      userId: currentUser.id,
      user: currentUser,
      position: data.position
    });
  });

  // Handle undo
  socket.on('undo', () => {
    const undoneStroke = drawingState.undo();
    if (undoneStroke) {
      io.to(currentRoom).emit('undo', {
        strokeId: undoneStroke.id
      });
    }
  });

  // Handle redo
  socket.on('redo', () => {
    const redoneStroke = drawingState.redo();
    if (redoneStroke) {
      io.to(currentRoom).emit('redo', {
        strokeId: redoneStroke.id
      });
    }
  });

  // Handle clear canvas
  socket.on('clear-canvas', () => {
    drawingState.clear();
    io.to(currentRoom).emit('clear-canvas');
  });

  // Handle name change
  socket.on('change-name', (data) => {
    const newName = data.name;
    if (newName && typeof newName === 'string' && newName.trim().length > 0) {
      const trimmedName = newName.trim().substring(0, 20); // Limit to 20 characters
      if (roomManager.updateUserName(currentRoom, currentUser.id, trimmedName)) {
        // Update the local currentUser object
        currentUser.name = trimmedName;
        // Get fresh user list and broadcast to all
        const updatedUsers = roomManager.getUsers(currentRoom);
        io.to(currentRoom).emit('users-updated', updatedUsers);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    roomManager.removeUser(currentRoom, currentUser.id);
    // Notify remaining users
    const remainingUsers = roomManager.getUsers(currentRoom);
    io.to(currentRoom).emit('users-updated', remainingUsers);
    io.to(currentRoom).emit('user-disconnected', { 
      userId: currentUser.id,
      users: remainingUsers
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

