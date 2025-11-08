class DrawingState {
  constructor() {
    this.strokes = new Map(); // strokeId -> stroke
    this.history = []; // Array of strokeIds in order
    this.undoStack = []; // Stack of undone strokeIds
    this.currentState = null; // Current canvas state snapshot
  }

  addStroke(stroke) {
    this.strokes.set(stroke.id, stroke);
    this.history.push(stroke.id);
    this.undoStack = []; // Clear redo stack when new action is performed
  }

  getStroke(strokeId) {
    return this.strokes.get(strokeId);
  }

  getLastStroke(strokeId) {
    return this.strokes.get(strokeId);
  }

  finalizeStroke(strokeId) {
    const stroke = this.strokes.get(strokeId);
    if (stroke) {
      stroke.finalized = true;
    }
  }

  undo() {
    if (this.history.length === 0) {
      return null;
    }

    const strokeId = this.history.pop();
    const stroke = this.strokes.get(strokeId);
    this.undoStack.push(strokeId);
    return stroke;
  }

  redo() {
    if (this.undoStack.length === 0) {
      return null;
    }

    const strokeId = this.undoStack.pop();
    const stroke = this.strokes.get(strokeId);
    this.history.push(strokeId);
    return stroke;
  }

  clear() {
    this.strokes.clear();
    this.history = [];
    this.undoStack = [];
  }

  getHistory() {
    return this.history.map(id => this.strokes.get(id));
  }

  getCurrentState() {
    return {
      strokes: Array.from(this.strokes.values()),
      history: [...this.history],
      undoStack: [...this.undoStack]
    };
  }
}

module.exports = DrawingState;


