/**
* @fileoverview Logging utility with colorized output
*/

const COLORS = {
reset: '\x1b[0m',
red: '\x1b[31m',
yellow: '\x1b[33m', 
blue: '\x1b[34m'
};

class Logger {
constructor() {
    this.levels = {
    info: { priority: 0, color: COLORS.blue },
    warn: { priority: 1, color: COLORS.yellow },
    error: { priority: 2, color: COLORS.red }
    };
}

formatTimestamp() {
    return new Date().toISOString();
}

formatMessage(level, message, data) {
    const timestamp = this.formatTimestamp();
    const color = this.levels[level].color;
    
    let formattedMessage = message;
    let formattedData = '';

    if (data) {
        if (data instanceof Error) {
            formattedData = `\n    message: ${data.message}\n    stack: ${data.stack}\n    code: ${data.code}`;
        } else if (typeof data === 'object') {
            try {
                formattedData = '\n    ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n    ');
            } catch (err) {
                formattedData = '\n    ' + String(data);
            }
        } else {
            formattedData = data;
        }
    }

    return `${color}[${timestamp}] ${level.toUpperCase()}: ${formattedMessage}${formattedData}${COLORS.reset}`;
}

log(level, message, data) {
    const formatted = this.formatMessage(level, message, data);
    console.log(formatted);
}

info(message, data) {
    this.log('info', message, data);
}

warn(message, data) {
    this.log('warn', message, data);
}

error(message, data) {
    this.log('error', message, data);
}
}

// Export a singleton instance
module.exports = { logger: new Logger() };
