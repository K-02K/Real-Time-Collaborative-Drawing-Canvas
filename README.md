# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

The application will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## 🧪 Testing with Multiple Users

To test the collaborative features:

1. **Start the server**: `npm start`
2. **Open multiple browser windows/tabs** to `http://localhost:3000`
3. **Start drawing**: You should see other users' drawings in real-time
4. **Test features**:
   - Draw simultaneously with other users
   - Use different tools (brush, eraser)
   - Change colors and brush sizes
   - Test global undo/redo (affects all users)
   - Watch cursor positions of other users
   - Change your username and see it update for all users

### Testing Scenarios

- **Basic Drawing**: Multiple users drawing at the same time
- **Conflict Resolution**: Two users drawing in overlapping areas
- **Global Undo/Redo**: User A draws, User B undoes (removes last stroke globally), User A can redo
- **Network Latency**: Test with network throttling in browser DevTools
- **User Management**: See user list update when users join/leave, change names
- **Real-time Sync**: Draw quickly and see strokes appear in real-time on other clients

### Testing Tips

- Use different browsers (Chrome, Firefox, Safari) for better isolation
- Open developer console to see connection status and any errors
- Try drawing simultaneously with multiple users to test conflict resolution
- Test network latency by drawing quickly and see how it syncs

## 📁 Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Styling (dark theme with white canvas)
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client management
│   └── main.js             # Application initialization
├── server/
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # Room management
│   └── drawing-state.js    # Canvas state management
├── package.json
├── README.md
└── ARCHITECTURE.md         # Technical architecture documentation
```

## 🎯 Features

### ✅ Implemented

- **Drawing Tools**: Brush and eraser with customizable colors and stroke width (1-50px)
- **Real-time Sync**: See other users' drawings as they draw (not after they finish)
- **User Indicators**: Show where other users are currently drawing (cursor positions with names)
- **Conflict Resolution**: Handle when multiple users draw in overlapping areas (canvas composite operations)
- **Global Undo/Redo**: Works across all users (synchronized undo/redo operations)
- **User Management**: Show who's online, assign colors to users, change usernames
- **Full-Page Canvas**: Drawing area fills the entire viewport
- **Dark Theme UI**: Modern dark interface with white canvas and light-colored toolbar
- **Mobile Touch Support**: Works on touch devices
- **Username Customization**: Change your name and see it update in real-time for all users

### Known Limitations

- **Persistence**: Drawings are not saved to disk (lost on server restart)
- **Single Room**: Currently supports one default room (multi-room feature can be added)
- **No Authentication**: Users are identified by socket ID only
- **Performance**: May experience lag with 10+ simultaneous users drawing heavily
- **Network Dependency**: Requires stable network connection for smooth sync

## 🔧 Technical Details

### Stack
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Backend**: Node.js, Express
- **Real-time**: Socket.io (WebSocket)
- **No Frameworks**: Pure vanilla implementation (no React/Vue/Angular)
- **No Drawing Libraries**: Raw Canvas API implementation

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

### Key Technical Decisions

1. **Socket.io over native WebSockets**: Easier error handling, automatic reconnection, built-in room management
2. **Vanilla JavaScript**: No framework dependencies, demonstrates raw DOM/Canvas skills
3. **Incremental Drawing**: Draw points incrementally rather than redrawing entire strokes for better performance
4. **Event-driven Architecture**: Drawing events streamed in real-time for smooth collaboration
5. **Server-side State Management**: Centralized canvas state on server for consistency
6. **Operation-based Undo**: Each stroke is a single operation, making global undo/redo simpler

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v14+)

### Drawings not syncing
- Check browser console for errors
- Verify WebSocket connection (check connection status in console)
- Ensure all users are connected to the same server
- Check server logs for errors

### Canvas not displaying
- Clear browser cache
- Check that JavaScript is enabled
- Verify all files are loaded (check Network tab in DevTools)

### User list not updating
- Refresh the page
- Check WebSocket connection status
- Verify server is running and accessible

## ⏱️ Development Time

Approximately 10-12 hours of development time including:

- **Project Setup**: 30 minutes
- **Server Implementation**: 2 hours (Express + Socket.io setup, room management)
- **Client Canvas Logic**: 3 hours (drawing, tools, touch support)
- **WebSocket Integration**: 2 hours (real-time sync, event handling)
- **Undo/Redo System**: 2 hours (global state management)
- **User Management**: 1 hour (user list, colors, username changes)
- **UI/UX Polish**: 1.5 hours (dark theme, responsive design, full-page canvas)
- **Testing & Bug Fixes**: 1 hour
- **Documentation**: 1 hour

**Total: ~13-14 hours**

## 📊 Architecture Highlights

### Real-time Synchronization
- **draw-start**: Sent immediately when user starts drawing
- **draw-move**: Sent continuously as user draws (real-time, not batched)
- **draw-end**: Sent when user stops drawing
- **cursor-move**: Updates every 50ms to show other users' cursor positions

### State Management
- Server maintains authoritative canvas state
- All strokes stored with unique IDs
- Global undo/redo stack managed on server
- Client receives state snapshot on connection

### User Synchronization
- Users assigned unique colors on connection
- User list updates in real-time when users join/leave
- Username changes broadcast to all users
- Current user highlighted in user list

## 🎨 UI/UX Features

- **Dark Theme**: Entire application uses dark theme (#1a1a1a background)
- **White Canvas**: Drawing area is white (#ffffff) for contrast
- **Toolbar at Bottom**: Dark toolbar with light-colored text and controls
- **User Badges**: Color-coded user indicators in header
- **Responsive Design**: Works on desktop and mobile devices
- **Full-Page Canvas**: Drawing area fills available viewport space

## 📝 License

MIT License - feel free to use and modify as needed.

## 🤝 Future Enhancements

Potential features to add:

- **Multiple Rooms**: Support for isolated canvases per room
- **Drawing Persistence**: Save/load drawings to database
- **User Authentication**: Login system with user accounts
- **Advanced Tools**: Shapes (rectangle, circle), text tool, image paste
- **Drawing History**: Playback of drawing session
- **Export/Import**: Save drawings as images, load saved drawings
- **Performance Optimizations**: Better handling of 50+ concurrent users
- **Room System**: Create/join specific rooms with room IDs

## 📖 Documentation

For detailed technical documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md) which includes:
- Data flow diagrams
- WebSocket protocol specification
- Undo/Redo strategy
- Performance decisions
- Conflict resolution approach
