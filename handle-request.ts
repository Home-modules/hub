import { HMApi } from "./api.js";
import { checkType, HMApi_Types } from "./api_checkType.js";
import { changePassword, changeUsername, checkAuthToken, getSessionsCount, loginUser, logOutOtherSessions, logOutSession, usernameExists } from "./auth.js";
import { getRooms } from "./rooms.js";

export default function handleRequest(token: string, req: HMApi.Request): HMApi.Response<HMApi.Request> {
    let user: string;
    if(req.type!=="account.login") {
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
    } else {
        [user]= token.split(':');
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

        case "account.login": {
            const err= checkType(req, HMApi_Types.requests["account.login"]);
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
        }

        case 'account.logout':
            logOutSession(token);
            return {
                type: "ok",
                data: {}
            };

        case 'account.logoutOtherSessions':
            return {
                type: "ok",
                data: {
                    sessions: logOutOtherSessions(token)
                }
            };

        case 'account.getSessionsCount':
            return {
                type: "ok",
                data: {
                    sessions: getSessionsCount(token)
                }
            };

        case 'account.changePassword': {
            const err= checkType(req, HMApi_Types.requests["account.changePassword"]);
            if(err) { return { type: "error", error: err }; }
            if(changePassword(user, req.oldPassword, req.newPassword)) {
                return {
                    type: "ok",
                    data: {}
                };
            }
            else {
                return {
                    type: "error",
                    error: {
                        code: 401,
                        message: "LOGIN_PASSWORD_INCORRECT"
                    }
                };
            }
        }

        case 'account.changeUsername': {
            const err= checkType(req, HMApi_Types.requests["account.changeUsername"]);
            if(err) { return { type: "error", error: err }; }

            if(req.username.length < 3) {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "USERNAME_TOO_SHORT"
                    }
                };
            }
            const newTk= changeUsername(token, req.username);
            if(!newTk) {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "USERNAME_ALREADY_TAKEN"
                    }
                };
            }
            return {
                type: "ok",
                data: {
                    token: newTk
                }
            };
        }

        case 'account.checkUsernameAvailable': {
            const err= checkType(req, HMApi_Types.requests["account.checkUsernameAvailable"]);
            if(err) { return { type: "error", error: err }; }
            return {
                type: "ok",
                data: {
                    available: !usernameExists(req.username)
                }
            };
        }

        case 'rooms.getRooms': 
            return {
                type: "ok",
                data: {
                    rooms: getRooms()
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