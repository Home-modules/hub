import { HMApi } from "./api.js";

// This file contains the algorithm to compare an object to a schema (with a custom format)
// It also has the schemas for types in [HMApi](./api.js)
// It looks like I reinvented the wheel, but TypeScript doesn't support dynamic type checking.

export type ParamType = {
    type: 'any' // Any value / type is valid
} | {
    type: 'exactValue' // The value must be exactly as specified
    value: any
} | {
    type: 'string', // The value must be a string
    minLength?: number, // The minimum length of the string
    maxLength?: number, // The maximum length of the string
} | {
    type: 'number', // The value must be a number
    min?: number, // The minimum value of the number
    max?: number, // The maximum value of the number
} | {
    type: 'boolean' // The value must be a boolean (true/false)
} | {
    type: 'object', // The value must be an object with the specified properties
    properties: {
        [key: string]: ParamType & {optional?: boolean} // Optional properties' types will be checked but not their existence
    }
} | {
    type: 'array', // The value must be an array of the specified type
    items: ParamType,
    minItems?: number, // The minimum number of items in the array
    maxItems?: number, // The maximum number of items in the array
} | {
    type: 'tuple', // The value must be an array of a fixed length with the specified element types
    items: ParamType[]
} | {
    type: 'union', // The value must be one of the specified types
    types: ParamType[]
} | {
    type: 'lazyType', // A function will be called to get the type, useful for types that depend on other types (objects cannot reference their own properties while being defined)
    value: () => ParamType
};

/**
 * Checks if a value is of a certain type.
 * @param req The request object
 * @param type An object describing the type of the request (like a schema)
 * @param path An object path to prepend to keys in case of an error
 */
export function checkType(req: any, type: ParamType, path=""): HMApi.RequestError<HMApi.Request> | null {
    function invalidParamError(name="", message: "INVALID_PARAMETER"|"PARAMETER_OUT_OF_RANGE" ="INVALID_PARAMETER"): HMApi.RequestError<HMApi.Request> {
        return {
            code: 400,
            message,
            paramName: [path,name].filter(Boolean).join('.') as keyof HMApi.Request
        };
    }
    switch(type.type) {
        case 'any':
            return null;

        case 'exactValue':
            if(req !== type.value) {
                return invalidParamError();
            }
            break;

        case 'string':
            if(typeof req !== 'string') {
                return invalidParamError();
            }
            if((type.minLength && req.length < type.minLength) || (type.maxLength && req.length > type.maxLength)) {
                return invalidParamError("", "PARAMETER_OUT_OF_RANGE");
            }
            break;

        case 'number':
            if(typeof req !== 'number') {
                return invalidParamError();
            }
            if((type.min && req < type.min) || (type.max && req > type.max)) {
                return invalidParamError("", "PARAMETER_OUT_OF_RANGE");
            }
            break;

        case 'boolean':
            if(typeof req !== 'boolean') {
                return invalidParamError();
            }
            break;

        case 'object': {
            const missingProps= [];
            for (const key in type.properties) {
                // Check for missing properties
                if ((!(key in req))) {
                    if(!type.properties[key].optional) {
                        missingProps.push([path, String(key)].filter(Boolean).join('.'));
                    }
                    continue;
                }
                const err = checkType(req[key], type.properties[key], [path, String(key)].filter(Boolean).join('.'));
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
    }
    return null;
}

export const HMApi_Types: {
    requests: Record<HMApi.Request['type'], ParamType>,
    objects: {
        Room: ParamType,
        RoomControllerTypeStandardSerial: ParamType,
    }
} = { 
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
        "account.login": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "account.login" },
                "username": { type: "string" },
                "password": { type: "string" }
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
        "io.getSerialPorts": {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "io.getSerialPorts" }
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
                    value: () => HMApi_Types.objects.RoomControllerTypeStandardSerial
                }
            } 
        },
        RoomControllerTypeStandardSerial: {
            type: "object",
            properties: {
                "type": { type: "exactValue", value: "standard-serial" },
                "port": { type: "string", minLength: 3, maxLength: 255 },
                "baudRate": { type: "number", optional: true, min: 300, max: 2_000_000 },
            }
        }
    }
};

