import http from 'http';
import url from 'url';
import { HMApi } from './api.js';
import beforeShutdown from './async-cleanup.js';
import handleRequest from './handle-request.js';
import './plugins.js';
import { initPlugins } from './plugins.js';
import { initRoomsDevices, shutDownRoomsDevices } from './rooms.js';


(async ()=> {
    process.stdout.write('[1/3] Loading plugins... ');
    await initPlugins();
    console.log('✔');
    process.stdout.write("[2/3] Starting rooms and devices... ");
    await initRoomsDevices();
    console.log('✔');

    beforeShutdown(shutDownRoomsDevices);

    process.stdout.write("[3/3] Starting API server... ");
    http.createServer(function (req, res) {
        // Delay for 5 seconds to simulate a slow server //TODO: remove
        // setTimeout(() => {
        
        console.log("Request received from" + req.socket.remoteAddress);
    
        function respond(data: HMApi.Response<HMApi.Request>): void {
            console.log("Responding with status", data.type=='error' ? data.error.code : 200);
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
                return;
            }
            try {
                const result=handleRequest(token, json, req.socket.remoteAddress||'unknown');
                function handleResult(result: HMApi.Response<HMApi.Request>){ 
                    if(result.type=='error' && (result.error.message=='LOGIN_PASSWORD_INCORRECT' || result.error.message=='TOKEN_INVALID')) {
                        // Delay a bit to prevent brute force attacks
                        setTimeout(() => {
                            respond(result);
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
                return;
            }
            const reqUrl = url.parse(req.url, true);
            // First part of the url is auth token, second is request data
            const pathNames = reqUrl.pathname?.split('/').filter(Boolean);
            if(!pathNames || pathNames.length !== 2) {
                invalidRequest();
                return;
            }
            const [authToken, requestData] = pathNames;
            if(!authToken || !requestData) {
                invalidRequest();
                return;
            }
            parseRequest(authToken, requestData);
        } 
        else if(req.method === 'POST') {
            const reqUrl = url.parse(req.url||'', true);
            const pathNames = reqUrl.pathname?.split('/').filter(Boolean);
            if(!pathNames || pathNames.length > 1) {
                invalidRequest();
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
        }
        // }, 1000);
    }).listen({
        port: 703,
    }, () => {
        console.log('✔');
        console.log('Home_modules hub is now running');
    });
})();