# Architecture Documentation

## Overview

This document describes the architecture, data flow, and technical decisions for the Collaborative Drawing Canvas application.

## System Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │◄─────────────────────────►│             │
└─────────────┘                            │   Server    │
                                           │  (Node.js)  │
┌─────────────┐         WebSocket          │             │
│   Client 2  │◄─────────────────────────►│             │
└─────────────┘                            └─────────────┘
                                           │             │
┌─────────────┐         WebSocket          │             │
│   Client N  │◄─────────────────────────►│             │
└─────────────┘                            └─────────────┘
```

## Data Flow Diagram

### Drawing Event Flow

```
User Action (Mouse/Touch)
    │
    ▼
Canvas Manager (canvas.js)
    │
    ├─► Local Canvas Rendering
    │
    └─► WebSocket Manager (websocket.js)
            │
            ▼
        Socket.io Client
            │
            ▼
        Socket.io Server (server.js)
            │
            ├─► Drawing State Manager (drawing-state.js)
            │       │
            │       └─► Store in History
            │
            └─► Broadcast to Other Clients
                    │
                    ▼
                All Connected Clients
                    │
                    ▼
                Canvas Manager (Remote Rendering)
```

## Component Breakdown

### Frontend Components

#### 1. CanvasManager (`client/canvas.js`)
**Responsibilities:**
- Handle all canvas drawing operations
- Manage local stroke history
- Render strokes (local and remote)
- Handle mouse/touch events
- Canvas resizing and optimization

**Key Methods:**
- `startDrawing()`: Begin a new stroke
- `draw()`: Add points to current stroke
- `stopDrawing()`: Finalize current stroke
- `addRemoteStroke()`: Handle incoming remote strokes
- `redrawCanvas()`: Full canvas redraw

**Optimizations:**
- Incremental drawing (only draw new points)
- Efficient path rendering using lineTo
- Separate handling for local vs remote strokes

#### 2. WebSocketManager (`client/websocket.js`)
**Responsibilities:**
- Manage WebSocket connection
- Send drawing events to server
- Receive and route server events
- Manage user list updates

**Key Events:**
- `draw-start`, `draw-move`, `draw-end`: Drawing synchronization
- `cursor-move`: Remote cursor tracking
- `users-updated`: User list management
- `undo`, `redo`: Global operation sync

#### 3. CursorManager (`client/main.js`)
**Responsibilities:**
- Display remote user cursors
- Update cursor positions
- Show user names and colors

#### 4. Main Application (`client/main.js`)
**Responsibilities:**
- Initialize all managers
- Setup UI event listeners
- Coordinate between components

### Backend Components

#### 1. Server (`server/server.js`)
**Responsibilities:**
- Express HTTP server
- Socket.io WebSocket server
- Route management
- Client connection handling

**Key Features:**
- Serves static files
- Manages Socket.io connections
- Routes events to appropriate handlers

#### 2. RoomManager (`server/rooms.js`)
**Responsibilities:**
- Manage user rooms
- Track active users
- Assign user colors
- Handle user join/leave

**Data Structure:**
```javascript
Map<roomId, Map<userId, user>>
```

#### 3. DrawingState (`server/drawing-state.js`)
**Responsibilities:**
- Maintain canvas state
- Manage stroke history
- Handle undo/redo operations
- Provide state snapshots

**Data Structure:**
```javascript
{
  strokes: Map<strokeId, stroke>,
  history: Array<strokeId>,
  undoStack: Array<strokeId>
}
```

## WebSocket Protocol

### Client → Server Messages

#### `draw-start`
```javascript
{
  strokeId: string,
  point: { x: number, y: number },
  tool: 'brush' | 'eraser',
  color: string,
  lineWidth: number
}
```

#### `draw-move`
```javascript
{
  strokeId: string,
  point: { x: number, y: number }
}
```

#### `draw-end`
```javascript
{
  strokeId: string
}
```

#### `cursor-move`
```javascript
{
  position: { x: number, y: number }
}
```

#### `undo`
```javascript
// No payload
```

#### `redo`
```javascript
// No payload
```

#### `clear-canvas`
```javascript
// No payload
```

### Server → Client Messages

#### `canvas-state`
Sent on initial connection with full canvas state:
```javascript
{
  history: Array<stroke>,
  currentState: object
}
```

#### `draw-start`
Broadcast to other clients:
```javascript
{
  id: string,
  userId: string,
  userColor: string,
  tool: string,
  color: string,
  lineWidth: number,
  points: Array<point>,
  user: { id, name, color }
}
```

#### `draw-move`
Broadcast to other clients:
```javascript
{
  strokeId: string,
  point: { x: number, y: number }
}
```

#### `draw-end`
Broadcast to other clients:
```javascript
{
  strokeId: string
}
```

#### `cursor-move`
Broadcast to other clients:
```javascript
{
  userId: string,
  user: { id, name, color },
  position: { x: number, y: number }
}
```

#### `users-updated`
```javascript
Array<{ id: string, name: string, color: string }>
```

#### `undo` / `redo`
```javascript
{
  strokeId: string
}
```

## Undo/Redo Strategy

### Global Operation History

The undo/redo system maintains a **global history** across all users:

1. **History Stack**: All strokes are stored in chronological order
2. **Undo Stack**: Strokes that have been undone (for redo)
3. **Operation Flow**:
   - When User A undoes: Server removes stroke from history, adds to undo stack
   - Broadcasts undo event to all clients
   - All clients remove the stroke from their canvas
   - If User B had undone it first, the operation is idempotent

### Conflict Resolution

**Scenario**: User A draws stroke X, User B draws stroke Y, User A undoes stroke X

**Solution**:
- Each stroke has a unique ID
- Undo operations reference stroke IDs
- Clients check if stroke exists before removing
- Server maintains authoritative state

**Limitations**:
- If two users undo simultaneously, both operations are processed
- No conflict detection for simultaneous undos of different strokes
- Redo operations are global (any user can redo any undone stroke)

### Implementation Details

```javascript
// Server-side
undo() {
  if (history.length === 0) return null;
  const strokeId = history.pop();
  undoStack.push(strokeId);
  return stroke; // Broadcast to all clients
}

// Client-side
socket.on('undo', (data) => {
  canvasManager.removeStroke(data.strokeId);
  // Redraw canvas without that stroke
});
```

## Performance Decisions

### 1. Incremental Drawing
**Decision**: Draw points incrementally rather than redrawing entire stroke
**Rationale**: 
- Reduces CPU usage
- Smoother real-time experience
- Lower latency for remote users

### 2. Event Batching
**Decision**: Send individual `draw-move` events (not batched)
**Rationale**:
- Lower latency (users see drawing immediately)
- Simpler implementation
- Acceptable for moderate user counts (< 20 users)

**Alternative Considered**: Batch events every 50ms
- Would reduce network traffic
- But increases perceived latency

### 3. Canvas Redraw Strategy
**Decision**: Full redraw only on undo/redo, incremental for new strokes
**Rationale**:
- Full redraw is expensive but necessary for state consistency
- Incremental drawing is fast for new strokes
- Balance between performance and correctness

### 4. Cursor Update Frequency
**Decision**: Update cursor position every 50ms
**Rationale**:
- Reduces WebSocket message frequency
- Still feels responsive
- Prevents network congestion

### 5. Stroke Storage
**Decision**: Store strokes in memory (Map structure)
**Rationale**:
- Fast access (O(1) lookup)
- Simple implementation
- No persistence needed for MVP

## Conflict Resolution

### Simultaneous Drawing
**Scenario**: Two users draw in overlapping areas at the same time

**Solution**:
- Each stroke is independent
- Strokes are rendered in order received
- Canvas composite operations handle overlap naturally
- No explicit conflict resolution needed

### Network Latency
**Scenario**: User A's drawing arrives after User B's, but was drawn earlier

**Solution**:
- Each stroke has a timestamp
- Strokes are rendered in order of receipt (not timestamp)
- Acceptable trade-off for real-time feel
- Alternative: Client-side prediction with server reconciliation

### Undo Conflicts
**Scenario**: User A undoes while User B is still drawing

**Solution**:
- Undo removes stroke by ID
- If stroke is still being drawn, it's finalized first
- Drawing state manager ensures stroke exists before removal

## Scalability Considerations

### Current Limitations
- Single server instance
- In-memory state (lost on restart)
- No horizontal scaling
- Limited to ~50 concurrent users per server

### Potential Improvements

1. **Database Persistence**
   - Store strokes in database (MongoDB, PostgreSQL)
   - Enable canvas persistence across sessions
   - Support for larger canvases

2. **Horizontal Scaling**
   - Use Redis for shared state
   - Socket.io with Redis adapter
   - Load balancing across servers

3. **Optimization**
   - Implement event batching for high-frequency events
   - Use binary protocol (MessagePack) instead of JSON
   - Implement client-side prediction
   - Canvas virtualization for very large canvases

4. **Room System**
   - Multiple isolated canvases
   - Room-based routing
   - Room capacity limits

## Security Considerations

### Current Implementation
- No authentication (users identified by socket ID)
- No input validation (trusts client coordinates)
- No rate limiting
- CORS enabled for all origins

### Recommended Improvements
- Input validation (coordinate bounds checking)
- Rate limiting per user
- Authentication system
- Room-based access control
- Sanitize user names

## Error Handling

### Client-Side
- Connection retry logic
- Graceful degradation if WebSocket fails
- Error messages for user feedback
- Canvas state recovery on reconnect

### Server-Side
- Try-catch blocks around event handlers
- Validation of incoming messages
- Graceful handling of malformed data
- Logging for debugging

## Testing Strategy

### Manual Testing
- Multiple browser windows
- Different network conditions
- Rapid drawing to test performance
- Simultaneous operations (undo while drawing)

### Automated Testing (Future)
- Unit tests for drawing logic
- Integration tests for WebSocket events
- Load testing with multiple simulated users
- Canvas rendering tests

## Future Enhancements

1. **Advanced Tools**
   - Shapes (rectangle, circle, line)
   - Text tool
   - Image paste
   - Layers

2. **Collaboration Features**
   - User permissions
   - Drawing permissions
   - Chat system
   - Drawing history playback

3. **Performance**
   - WebGL rendering for better performance
   - Offscreen canvas for complex operations
   - Service worker for offline support

4. **User Experience**
   - Drawing templates
   - Export/import functionality
   - Drawing sessions
   - Collaborative cursors with names


