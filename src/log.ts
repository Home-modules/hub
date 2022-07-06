import fs from 'fs';

const logEnabled = process.argv.includes('--log') || process.argv.includes('--debug');
const debugEnabled = process.argv.includes('--debug');

const logStream = logEnabled ? fs.createWriteStream('../data/log.txt') : null;

function log(level: string, component: string, ...args: any[]) {
    if(logEnabled) {
        if(level==='debug' && !debugEnabled) {
            return;
        }
        const info = `${new Date().toISOString()} ${component} [${level}] `;
        logStream?.write(`${info}${args.map(arg => (typeof arg === 'string')? arg : JSON.stringify(arg, undefined, 2)).join(' ').split('\n').map((l, i)=> i==0? l : ' '.repeat(info.length)+l).join('\n')}\n`);
    }
}

export class Log {
    constructor(public component: string) { }
    i(...args: any[]) { log('info', this.component, ...args); }
    d(...args: any[]) { log('debug', this.component, ...args); }
    w(...args: any[]) { log('warn', this.component, ...args); }
    e(...args: any[]) { log('error', this.component, ...args); }

    static i(component = '', ...args: any[]) { log('info', component, ...args); }
    static d(component = '', ...args: any[]) { log('debug', component, ...args); }
    static w(component = '', ...args: any[]) { log('warn', component, ...args); }
    static e(component = '', ...args: any[]) { log('error', component, ...args); }
}