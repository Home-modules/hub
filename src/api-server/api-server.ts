import url from 'url';
import type { HMApi } from '../api/api.ts';
import { Log } from '../log.ts';
import handleRequest from './handle-request.ts';
import { delay } from '../misc.ts';

const log = new Log('api-server');

export async function handleApiRequest(req: Bun.BunRequest<'/request/*'>, server: Bun.Server): Promise<Response> {
    log.i("Request received from", server.requestIP(req)?.address);
    log.d("Method", req.method, "url", req.url);

    function respond(data: HMApi.ResponseOrError<HMApi.Request>) {
        return Response.json(data, {
            status: data.type == 'error' ? data.error.code : 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            }
        });
    }
    
    function invalidRequest() {
        return respond({
            type: "error",
            error: {
                code: 400,
                message: "INVALID_REQUEST"
            }
        });
    }

    async function parseRequest(token: string, data: string): Promise<Response> {
        log.d("Parsing request");

        token = decodeURIComponent(token);
        data= decodeURIComponent(data);
        let json: HMApi.Request;
        try {
            json= JSON.parse(data);
        } catch (e) {
            log.w("Invalid request JSON received");
            return respond({
                type: "error",
                error: {
                    code: 400,
                    message: "INVALID_REQUEST_JSON"
                }
            });
        }
        try {
            log.i("Request type:", json.type);
            log.d(json);
            const result = handleRequest(token, json, server.requestIP(req)?.address || 'unknown');
            async function handleResult(result: HMApi.ResponseOrError<HMApi.Request>){ 
                if(result.type=='error' && (result.error.message=='LOGIN_PASSWORD_INCORRECT' || result.error.message=='TOKEN_INVALID')) {
                    log.w("Invalid credentials received:", result.error.message, "Delaying for 1000ms to prevent brute force attacks");
                    // Delay a bit to prevent brute force attacks
                    await delay(1000);
                    log.d("Responded to request after 1000ms delay");
                    return respond(result);
                } else {
                    return respond(result);
                }
            }
            return handleResult(await result);
        } catch (e) {
            console.log(e);
            log.e("Error handling request", e);
            return respond({
                type: "error",
                error: {
                    code: 500,
                    message: "INTERNAL_SERVER_ERROR"
                }
            });
        }
    }

    if (req.method === "OPTIONS") { // preflight
        log.i("Preflight request");
        log.d(req.headers);
        return new Response(undefined, {
            status: 200,
            headers: {
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Token",
                "Access-Control-Max-Age": "86400"
            }
        });
    }

    if(!req.url) {
        log.w("Invalid request received: no URL");
        return invalidRequest();
    }
    const reqUrl = url.parse(req.url, true);
    let pathNames = reqUrl.pathname?.split('/').filter(Boolean);
    log.d("Pathnames", pathNames);
    if(!pathNames) {
        log.w("Invalid request received: invalid URL path (pathName invalid)");
        return invalidRequest();
    }
    pathNames = pathNames.slice(1);

    if(req.method === 'GET') {
        // First part of the url is auth token, second is request data
        if(pathNames.length !== 2) {
            log.w("Invalid request received: invalid URL path (too few or too many pathname parts)");
            return invalidRequest();
        }
        const [authToken, requestData] = pathNames;
        if(!authToken || !requestData) {
            log.w("Invalid request received: auth token or request data missing");
            return invalidRequest();
        }
        return parseRequest(authToken, requestData);
    } 
    else if(req.method === 'POST') {
        let authToken = pathNames[0];
        const headerToken = req.headers.get('token')
        if ((!authToken) && headerToken && typeof headerToken === 'string')
            authToken = headerToken;
        
        return parseRequest(authToken, await req.text());
    } else {
        log.w("Invalid request received: invalid method, must be GET or POST or OPTIONS");
        return invalidRequest();
    }
}