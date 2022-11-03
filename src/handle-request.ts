import { HMApi } from "./api.js";
import { checkType, HMApi_Types } from "./api_checkType.js";
import { shutdownHandler } from "./async-cleanup.js";
import { changePassword, changeUsername, checkAuthToken, getSessions, getSessionsCount, loginUser, logOutOtherSessions, logOutSession, terminateSession, usernameExists } from "./auth.js";
import { addDevice, deleteDevice, editDevice, getDevices, getDeviceStates, getDeviceTypes, getFavoriteDeviceStates, registeredDeviceTypes, reorderDevices, restartDevice, sendDeviceInteractionAction, toggleDeviceIsFavorite } from "./devices.js";
import getFlatFields from "./flat-fields.js";
import { getInstalledPlugins, getInstalledPluginsInfo, togglePluginIsActivated } from "./plugins.js";
import { addRoom, deleteRoom, editRoom, getRoomControllerTypes, getRooms, registeredRoomControllers, reorderRooms, restartRoom, roomControllerInstances } from "./rooms.js";
import version from "./version.js";

export default function handleRequest(token: string, req: HMApi.Request, ip: string): HMApi.ResponseOrError<HMApi.Request>|Promise<HMApi.ResponseOrError<HMApi.Request>> {
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

        case "restart":
            setTimeout(() => shutdownHandler('restart'), 100); // 100ms should be enough, since the whole process of sending the request from the frontend until receiving the result usually takes less than 100ms, let alone just sending the result from backend.
            
            return {
                type: "ok",
                data: {}
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

        case 'rooms.restartRoom': {
            const err= checkType(req, HMApi_Types.requests["rooms.restartRoom"]);
            if(err) { return { type: "error", error: err }; }

            return restartRoom(req.id).then(success=> {
                if(success) {
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
                    types: Object.values(getDeviceTypes(req.controllerType)).map(({id, super_name, sub_name, icon, settingsFields, forRoomController}): HMApi.T.DeviceType=> ({
                        id, name: super_name, sub_name, settings: settingsFields, icon, forRoomController
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
            return {
                type: "ok",
                data: { }
            };
        }

        case 'devices.restartDevice': {
            const err= checkType(req, HMApi_Types.requests["devices.restartDevice"]);
            if(err) { return { type: "error", error: err }; }
            
            return restartDevice(req.roomId, req.id).then(res=> {
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
                else if(res==='room_disabled') {
                    return {
                        type: "error",
                        error: {
                            code: 500,
                            message: "ROOM_DISABLED",
                            error: roomControllerInstances[req.roomId].disabled as string
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

        case 'rooms.getRoomStates':
            return {
                type: "ok",
                data: {
                    states: Object.fromEntries(Object.keys(getRooms()).map(key=> [key, roomControllerInstances[key]] as const).map(([id, instance])=> [id, (
                        instance.disabled === false ? {
                            disabled: false,
                            id: instance.id,
                            name: instance.name,
                            icon: instance.icon
                        } : {
                            disabled: true,
                            error: instance.disabled,
                            id: instance.id,
                            name: instance.name,
                            icon: instance.icon
                        }
                    )]))
                }
            };

        case 'devices.getDeviceStates': {
            const err= checkType(req, HMApi_Types.requests["devices.getDeviceStates"]);
            if(err) { return { type: "error", error: err }; }

            if(!(req.roomId in roomControllerInstances)) {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND",
                        object: 'room'
                    }
                };
            }

            return getDeviceStates(req.roomId).then(states=> ({
                type: "ok",
                data: { states }
            }));
        }

        case 'devices.toggleDeviceMainToggle': {
            const err= checkType(req, HMApi_Types.requests["devices.toggleDeviceMainToggle"]);
            if(err) { return { type: "error", error: err }; }

            if(!(req.roomId in roomControllerInstances)) {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND",
                        object: 'room'
                    }
                };
            }

            const roomController = roomControllerInstances[req.roomId];
            if(roomController.disabled) {
                return {
                    type: "error",
                    error: {
                        code: 500,
                        message: "ROOM_DISABLED",
                        error: roomController.disabled
                    }
                };
            }
            if(!(req.id in roomController.devices)) {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND",
                        object: 'device'
                    }
                };
            }

            const device = roomController.devices[req.id];
            if(device.disabled) {
                return {
                    type: "error",
                    error: {
                        code: 500,
                        message: "DEVICE_DISABLED",
                        error: device.disabled
                    }
                };
            }
            const deviceType = getDeviceTypes(roomController.type)[device.type];
            if(!deviceType.hasMainToggle) {
                return {
                    type: "error",
                    error: {
                        code: 400,
                        message: "NO_MAIN_TOGGLE"
                    }
                };
            }

            return device.toggleMainToggle().then(()=> {
                return {
                    type: "ok",
                    data: { }
                };
            });
        }

        case 'devices.getFavoriteDeviceStates': 
            return getFavoriteDeviceStates().then(states=> ({
                type: "ok",
                data: { states }
            }));

        case 'devices.toggleDeviceIsFavorite': {
            const err= checkType(req, HMApi_Types.requests["devices.toggleDeviceIsFavorite"]);
            if(err) { return { type: "error", error: err }; }

            const res = toggleDeviceIsFavorite(req.roomId, req.id, req.isFavorite);
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
            if(res === 'device_not_found') {
                return {
                    type: "error",
                    error: {
                        code: 404,
                        message: "NOT_FOUND",
                        object: "device"
                    }
                };
            }
            return {
                type: "ok",
                data: { }
            };
        }
            
        case 'devices.interactions.sendAction': {
            const err = checkType(req, HMApi_Types.requests["devices.interactions.sendAction"]);
            if (err) { return { type: "error", error: err }; }
            
            const res = sendDeviceInteractionAction(req.roomId, req.deviceId, req.interactionId, req.action);
            if (res instanceof Promise) {
                return res.then(() => ({ type: "ok", data: {} }));
            } else {
                switch (res) {
                    case 'room_not_found':
                        return { type: "error", error: { code: 404, message: "NOT_FOUND", object: "room" } };
                    case 'device_not_found':
                        return { type: "error", error: { code: 404, message: "NOT_FOUND", object: "device" } };
                    case 'interaction_not_found':
                        return { type: "error", error: { code: 404, message: "NOT_FOUND", object: "interaction" } };
                    case 'room_disabled':
                        return { type: "error", error: { code: 500, message: "ROOM_DISABLED", error: roomControllerInstances[req.roomId].disabled as string } };
                    case 'device_disabled':
                        return { type: "error", error: { code: 500, message: "DEVICE_DISABLED", error: roomControllerInstances[req.roomId].devices[req.deviceId].disabled as string } };
                    case 'invalid_action':
                        return { type: "error", error: { code: 404, message: "NOT_FOUND", object: "action" } };
                    case 'value_out_of_range':
                        return { type: "error", error: { code: 400, message: "PARAMETER_OUT_OF_RANGE", paramName: "action.value" } };
                }
            }
        }

        case 'plugins.getInstalledPlugins': {
            return getInstalledPluginsInfo().then(plugins => ({
                type: "ok",
                data: { plugins }
            }));
        }

        case 'plugins.togglePluginIsActivated': {
            return (async () => {
                if (!(await getInstalledPlugins()).includes(req.id)) {
                    return {
                        type: "error",
                        error: {
                            code: 404,
                            message: "NOT_FOUND",
                            object: "plugin"
                        }
                    };
                }

                setTimeout(() => {
                    togglePluginIsActivated(req.id, req.isActivated);
                }, 100);

                return {
                    type: "ok",
                    data: {}
                };
            })();
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