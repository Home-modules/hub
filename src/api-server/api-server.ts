import http from 'http';
import url from 'url';
import { HMApi } from '../api/api.js';
import { Log } from '../log.js';
import handleRequest from './handle-request.js';

const log = new Log('api-server');

export function handleApiRequest(req: http.IncomingMessage, res: http.ServerResponse) {
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

    if(!req.url) {
        invalidRequest();
        log.w("Invalid request received: no URL");
        return;
    }
    const reqUrl = url.parse(req.url, true);
    let pathNames = reqUrl.pathname?.split('/').filter(Boolean);
    if(!pathNames) {
        invalidRequest();
        log.w("Invalid request received: invalid URL path");
        return;
    }
    const subApi = pathNames[0];
    pathNames = pathNames.slice(1);

    switch (subApi) {
        case 'request': {
            if(req.method === 'GET') {
                // First part of the url is auth token, second is request data
                if(pathNames.length !== 2) {
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
            break;
        }

        default:
            invalidRequest();
            log.w("Invalid request received: invalid URL path");
            return;
    }
}