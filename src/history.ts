/**
 * History Manager for Undo/Redo functionality
 */

export interface HistoryAction {
    type: 'split' | 'delete' | 'add' | 'modify' | 'move';
    description: string;
    do: () => void;
    undo: () => void;
}

export class HistoryManager {
    private undoStack: HistoryAction[] = [];
    private redoStack: HistoryAction[] = [];
    private readonly maxStackSize = 50;

    /**
     * Push a new action onto the history stack
     */
    push(action: HistoryAction): void {
        // Clear redo stack when new action is performed
        this.redoStack = [];

        // Add to undo stack
        this.undoStack.push(action);

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }

        console.log(`History: Added action "${action.description}" (stack size: ${this.undoStack.length})`);
        this.logState();
    }

    /**
     * Undo the last action
     */
    undo(): boolean {
        const action = this.undoStack.pop();
        if (!action) {
            console.log('History: Nothing to undo');
            return false;
        }

        console.log(`History: Undoing "${action.description}"`);

        try {
            action.undo();
            this.redoStack.push(action);
            this.logState();
            return true;
        } catch (error) {
            console.error('History: Error during undo:', error);
            // Re-add to undo stack if undo failed
            this.undoStack.push(action);
            return false;
        }
    }

    /**
     * Redo the last undone action
     */
    redo(): boolean {
        const action = this.redoStack.pop();
        if (!action) {
            console.log('History: Nothing to redo');
            return false;
        }

        console.log(`History: Redoing "${action.description}"`);

        try {
            action.do();
            this.undoStack.push(action);
            this.logState();
            return true;
        } catch (error) {
            console.error('History: Error during redo:', error);
            // Re-add to redo stack if redo failed
            this.redoStack.push(action);
            return false;
        }
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Get description of next undo action
     */
    getUndoDescription(): string | null {
        if (this.undoStack.length === 0) return null;
        return this.undoStack[this.undoStack.length - 1].description;
    }

    /**
     * Get description of next redo action
     */
    getRedoDescription(): string | null {
        if (this.redoStack.length === 0) return null;
        return this.redoStack[this.redoStack.length - 1].description;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        console.log('History: Cleared all history');
    }

    /**
     * Get current stack sizes (for debugging)
     */
    private logState(): void {
        console.log(`History state: ${this.undoStack.length} undo, ${this.redoStack.length} redo`);
    }
}
