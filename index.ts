import http from 'http';
import url from 'url';
import { HMApi } from './api.js';
import handleRequest from './handle-request.js';


http.createServer(function (req, res) {
    // Delay for 5 seconds to simulate a slow server //TODO: remove
    setTimeout(() => {
    function respond(data: HMApi.Response<HMApi.Request>): void {
        res.writeHead(data.type=='error' ? data.error.code : 200, {
            'Content-Type': 'text/json',
            'Access-Control-Allow-Origin': '*'
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
            const result=handleRequest(token, json);
            if(result.type=='error' && (result.error.message=='LOGIN_PASSWORD_INCORRECT' || result.error.message=='TOKEN_INVALID')) {
                // Delay a bit to prevent brute force attacks
                setTimeout(() => {
                    respond(result);
                }, 1000);
            } else {
                respond(result);
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
    }, 1000);
}).listen(703);