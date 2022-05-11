import { HMApi } from "./api.js";
import { checkType, HMApi_Types } from "./api_checkType.js";
import { changePassword, changeUsername, checkAuthToken, getSessionsCount, loginUser, logOutOtherSessions, logOutSession, usernameExists } from "./auth.js";
import { addDevice, deleteDevice, editDevice, getDevices, getDeviceTypes, registeredDeviceTypes } from "./devices.js";
import getFlatFields from "./flat-fields.js";
import { addRoom, deleteRoom, editRoom, getRoomControllerTypes, getRooms, registeredRoomControllers, reorderRooms } from "./rooms.js";

export default function handleRequest(token: string, req: HMApi.Request): HMApi.Response<HMApi.Request>|Promise<HMApi.Response<HMApi.Request>> {
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

        case 'rooms.editRoom': {
            const err= checkType(req, HMApi_Types.requests["rooms.editRoom"]);
            if(err) { return { type: "error", error: err }; }
            if(editRoom(req.room)) {
                return {
                    type: "ok",
                    data: {}
                };
            } else {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            }
        }

        case 'rooms.addRoom': {
            const err= checkType(req, HMApi_Types.requests["rooms.addRoom"]);
            if(err) { return { type: "error", error: err }; }
            if(addRoom(req.room)) {
                return {
                    type: "ok",
                    data: {}
                };
            } else {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "ROOM_ALREADY_EXISTS"
                    }
                };
            }
        }

        case 'rooms.removeRoom': {
            const err= checkType(req, HMApi_Types.requests["rooms.removeRoom"]);
            if(err) { return { type: "error", error: err }; }
            if(deleteRoom(req.id)) {
                return {
                    type: "ok",
                    data: {}
                };
            } else {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            }
        }

        case 'rooms.changeRoomOrder': {
            const err= checkType(req, HMApi_Types.requests["rooms.changeRoomOrder"]);
            if(err) { return { type: "error", error: err }; }
            if(reorderRooms(req.ids)) {
                return {
                    type: "ok",
                    data: {}
                };
            } else {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "ROOMS_NOT_EQUAL"
                    }
                };
            }
        }

        case 'rooms.controllers.getRoomControllerTypes':
            return {
                type: "ok",
                data: {
                    types: getRoomControllerTypes()
                }
            };

        case 'plugins.fields.getSelectLazyLoadItems': {
            const err= checkType(req, HMApi_Types.requests["plugins.fields.getSelectLazyLoadItems"]);
            if(err) { return { type: "error", error: err }; }

            const notFoundError = {
                type: "error",
                error: {
                    code: 404,
                    message: "NOT_FOUND"
                }
            } as const; 

            if((!(req.controller in registeredRoomControllers)) ||
                (req.for == 'device' && !(req.deviceType in registeredDeviceTypes[req.controller]))) {
                return notFoundError;
            }

            const field = req.for == 'device' ?
                (getFlatFields(registeredDeviceTypes[req.controller][req.deviceType].settingsFields).find(f=>f.id==req.field)) :
                (getFlatFields(registeredRoomControllers[req.controller].settingsFields).find(f=>f.id==req.field));
            
            if(!field) {
                return notFoundError;
            }
            if(field.type!=='select' || field.options instanceof Array || !field.options.isLazy ) {
                return notFoundError;
            }

            let res = field.options.callback();
            if(!(res instanceof Promise)) {
                res = Promise.resolve(res);
            }
            
            return res.then((result) => {
                if(result instanceof Array) {
                    return {
                        type: "ok",
                        data: {
                            items: result
                        }
                    };
                } else {
                    return {
                        type: "error",
                        error: {
                            code: 400,
                            message: "CUSTOM_PLUGIN_ERROR",
                            params: result.params
                        }
                    };
                }
            });
        }

        case 'devices.getDevices': {
            const err= checkType(req, HMApi_Types.requests["devices.getDevices"]);
            if(err) { return { type: "error", error: err }; }
            
            const devices= getDevices(req.roomId);
            if(devices===undefined) {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            }
            return {
                type: "ok",
                data: {
                    devices
                }
            };
        }

        case 'devices.getDeviceTypes': {
            const err= checkType(req, HMApi_Types.requests["devices.getDeviceTypes"]);
            if(err) { return { type: "error", error: err }; }

            // Check if the room controller type is valid
            if(!(req.controllerType in registeredRoomControllers)) {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            }

            return {
                type: "ok",
                data: {
                    types: getDeviceTypes(req.controllerType).map(type=> ({
                        id: type.id,
                        name: type.name,
                        sub_name: type.sub_name,
                        settings: type.settingsFields,
                    }))
                }
            };
        }

        case 'devices.addDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.addDevice"]);
            if(err) { return { type: "error", error: err }; }

            const res= addDevice(req.roomId, req.device);
            if(res==='device_exists') {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "DEVICE_ALREADY_EXISTS"
                    }
                };
            }
            else if(res==='room_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            } else {
                return {
                    type: "ok",
                    data: {}
                };
            }
        }

        case 'devices.editDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.editDevice"]);
            if(err) { return { type: "error", error: err }; }

            const res= editDevice(req.roomId, req.device);
            if(res==='device_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            } 
            else if(res==='room_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            } else {
                return {
                    type: "ok",
                    data: {}
                };
            }
        }

        case 'devices.removeDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.removeDevice"]);
            if(err) { return { type: "error", error: err }; }

            const res= deleteDevice(req.roomId, req.id);
            if(res==='device_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            }
            else if(res==='room_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND"
                    }
                };
            } else {
                return {
                    type: "ok",
                    data: {}
                };
            }
        }

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