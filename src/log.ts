import fs from 'node:fs';
import { logFilePath } from './misc.ts';

const logEnabled = !process.argv.includes('--no-log');
const debugEnabled = process.argv.includes('--debug');

const logStream = logEnabled ? fs.createWriteStream(logFilePath) : null;

// biome-ignore lint/suspicious/noExplicitAny: Accepts anything
type any_ = any

function log(level: string, component: string, ...args: any_[]) {
    if(logEnabled) {
        if(level==='debug' && !debugEnabled) {
            return;
        }
        const info = `${new Date().toISOString()} ${component} [${level}] `;
        logStream?.write(`${info}${
            args.map(arg => 
                (typeof arg === 'string')? arg : ((arg instanceof Error) ? String(arg) : JSON.stringify(arg, undefined, 2) )
            ).join(' ')
                .split('\n').map((l, i)=> i===0? l : ' '.repeat(info.length)+l).join('\n')
        }\n`);
    }
}

export class Log {
    constructor(public component: string) { }
    i(...args: any_[]) { log('info', this.component, ...args); }
    d(...args: any_[]) { log('debug', this.component, ...args); }
    w(...args: any_[]) { log('warn', this.component, ...args); }
    e(...args: any_[]) { log('error', this.component, ...args); }

    static i(component = '', ...args: any_[]) { log('info', component, ...args); }
    static d(component = '', ...args: any_[]) { log('debug', component, ...args); }
    static w(component = '', ...args: any_[]) { log('warn', component, ...args); }
    static e(component = '', ...args: any_[]) { log('error', component, ...args); }
}

if(debugEnabled) Log.i("Log", "Debug enabled")
