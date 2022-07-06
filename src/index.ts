import http from 'http';
import url from 'url';
import { HMApi } from './api.js';
import beforeShutdown from './async-cleanup.js';
import handleRequest from './handle-request.js';
import { Log } from './log.js';
import './plugins.js';
import { initPlugins } from './plugins.js';
import { initRoomsDevices, shutDownRoomsDevices } from './rooms.js';
import version from './version.js';

const log = new Log('index.ts');
console.log("Home_modules hub", version);
log.i("Home_modules hub", version);

(async ()=> {
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
    log.i("Init 3/3 Starting API server...");
    http.createServer(function (req, res) {
        // Delay for 5 seconds to simulate a slow server //TODO: remove
        // setTimeout(() => {
        
        log.i("Request received from", req.socket.remoteAddress);
        log.d("HTTP", req.httpVersion, "method", req.method, "url", req.url);
    
        function respond(data: HMApi.Response<HMApi.Request>): void {
            log.i("Responding to request, status:", data.type=='error' ? data.error.code : 200);
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
                log.d(json);
                const result=handleRequest(token, json, req.socket.remoteAddress||'unknown');
                function handleResult(result: HMApi.Response<HMApi.Request>){ 
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
        // }, 1000);
    }).listen({
        port: 703,
    }, () => {
        console.log('✔');
        log.i("Init 3/3 Starting API server... Done");
        console.log('Home_modules hub is now running');
        log.i("Init finished");
    });
})();