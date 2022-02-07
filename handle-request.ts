import { HMApi } from "./api.js";
import { checkAuthToken, getSessionsCount, loginUser, logOutOtherSessions, logOutSession } from "./auth.js";

type ParamType = 'string' | 'number' | 'boolean' | { [key: string|number]: ParamType } /*| `[]${ParamType}`*/;

/**
 * Checks if a value is of a certain type.
 * @param req The request object
 * @param type An object describing the type of the request (like a schema)
 * @param path An object path to prepend to keys in case of an error
 */
function checkType(req: any, type: ParamType, path=""): HMApi.RequestError<HMApi.Request> | null {
    const invalidTypeError = (name=""):HMApi.RequestError<HMApi.Request> => ({
        code: 400,
        message: "INVALID_PARAMETER",
        paramName: [path,name].filter(Boolean).join('.') as keyof HMApi.Request
    });
    if (type==='string') {
        if (typeof req !== 'string') {
            return invalidTypeError();
        }
    } else if (type==='number') {
        if (typeof req !== 'number') {
            return invalidTypeError();
        }
    } else if (type==='boolean') {
        if (typeof req !== 'boolean') {
            return invalidTypeError();
        }
    } else if (typeof type === 'object') {
        const missingProps= [];
        for (const key in type) {
            // Check for missing properties
            if (!(key in req)) {
                missingProps.push([path, String(key)].filter(Boolean).join('.'));
                continue;
            }
            const err = checkType(req[key], type[key], [path, String(key)].filter(Boolean).join('.'));
            if (err) {
                return err;
            }
        }
        if (missingProps.length) {
            return {
                code: 400,
                message: "MISSING_PARAMETER",
                missingParameters: missingProps as (keyof HMApi.Request)[],
            };
        }
    } else {
        throw new Error(`Invalid type ${type}`);
    }
    return null;
}


export default function handleRequest(token: string, req: HMApi.Request): HMApi.Response<HMApi.Request> {
    let user: string;
    if(req.type!=="login") {
        user = checkAuthToken(token)!;
        if(!user) {
            return {
                type: "error",
                error: {
                    code: 401,
                    message: "TOKEN_INVALID"
                }
            };
        }
    }
    switch( req.type ) {
        case "empty":
            return {
                type: "ok",
                data: {}
            };

        case "getVersion":
            return {
                type: "ok",
                data: {
                    version: "0.0.1"
                }
            };

        case "login":
            const err= checkType(req, {
                username: 'string',
                password: 'string'
            });
            if(err) { return { type: "error", error: err }; }
            try {
                const tk= loginUser(req.username, req.password);
                return {
                    type: "ok",
                    data: {
                        token: tk
                    }
                };
            }
            catch(e) {
                if(e instanceof Error) {
                    if(e.message==="USER_NOT_FOUND") {
                        return {
                            type: "error",
                            error: {
                                code: 401,
                                message: "LOGIN_USER_NOT_FOUND"
                            }
                        };
                    }
                    else if(e.message==="PASSWORD_INCORRECT") {
                        return {
                            type: "error",
                            error: {
                                code: 401,
                                message: "LOGIN_PASSWORD_INCORRECT"
                            }
                        };
                    }
                    else {
                        throw e;
                    }
                }
                else {
                    throw e;
                }
            }

        case 'logout':
            logOutSession(token);
            return {
                type: "ok",
                data: {}
            };

        case 'logoutOtherSessions':
            return {
                type: "ok",
                data: {
                    sessions: logOutOtherSessions(token)
                }
            };

        case 'getSessionsCount':
            return {
                type: "ok",
                data: {
                    sessions: getSessionsCount(token)
                }
            };

        default:
            return {
                type: "error",
                error: {
                    code: 400,
                    message: "INVALID_REQUEST_TYPE",
                }
            };
    }
}