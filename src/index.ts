import http from 'http';
import https from 'https';
import url from 'url';
import { HMApi } from './api.js';
import beforeShutdown, { shutdownHandler } from './async-cleanup.js';
import handleRequest from './handle-request.js';
import { Log } from './log.js';
import './plugins.js';
import { initPlugins } from './plugins.js';
import { initRoomsDevices, shutDownRoomsDevices } from './rooms.js';
import version from './version.js';
import fs from 'fs';
import serveHandler from 'serve-handler';

const log = new Log('index.ts');
console.log("Home_modules hub", version);
log.i("Home_modules hub", version);

const allowHttps = !process.argv.includes('--disable-https');
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

const apiServerPort = parseInt(process.argv[process.argv.indexOf('--api-port') + 1]) || 703,
    webAppServerPort = parseInt(process.argv[process.argv.indexOf('--webapp-port') + 1]) || (httpsOptions? 443 : 80);

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

    createServer(handleApiRequest).listen({
        port: apiServerPort,
    }, async() => {
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





function handleApiRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    log.i("Request received from", req.socket.remoteAddress);
    log.d("HTTP", req.httpVersion, "method", req.method, "url", req.url);

    function respond(data: HMApi.ResponseOrError<HMApi.Request>): void {
        log.i("Responding to request with status", data.type=='error' ? `${data.error.code} (${data.error.message})` : 200);
        log.d(data);
        res.writeHead(data.type=='error' ? data.error.code : 200, {
            'Content-Type': 'text/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
            'Access-Control-Allow-Methods': 'POST, GET'
        });
        res.end(JSON.stringify(data));
    }
    
    function invalidRequest() {
        respond({
            type: "error",
            error: {
                code: 400,
                message: "INVALID_REQUEST"
            }
        });
    }

    function parseRequest(token: string, data: string) {
        log.d("Parsing request");

        token = decodeURIComponent(token);
        data= decodeURIComponent(data);
        let json: HMApi.Request;
        try {
            json= JSON.parse(data);
        } catch (e) {
            respond({
                type: "error",
                error: {
                    code: 400,
                    message: "INVALID_REQUEST_JSON"
                }
            });
            log.w("Invalid request JSON received");
            return;
        }
        try {
            log.i("Request type:", json.type);
            log.d(json);
            const result=handleRequest(token, json, req.socket.remoteAddress||'unknown');
            function handleResult(result: HMApi.ResponseOrError<HMApi.Request>){ 
                if(result.type=='error' && (result.error.message=='LOGIN_PASSWORD_INCORRECT' || result.error.message=='TOKEN_INVALID')) {
                    log.w("Invalid credentials received:", result.error.message, "Delaying for 1000ms to prevent brute force attacks");
                    // Delay a bit to prevent brute force attacks
                    setTimeout(() => {
                        respond(result);
                        log.d("Responded to request after 1000ms delay");
                    }, 1000);
                } else {
                    respond(result);
                }
            }
            if(result instanceof Promise) {
                result.then(handleResult);
            } else {
                handleResult(result);
            }
        } catch (e) {
            console.log(e);
            log.e("Error handling request", e);
            respond({
                type: "error",
                error: {
                    code: 500,
                    message: "INTERNAL_SERVER_ERROR"
                }
            });
        }
    }

    if(req.method === 'GET') {
        if(!req.url) {
            invalidRequest();
            log.w("Invalid request received: no URL");
            return;
        }
        const reqUrl = url.parse(req.url, true);
        // First part of the url is auth token, second is request data
        const pathNames = reqUrl.pathname?.split('/').filter(Boolean);
        if(!pathNames || pathNames.length !== 2) {
            invalidRequest();
            log.w("Invalid request received: invalid URL path");
            return;
        }
        const [authToken, requestData] = pathNames;
        if(!authToken || !requestData) {
            invalidRequest();
            log.w("Invalid request received: auth token or request data missing");
            return;
        }
        parseRequest(authToken, requestData);
    } 
    else if(req.method === 'POST') {
        const reqUrl = url.parse(req.url||'', true);
        const pathNames = reqUrl.pathname?.split('/').filter(Boolean);
        if(!pathNames || pathNames.length > 1) {
            invalidRequest();
            log.w("Invalid request received: invalid URL path");
            return;
        }
        const authToken = pathNames[0];
        const requestData: (Buffer)[] = [];
        req.on('data', (chunk) => {
            requestData.push(chunk);
        });
        req.on('end', () => {
            parseRequest(authToken, Buffer.concat(requestData).toString());
        });
    } else {
        invalidRequest();
        log.w("Invalid request received: invalid method, must be GET or POST");
    }
}