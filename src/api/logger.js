let instance = null;

class Logger {
    constructor() {
        if (instance) {
            return instance;
        }
        instance = this;
    }

    extractErrorMessage(error) {
        if (!error) return 'Unknown error';
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        return String(error);
    }

    info(message, ...args) {
        try {
            if (!message) return;
            const safeMessage = this.extractErrorMessage(message);
            const safeArgs = args?.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ) || [];
            console.log(safeMessage, ...safeArgs);
        } catch (err) {
            console.log('Logger info error:', err?.message || err);
        }
    }

    error(message, ...args) {
        try {
            if (!message) return;
            const safeMessage = this.extractErrorMessage(message);
            const safeArgs = args?.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ) || [];
            console.error(safeMessage, ...safeArgs);
        } catch (err) {
            console.error('Logger error error:', err?.message || err);
        }
    }

    warn(message, ...args) {
        try {
            if (!message) return;
            const safeMessage = typeof message === 'string' ? message : this.extractErrorMessage(message);
            console.warn(safeMessage, ...(args || []));
        } catch (err) {
            console.warn('Logger warn error:', err);
        }
    }
}

const logger = new Logger();
Object.freeze(logger);
module.exports = logger;

