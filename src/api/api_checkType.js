import semver from 'semver';
import { authorRegex } from "../misc.js";
/**
 * Checks if a value is of a certain type.
 * @param req The request object
 * @param type An object describing the type of the request (like a schema)
 * @param path An object path to prepend to keys in case of an error
 */
export function checkType(req, type, path = "") {
    var _a;
    function invalidParamError(name = "", message = "INVALID_PARAMETER") {
        return {
            code: 400,
            message,
            paramName: [path, name].filter(Boolean).join('.')
        };
    }
    switch (type.type) {
        case 'any':
            return null;
        case 'never':
            return invalidParamError();
        case 'exactValue':
            if (req !== type.value) {
                return invalidParamError();
            }
            break;
        case 'string':
            if (typeof req !== 'string' || ((_a = type.customCheck) === null || _a === void 0 ? void 0 : _a.call(type, req)) === false) {
                return invalidParamError();
            }
            if ((type.minLength && req.length < type.minLength) || (type.maxLength && req.length > type.maxLength)) {
                return invalidParamError("", "PARAMETER_OUT_OF_RANGE");
            }
            break;
        case 'number':
            if (typeof req !== 'number') {
                return invalidParamError();
            }
            if ((type.min && req < type.min) || (type.max && req > type.max)) {
                return invalidParamError("", "PARAMETER_OUT_OF_RANGE");
            }
            break;
        case 'boolean':
            if (typeof req !== 'boolean') {
                return invalidParamError();
            }
            break;
        case 'object': {
            if ((!req) || typeof req !== 'object') {
                return invalidParamError();
            }
            const missingProps = [];
            for (const key in type.properties) {
                const fType = type.properties[key];
                if (fType === undefined)
                    continue;
                // Check for missing properties
                if ((!(key in req))) {
                    if (!fType.optional) {
                        missingProps.push([path, String(key)].filter(Boolean).join('.'));
                    }
                    continue;
                }
                const err = checkType(req[key], fType, [path, String(key)].filter(Boolean).join('.'));
                if (err) {
                    return err;
                }
            }
            if (missingProps.length) {
                return {
                    code: 400,
                    message: "MISSING_PARAMETER",
                    missingParameters: missingProps,
                };
            }
            break;
        }
        case 'array': {
            if (!Array.isArray(req)) {
                return invalidParamError();
            }
            if ((type.minItems && req.length < type.minItems) || (type.maxItems && req.length > type.maxItems)) {
                return invalidParamError("", "PARAMETER_OUT_OF_RANGE");
            }
            for (let i = 0; i < req.length; i++) {
                const err = checkType(req[i], type.items, [path, String(i)].filter(Boolean).join('.'));
                if (err) {
                    return err;
                }
            }
            break;
        }
        case 'tuple': {
            if (!Array.isArray(req)) {
                return invalidParamError();
            }
            if (req.length !== type.items.length) {
                return invalidParamError('length');
            }
            for (let i = 0; i < req.length; i++) {
                const err = checkType(req[i], type.items[i], [path, String(i)].filter(Boolean).join('.'));
                if (err) {
                    return err;
                }
            }
            break;
        }
        case 'union': {
            for (const subType of type.types) {
                if (subType.type === 'never') {
                    continue;
                }
                const err = checkType(req, subType, path);
                if (!err) {
                    return null;
                }
            }
            return invalidParamError();
        }
        case 'lazyType': {
            const subType = type.value();
            return checkType(req, subType, path);
        }
        case 'merged': {
            let err = null;
            for (const subType of type.types) {
                err = checkType(req, subType, path);
                if (!err) {
                    return null;
                }
            }
            return err;
        }
        case 'record': {
            let err = null;
            if (typeof req !== 'object') {
                return invalidParamError();
            }
            if (type.keys) {
                for (const key in req) {
                    const err = checkType(key, type.keys, `${path}[${key}]`);
                    if (err) {
                        return err;
                    }
                }
            }
            for (const [key, value] of Object.entries(req)) {
                err = checkType(value, type.values, [path, String(key)].filter(Boolean).join('.'));
                if (err) {
                    return err;
                }
            }
        }
    }
    return null;
}
export const HMApi_Types = {
    requests: {
        "empty": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "empty" }
            }
        },
        "getVersion": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "getVersion" }
            }
        },
        "restart": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "restart" }
            }
        },
        "account.login": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.login" },
                "username": { type: "string" },
                "password": { type: "string" },
                "device": { type: "string", minLength: 1 }
            }
        },
        "account.logout": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.logout" }
            }
        },
        "account.logoutOtherSessions": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.logoutOtherSessions" }
            }
        },
        "account.getSessionsCount": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.getSessionsCount" }
            }
        },
        "account.getSessions": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.getSessions" }
            }
        },
        "account.logoutSession": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.logoutSession" },
                "id": { type: "string" }
            }
        },
        "account.changePassword": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.changePassword" },
                "oldPassword": { type: "string" },
                "newPassword": { type: "string" }
            }
        },
        "account.changeUsername": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.changeUsername" },
                "username": { type: "string" }
            }
        },
        "account.checkUsernameAvailable": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.checkUsernameAvailable" },
                "username": { type: "string" }
            }
        },
        "rooms.getRooms": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.getRooms" }
            }
        },
        "rooms.editRoom": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.editRoom" },
                "room": {
                    type: "lazyType",
                    value: () => HMApi_Types.objects.Room
                }
            }
        },
        "rooms.addRoom": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.addRoom" },
                "room": {
                    type: "lazyType",
                    value: () => HMApi_Types.objects.Room
                }
            }
        },
        "rooms.removeRoom": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.removeRoom" },
                "id": { type: "string" }
            }
        },
        "rooms.changeRoomOrder": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.changeRoomOrder" },
                "ids": {
                    type: "array",
                    items: { type: "string" }
                }
            }
        },
        "rooms.restartRoom": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.restartRoom" },
                "id": { type: "string" }
            }
        },
        "rooms.controllers.getRoomControllerTypes": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.controllers.getRoomControllerTypes" }
            }
        },
        "plugins.fields.getSelectLazyLoadItems": {
            type: "union",
            types: [
                {
                    type: "object",
                    properties: {
                        "type": { type: "exactValue", value: "plugins.fields.getSelectLazyLoadItems" },
                        "for": { type: "exactValue", value: "roomController" },
                        "controller": { type: "string" },
                        "field": { type: "string" }
                    }
                },
                {
                    type: "object",
                    properties: {
                        "type": { type: "exactValue", value: "plugins.fields.getSelectLazyLoadItems" },
                        "for": { type: "exactValue", value: "device" },
                        "controller": { type: "string" },
                        "deviceType": { type: "string" },
                        "field": { type: "string" }
                    }
                }
            ]
        },
        "devices.getDevices": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.getDevices" },
                "roomId": { type: "string" }
            }
        },
        "devices.getDeviceTypes": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.getDeviceTypes" },
                "controllerType": { type: "string" }
            }
        },
        "devices.addDevice": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.addDevice" },
                "roomId": { type: "string" },
                "device": {
                    type: "lazyType",
                    value: () => HMApi_Types.objects.Device
                }
            }
        },
        "devices.editDevice": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.editDevice" },
                "roomId": { type: "string" },
                "device": {
                    type: "lazyType",
                    value: () => HMApi_Types.objects.Device
                }
            }
        },
        "devices.removeDevice": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.removeDevice" },
                "roomId": { type: "string" },
                "id": { type: "string" }
            }
        },
        "devices.changeDeviceOrder": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.changeDeviceOrder" },
                "roomId": { type: "string" },
                "ids": {
                    type: "array",
                    items: { type: "string" }
                }
            }
        },
        "devices.restartDevice": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.restartDevice" },
                "roomId": { type: "string" },
                "id": { type: "string" }
            }
        },
        "rooms.getRoomStates": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "rooms.getRoomStates" }
            }
        },
        "devices.getDeviceStates": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.getDeviceStates" },
                "roomId": { type: "string" }
            }
        },
        "devices.toggleDeviceMainToggle": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.toggleDeviceMainToggle" },
                "roomId": { type: "string" },
                "id": { type: "string" }
            }
        },
        "devices.getFavoriteDeviceStates": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.getFavoriteDeviceStates" }
            }
        },
        "devices.toggleDeviceIsFavorite": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.toggleDeviceIsFavorite" },
                "roomId": { type: "string" },
                "id": { type: "string" },
                "isFavorite": { type: "boolean" }
            }
        },
        "devices.interactions.sendAction": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "devices.interactions.sendAction" },
                "roomId": { type: "string" },
                "deviceId": { type: "string" },
                "interactionId": { type: "string" },
                "action": { type: "lazyType", value: () => HMApi_Types.objects.DeviceInteractionAction }
            }
        },
        "plugins.getInstalledPlugins": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "plugins.getInstalledPlugins" }
            }
        },
        "plugins.togglePluginIsActivated": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "plugins.togglePluginIsActivated" },
                "id": { type: "string" },
                "isActivated": { type: "boolean" }
            }
        }
    },
    objects: {
        Room: {
            type: "object",
            properties: {
                "id": { type: "string", minLength: 1, maxLength: 255 },
                "name": { type: "string", minLength: 1, maxLength: 255 },
                "icon": {
                    type: "union",
                    types: [
                        { type: "exactValue", value: "living-room" },
                        { type: "exactValue", value: "kitchen" },
                        { type: "exactValue", value: "bedroom" },
                        { type: "exactValue", value: "bathroom" },
                        { type: "exactValue", value: "other" }
                    ]
                },
                "controllerType": {
                    type: "lazyType",
                    value: () => HMApi_Types.objects.RoomController
                }
            }
        },
        RoomController: {
            type: "object",
            properties: {
                'type': { type: 'string' },
                'settings': {
                    'type': 'record',
                    keys: { type: 'string' },
                    values: {
                        type: 'union',
                        types: [
                            { type: 'string' },
                            { type: 'number' },
                            { type: 'boolean' },
                        ]
                    }
                }
            }
        },
        Device: {
            type: 'object',
            properties: {
                'id': { type: 'string' },
                'name': { type: 'string' },
                'type': { type: 'string' },
                'params': {
                    'type': 'record',
                    keys: { type: 'string' },
                    values: {
                        type: 'union',
                        types: [
                            { type: 'string' },
                            { type: 'number' },
                            { type: 'boolean' },
                        ]
                    }
                }
            }
        },
        DeviceInteractionAction: {
            type: 'union',
            types: [
                {
                    type: 'object',
                    properties: {
                        'type': { type: 'exactValue', value: 'setSliderValue' },
                        'value': { type: 'number' }
                    }
                },
                {
                    type: 'object',
                    properties: {
                        'type': { type: 'exactValue', value: 'clickButton' },
                    }
                },
                {
                    type: 'object',
                    properties: {
                        'type': { type: 'exactValue', value: 'toggleToggleButton' },
                        'value': { type: 'boolean' }
                    }
                },
                {
                    type: 'object',
                    properties: {
                        'type': { type: 'exactValue', value: 'setTwoButtonNumberValue' },
                        'value': { type: 'number' }
                    }
                },
                {
                    type: 'object',
                    properties: {
                        'type': { type: 'exactValue', value: 'setSliderValue' },
                        'value': { type: 'number' }
                    }
                },
                {
                    type: 'object',
                    properties: {
                        'type': { type: 'exactValue', value: 'setUIColorInputValue' },
                        'color': { type: 'lazyType', value: () => HMApi_Types.objects.UIColor(true) }
                    }
                },
            ]
        },
        DeviceInteractionActionsPerInteraction: {
            "slider": ["setSliderValue"],
            "button": ["clickButton"],
            "label": [],
            "toggleButton": ["toggleToggleButton"],
            "twoButtonNumber": ["setTwoButtonNumberValue"],
            "uiColorInput": ["setUIColorInputValue"]
        },
        UIColor(white = false) {
            const colors = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"];
            if (white)
                colors.push("white");
            return {
                type: "union",
                types: colors.map(color => ({
                    type: "exactValue", value: color
                }))
            };
        },
        PluginInfoFile: {
            type: "object",
            properties: {
                "name": { type: "string" },
                "version": {
                    type: "string",
                    customCheck(string) {
                        return !!semver.valid(string);
                    },
                },
                "title": { type: "string" },
                "description": { optional: true, type: "string" },
                "tags": { optional: true, type: "array", items: { type: "string" } },
                "main": { optional: true, type: "string", customCheck: path => path.endsWith('.js') || path.endsWith('.ts') },
                "author": {
                    optional: true,
                    type: 'union',
                    types: [
                        { type: "string", customCheck: authorRegex.test.bind(authorRegex) },
                        {
                            type: "object", properties: {
                                "name": { type: 'string' },
                                "author": { type: 'string', optional: true }
                            }
                        }
                    ]
                },
                "homepage": {
                    optional: true,
                    type: "string",
                    customCheck(string) {
                        try {
                            new URL(string);
                            return true;
                        }
                        catch (_a) {
                            return false;
                        }
                    },
                },
                "compatibleWithHub": {
                    type: "string",
                    customCheck(string) {
                        return !!semver.validRange(string);
                    },
                }
            }
        }
    }
};
