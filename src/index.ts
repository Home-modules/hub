import fs from 'fs';
import serveHandler from 'serve-handler';
import http from 'http';
import https from 'https';
import beforeShutdown, { shutdownHandler } from './async-cleanup.js';
import { Log } from './log.js';
import './plugins.js';
import { initPlugins } from './plugins.js';
import { initRoomsDevices, shutDownRoomsDevices } from './rooms/rooms.js';
import version from './version.js';
import { handleApiRequest } from './api-server/api-server.js';
import { createWSServer } from './api-server/websocket.js';
import { settings } from './settings.js';

const log = new Log('index.ts');
console.log("Home_modules hub", version);
log.i("Home_modules hub", version);

log.i(process.argv.join(' '));
const allowHttps = !(settings.forceHTTP||false);
if (!allowHttps) log.i("HTTPS is disabled. Will use HTTP even if private key and certificate are found.");
const httpsOptions: https.ServerOptions | null =
    (allowHttps && fs.existsSync("../data/key.pem") && fs.existsSync("../data/cert.pem")) ? {
        key: fs.readFileSync("../data/key.pem"),
        cert: fs.readFileSync("../data/cert.pem")
    } : null;
if (httpsOptions) {
    log.i("Found SSL private key at data/key.pem and certificate at data/cert.pem");
} else if(allowHttps) {
    log.w("data/key.pem and/or data/cert.pem was not found. Will fall back to HTTP for API and web app servers.");
}

function createServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    if (httpsOptions) {
        return https.createServer(httpsOptions, handler);
    } else {
        return http.createServer(handler);
    }
}

const apiServerPort = settings.apiPort || 703,
    webAppServerPort = settings.webAppPort || (httpsOptions? 443 : 80);

(async ()=> {
    log.i("Starting Home_modules hub");
    process.stdout.write('[1/4] Loading plugins... ');
    log.i("Init 1/4 Loading plugins...");
    await initPlugins();
    console.log('✔');
    log.i("Init 1/4 Loading plugins... Done");
    process.stdout.write("[2/4] Starting rooms and devices... ");
    log.i("Init 2/4 Starting rooms and devices...");
    await initRoomsDevices();
    console.log('✔');
    log.i("Init 2/4 Starting rooms and devices... Done");

    beforeShutdown(shutDownRoomsDevices);
    log.d("Added cleanup function for rooms and devices");

    process.stdout.write("[3/4] Starting API server... ");
    log.i(`Init 3/4 Starting API server on port ${apiServerPort}...`);

    const server = createServer(handleApiRequest).listen({
        port: apiServerPort,
    }, async () => {
        createWSServer(server);
        console.log('✔');
        log.i("Init 3/4 Starting API server... Done");
        if (allowHttps && !httpsOptions) {
            console.log("Warning: SSL certificate and/or private key not found. Falling back to HTTP.");
        }
        await startWebAppServer();
        console.log('Home_modules hub is now running');
        log.i("Init finished");
    }).on('error', error => {
        console.log('❌');
        log.e("Error starting API server:", error);
        shutdownHandler('server-error');
        throw error;
    });

    async function startWebAppServer() {
        return new Promise<void>(resolve => { // This promise will resolve even if server creation fails.
            process.stdout.write("[4/4] Staring web app server... ");
            log.i(`Init 3/4 Starting web app server on port ${webAppServerPort}...`);
            if (!fs.existsSync('../data/webapp')) {
                console.log('❌');
                console.log('Web app server cancelled: Web app folder not found (this is NOT a fatal error)');
                log.w("Web app server cancelled: 'data/webapp' not found");
                resolve();
                return;
            }
            createServer((req, res) => {
                serveHandler(req, res, {
                    directoryListing: false,
                    public: "../data/webapp",
                    rewrites: [{
                        source: "/**",
                        destination: "index.html"
                    }]
                });
            }).listen({
                port: webAppServerPort
            }, () => {
                console.log('✔');
                log.i("Init 4/4 Starting web app server... Done");
                resolve();
            }).on('error', error => {
                console.log('❌');
                console.log('Web app server cancelled:', error);
                log.e("Error starting web app server:", error);
                resolve();
            });
        });
    }
})();
