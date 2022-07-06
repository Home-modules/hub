import { HMApi } from "./api.js";
import { checkType, HMApi_Types } from "./api_checkType.js";
import { changePassword, changeUsername, checkAuthToken, getSessions, getSessionsCount, loginUser, logOutOtherSessions, logOutSession, terminateSession, usernameExists } from "./auth.js";
import { addDevice, deleteDevice, editDevice, getDevices, getDeviceTypes, registeredDeviceTypes, reorderDevices } from "./devices.js";
import getFlatFields from "./flat-fields.js";
import { addRoom, deleteRoom, editRoom, getRoomControllerTypes, getRooms, registeredRoomControllers, reorderRooms } from "./rooms.js";
import version from "./version.js";

export default function handleRequest(token: string, req: HMApi.Request, ip: string): HMApi.Response<HMApi.Request>|Promise<HMApi.Response<HMApi.Request>> {
    if(req.type!=="account.login") {
        try {
            const tk = checkAuthToken(token)!;
            if(!tk) {
                return {
                    type: "error",
                    error: {
                        code: 401,
                        message: "TOKEN_INVALID"
                    }
                };
            }
        } catch (e) {
            if(e === 'FLOOD') {
                return {
                    type: "error",
                    error: {
                        code: 429,
                        message: "TOO_MANY_REQUESTS"
                    }
                };
            }
            else {
                throw e;
            }
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
                    version
                }
            };

        case "account.login": {
            const err= checkType(req, HMApi_Types.requests["account.login"]);
            if(err) { return { type: "error", error: err }; }
            try {
                const tk= loginUser(req.username, req.password, req.device, ip);
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
            try {
                return {
                    type: "ok",
                    data: {
                        sessions: logOutOtherSessions(token)
                    }
                };
            } catch (e) {
                if(e === 'SESSION_TOO_NEW') {
                    return {
                        type: "error",
                        error: {
                            code: 403,
                            message: "SESSION_TOO_NEW"
                        }
                    };
                }
            }

        case 'account.getSessionsCount':
            return {
                type: "ok",
                data: {
                    sessions: getSessionsCount(token)
                }
            };

        case 'account.getSessions':
            return {
                type: "ok",
                data: {
                    sessions: getSessions(token)
                }
            };

        case 'account.logoutSession':
            const err= checkType(req, HMApi_Types.requests["account.logoutSession"]);
            if(err) { return { type: "error", error: err }; }

            try {
                terminateSession(token, req.id);
                return {
                    type: "ok",
                    data: {}
                };
            } catch(err) {
                if(err === 'SESSION_NOT_FOUND') {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "session"
                        }
                    };
                } else if(err === 'SESSION_TOO_NEW') {
                    return {
                        type: "error",
                        error: {
                            code: 403,
                            message: "SESSION_TOO_NEW",
                        }
                    };
                } else {
                    throw err;
                }
            }

        case 'account.changePassword': {
            const err= checkType(req, HMApi_Types.requests["account.changePassword"]);
            if(err) { return { type: "error", error: err }; }

            try {
                changePassword(token, req.oldPassword, req.newPassword);
                return {
                    type: "ok",
                    data: {}
                };
            } catch(err) {
                if(err === 'PASSWORD_INCORRECT') {
                    return {
                        type: "error",
                        error: {
                            code: 401,
                            message: "LOGIN_PASSWORD_INCORRECT"
                        }
                    };
                } else if(err === 'SESSION_TOO_NEW') {
                    return {
                        type: "error",
                        error: {
                            code: 403,
                            message: "SESSION_TOO_NEW",
                        }
                    };
                } else {
                    throw err;
                }
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
            try {
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
            } catch(err) {
                if(err === 'SESSION_TOO_NEW') {
                    return {
                        type: "error",
                        error: {
                            code: 403,
                            message: "SESSION_TOO_NEW",
                        }
                    };
                } else {
                    throw err;
                }
            }
        }

        case 'account.checkUsernameAvailable': {
            const err= checkType(req, HMApi_Types.requests["account.checkUsernameAvailable"]);
            if(err) { return { type: "error", error: err }; }
            return {
                type: "ok",
                data: {
                    available: !usernameExists(token, req.username)
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
            return editRoom(req.room).then(res=> {
                if(res === true) {
                    return {
                        type: "ok",
                        data: {}
                    };
                } else if(res) { // Res is either 'true' or a string (in which case it is an error)
                    return {
                        type: "error",
                        error: {
                            code: 400,
                            message: 'CUSTOM_PLUGIN_ERROR',
                            text: res
                        }
                    };
                } else {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "room"
                        }
                    };
                }
            });
        }

        case 'rooms.addRoom': {
            const err= checkType(req, HMApi_Types.requests["rooms.addRoom"]);
            if(err) { return { type: "error", error: err }; }
            return addRoom(req.room).then(res=> {
                if(res === true) {
                    return {
                        type: "ok",
                        data: {}
                    };
                } else if(res) { // Res is either 'true' or a string (in which case it is an error)
                    return {
                        type: "error",
                        error: {
                            code: 400,
                            message: 'CUSTOM_PLUGIN_ERROR',
                            text: res
                        }
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
            });
        }

        case 'rooms.removeRoom': {
            const err= checkType(req, HMApi_Types.requests["rooms.removeRoom"]);
            if(err) { return { type: "error", error: err }; }
            return deleteRoom(req.id).then(res=> {
                if(res) {
                    return {
                        type: "ok",
                        data: {}
                    };
                } else {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "room"
                        }
                    };
                }
            });
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

            const notFoundError = (o: "controller"|"deviceType"|"field") => ({
                type: "error",
                error: {
                    code: 404,
                    message: "NOT_FOUND",
                    object: o
                }
            } as const); 

            if(!(req.controller in registeredRoomControllers)) {
                return notFoundError("controller");
            }
            if(req.for == 'device' && !(req.deviceType in registeredDeviceTypes[req.controller])) {
                return notFoundError("deviceType");
            }

            const field = req.for == 'device' ?
                (getFlatFields(registeredDeviceTypes[req.controller][req.deviceType].settingsFields).find(f=>f.id==req.field)) :
                (getFlatFields(registeredRoomControllers[req.controller].settingsFields).find(f=>f.id==req.field));
            
            if(!field) {
                return notFoundError("field");
            }
            if(field.type!=='select' || field.options instanceof Array || !field.options.isLazy ) {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "FIELD_NOT_LAZY_SELECT"
                    }
                };
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
                            text: result.text
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
                        message: "NOT_FOUND",
                        object: "room"
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
                        message: "NOT_FOUND",
                        object: "controller"
                    }
                };
            }

            return {
                type: "ok",
                data: {
                    types: Object.values(getDeviceTypes(req.controllerType)).map((type): HMApi.DeviceType=> ({
                        id: type.id,
                        name: type.super_name,
                        sub_name: type.sub_name,
                        settings: type.settingsFields,
                        icon: type.icon
                    }))
                }
            };
        }

        case 'devices.addDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.addDevice"]);
            if(err) { return { type: "error", error: err }; }

            return addDevice(req.roomId, req.device).then(res=> {
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
                            message: "NOT_FOUND",
                            object: "room"
                        }
                    };
                } 
                else if(typeof res === 'string') {
                    return {
                        type: "error",
                        error: {
                            code: 400,
                            message: "CUSTOM_PLUGIN_ERROR",
                            text: res
                        }
                    };
                } else {
                    return {
                        type: "ok",
                        data: {}
                    };
                }
            });
        }

        case 'devices.editDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.editDevice"]);
            if(err) { return { type: "error", error: err }; }

            return editDevice(req.roomId, req.device).then(res=> {
                if(res==='device_not_found') {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "device"
                        }
                    };
                } 
                else if(res==='room_not_found') {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "room"
                        }
                    };
                } 
                else if(typeof res === 'string') {
                    return {
                        type: "error",
                        error: {
                            code: 400,
                            message: "CUSTOM_PLUGIN_ERROR",
                            text: res
                        }
                    };
                } else {
                    return {
                        type: "ok",
                        data: {}
                    };
                }
            });
        }

        case 'devices.removeDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.removeDevice"]);
            if(err) { return { type: "error", error: err }; }

            return deleteDevice(req.roomId, req.id).then(res=> {
                if(res==='device_not_found') {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "device"
                        }
                    };
                }
                else if(res==='room_not_found') {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "room"
                        }
                    };
                } else {
                    return {
                        type: "ok",
                        data: {}
                    };
                }
            });
        }

        case 'devices.changeDeviceOrder': {
            const err= checkType(req, HMApi_Types.requests["devices.changeDeviceOrder"]);
            if(err) { return { type: "error", error: err }; }

            const res = reorderDevices(req.roomId, req.ids);
            if(res === true) {
                return {
                    type: "ok",
                    data: { }
                };
            }
            if(res === 'devices_not_equal') {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "DEVICES_NOT_EQUAL"
                    }
                };
            }
            if(res === 'room_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND",
                        object: "room"
                    }
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