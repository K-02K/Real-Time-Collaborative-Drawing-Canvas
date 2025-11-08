class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentStroke = null;
        this.strokes = new Map(); // strokeId -> stroke data
        this.undoStack = [];
        this.redoStack = [];

        // Drawing settings
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.currentLineWidth = 5;

        // Initialize canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Setup event listeners
        this.setupEventListeners();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        // Use full container size
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Redraw all strokes
        this.redrawCanvas();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const point = this.getCanvasCoordinates(e);
        
        // Generate stroke ID
        const strokeId = `stroke-${Date.now()}-${Math.random()}`;
        
        this.currentStroke = {
            id: strokeId,
            tool: this.currentTool,
            color: this.currentColor,
            lineWidth: this.currentLineWidth,
            points: [point]
        };

        this.strokes.set(strokeId, { ...this.currentStroke });
        this.drawPoint(point, this.currentStroke);

        // Notify WebSocket manager
        if (window.wsManager) {
            window.wsManager.sendDrawStart({
                strokeId: strokeId,
                point: point,
                tool: this.currentTool,
                color: this.currentColor,
                lineWidth: this.currentLineWidth
            });
        }
    }

    draw(e) {
        if (!this.isDrawing || !this.currentStroke) return;

        const point = this.getCanvasCoordinates(e);
        this.currentStroke.points.push(point);
        this.drawPoint(point, this.currentStroke);

        // Notify WebSocket manager
        if (window.wsManager) {
            window.wsManager.sendDrawMove({
                strokeId: this.currentStroke.id,
                point: point
            });
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.currentStroke) {
            // Finalize stroke
            const stroke = this.strokes.get(this.currentStroke.id);
            if (stroke) {
                stroke.finalized = true;
            }

            // Notify WebSocket manager
            if (window.wsManager) {
                window.wsManager.sendDrawEnd({
                    strokeId: this.currentStroke.id
                });
            }

            // Clear redo stack when new stroke is created
            this.redoStack = [];
            this.currentStroke = null;
        }
    }

    drawPoint(point, stroke) {
        const points = stroke.points;
        if (points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
        this.ctx.lineTo(point.x, point.y);
        
        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = stroke.color;
        }
        
        this.ctx.lineWidth = stroke.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
    }

    // Remote drawing methods
    addRemoteStroke(strokeData) {
        const stroke = {
            id: strokeData.id,
            tool: strokeData.tool,
            color: strokeData.userColor || strokeData.color,
            lineWidth: strokeData.lineWidth,
            points: [...strokeData.points],
            finalized: false,
            isRemote: true
        };

        this.strokes.set(stroke.id, stroke);
        this.drawStroke(stroke);
    }

    addRemotePoint(strokeId, point) {
        const stroke = this.strokes.get(strokeId);
        if (stroke) {
            stroke.points.push(point);
            if (stroke.points.length >= 2) {
                const prevPoint = stroke.points[stroke.points.length - 2];
                this.drawPoint(point, { ...stroke, points: [prevPoint, point] });
            }
        }
    }

    finalizeRemoteStroke(strokeId) {
        const stroke = this.strokes.get(strokeId);
        if (stroke) {
            stroke.finalized = true;
        }
    }

    drawStroke(stroke) {
        if (stroke.points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
            this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }

        if (stroke.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = stroke.color;
        }

        this.ctx.lineWidth = stroke.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
    }

    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Redraw all finalized strokes
        for (const [strokeId, stroke] of this.strokes) {
            if (stroke.finalized) {
                this.drawStroke(stroke);
            }
        }
    }

    removeStroke(strokeId) {
        this.strokes.delete(strokeId);
        this.redrawCanvas();
    }

    addStrokeToHistory(strokeId) {
        const stroke = this.strokes.get(strokeId);
        if (stroke) {
            this.drawStroke(stroke);
        }
    }

    clearCanvas() {
        this.strokes.clear();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    loadCanvasState(history) {
        this.strokes.clear();
        this.clearCanvas();

        if (history && Array.isArray(history)) {
            history.forEach(strokeData => {
                if (strokeData) {
                    const stroke = {
                        id: strokeData.id,
                        tool: strokeData.tool || 'brush',
                        color: strokeData.userColor || strokeData.color || '#000000',
                        lineWidth: strokeData.lineWidth || 5,
                        points: strokeData.points || [],
                        finalized: true,
                        isRemote: true
                    };
                    this.strokes.set(stroke.id, stroke);
                    this.drawStroke(stroke);
                }
            });
        }
    }

    // Tool setters
    setTool(tool) {
        this.currentTool = tool;
    }

    setColor(color) {
        this.currentColor = color;
    }

    setLineWidth(width) {
        this.currentLineWidth = width;
    }
}

