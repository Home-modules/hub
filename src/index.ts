import fs from 'fs';
import { dataPath, httpsCertPath, httpsKeyPath } from './misc.ts';

if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

import Path from 'path'
import beforeShutdown from './async-cleanup.ts';
import { Log } from './log.ts';
import './plugins.ts';
import { initPlugins } from './plugins.ts';
import { initRoomsDevices, shutDownRoomsDevices } from './rooms/rooms.ts';
import version from './version.ts';
import { handleApiRequest } from './api-server/api-server.ts';
import { WebSocketServer } from './api-server/websocket.ts';
import { settings } from './settings.ts';
import { initRoutines } from './automation/run-routine.ts';

const log = new Log('index.ts');
console.log("Home_modules hub", version);
log.i("Home_modules hub", version);

log.i(process.argv.join(' '));
const allowHttps = !(settings.forceHTTP||false);
if (!allowHttps) log.i("HTTPS is disabled. Will use HTTP even if private key and certificate are found.");
const httpsOptions: Bun.TLSOptions | undefined =
    (allowHttps && fs.existsSync(httpsKeyPath) && fs.existsSync(httpsCertPath)) ? {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath)
    } : undefined;
if (httpsOptions) {
    log.i("Found TLS private key at data/key.pem and certificate at data/cert.pem");
} else if(allowHttps) {
    log.w("data/key.pem and/or data/cert.pem was not found. Will fall back to HTTP for API and web app servers.");
}

const serverPort = settings.port || (httpsOptions? 443 : 80);

function createServer() {
    Bun.serve({
        port: serverPort,
        routes: {
            "/": Response.redirect("/webapp/"),
            "/webapp/*": req => {
                const url = new URL(req.url);
                let filePath = Path.join(dataPath, url.pathname);
                if (filePath.endsWith('/')) filePath += 'index.html'
                
                try {
                    // Check if the file exists
                    const staticFile = Bun.file(filePath);
                    if (staticFile.size > 0) {
                        return new Response(staticFile, {
                            headers: { "Content-Type": staticFile.type },
                        });
                    }
                } catch (err) {
                    // File not found or other error
                }
            
                // Return 404 if file doesn't exist
                return new Response("404 Not Found", { status: 404 });
            },
            "/request/*": handleApiRequest,
            "/ws/": (req, server) => {
                if (server.upgrade(req)) {
                    return; // do not return a Response
                }
                return new Response("Upgrade failed", { status: 500 });
            }
        },
        websocket: WebSocketServer,
    })
}

export async function init () {
    log.i("Starting Home_modules hub");
    process.stdout.write('[1/3] Loading plugins... ');
    log.i("Init 1/3 Loading plugins...");
    await initPlugins();
    console.log('✔');
    log.i("Init 1/3 Loading plugins... Done");
    process.stdout.write("[2/3] Starting rooms and devices... ");
    log.i("Init 2/3 Starting rooms and devices...");
    await initRoomsDevices();
    console.log('✔');
    log.i("Init 2/3 Starting rooms and devices... Done");

    beforeShutdown(shutDownRoomsDevices);
    log.d("Added cleanup function for rooms and devices");

    process.stdout.write("[3/3] Starting API server... ");
    log.i(`Init 3/3 Starting API server on port ${serverPort}...`);

    initRoutines();
    createServer()
    console.log('✔');
    log.i("Init 3/3 Starting API server... Done");
    if (allowHttps && !httpsOptions) {
        console.log("Warning: SSL certificate and/or private key not found. Falling back to HTTP.");
    }
    console.log('Home_modules hub is now running');
    log.i("Init finished");
}

if (import.meta.main) { // This file is entry point
    init();
}
