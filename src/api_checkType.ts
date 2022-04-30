import { HMApi } from "./api.js";

// This file contains the algorithm to compare an object to a schema (with a custom format)
// It also has the schemas for types in [HMApi](./api.js)
// It looks like I reinvented the wheel, but TypeScript doesn't support dynamic type checking.

/** Any value / type is valid */
export type ParamTypeAny = {
    type: 'any'
};
/** All values are invalid (will be skipped on unions) */
export type ParamTypeNever = {
    type: 'never'
};
/** The value must be exactly as specified */
export type ParamTypeExactValue<T=unknown> = {
    type: 'exactValue'
    value: T
};
/** The value must be a string */
export type ParamTypeString = {
    type: 'string',
    minLength?: number, // The minimum length of the string
    maxLength?: number, // The maximum length of the string
};
/** The value must be a number */
export type ParamTypeNumber = {
    type: 'number',
    min?: number, // The minimum value of the number
    max?: number, // The maximum value of the number
};
/** The value must be a boolean (true/false) */
export type ParamTypeBoolean = {
    type: 'boolean'
};
/** The value must be an object with the specified properties */
export type ParamTypeObject = {
    type: 'object',
    properties: Record<string, (ParamType & {optional?: boolean}) | undefined> // Optional properties' types will be checked but not their existence
};
/** The value must be an array of the specified type */
export type ParamTypeArray = {
    type: 'array',
    items: ParamType,
    minItems?: number, // The minimum number of items in the array
    maxItems?: number, // The maximum number of items in the array
};
/** The value must be an array of a fixed length with the specified element types */
export type ParamTypeTuple = {
    type: 'tuple',
    items: ParamType[]
};
/** The value must conform to one of the specified types */
export type ParamTypeUnion<T extends ParamTypeNoUnion = ParamTypeNoUnion> = {
    type: 'union',
    types: T[]
};
/** A function will be called to get the type, useful for types that depend on other types (objects cannot reference their own properties while being defined) */
export type ParamTypeLazyType = {
    type: 'lazyType',
    value: () => ParamType
};
/** The value must be an object with the merged properties of the specified types */
export type ParamTypeMerged = {
    type: 'merged',
    types: (ParamTypeObject | ParamTypeUnion)[]
};
/** The value must be an object with the specified type of key and values */
export type ParamTypeRecord = {
    type: 'record',
    keys?: TOrUnion<ParamTypeString | ParamTypeExactValue<string>>,
    values: ParamType
}
type TOrUnion<T extends ParamTypeNoUnion> = T | ParamTypeUnion<T>

export type ParamType =
    ParamTypeAny |
    ParamTypeNever |
    ParamTypeExactValue |
    ParamTypeString |
    ParamTypeNumber |
    ParamTypeBoolean |
    ParamTypeObject |
    ParamTypeArray |
    ParamTypeTuple |
    ParamTypeUnion |
    ParamTypeLazyType |
    ParamTypeMerged |
    ParamTypeRecord;

export type ParamTypeNoUnion =
    ParamTypeAny |
    ParamTypeNever |
    ParamTypeExactValue |
    ParamTypeString |
    ParamTypeNumber |
    ParamTypeBoolean |
    ParamTypeObject |
    ParamTypeArray |
    ParamTypeTuple |
    ParamTypeLazyType |
    ParamTypeMerged |
    ParamTypeRecord;

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

        case 'never':
            return invalidParamError();

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
            if((!req) || typeof req !== 'object') {
                return invalidParamError();
            }
            const missingProps= [];
            for (const key in type.properties) {

                const fType= type.properties[key];
                if(fType === undefined) continue;

                // Check for missing properties
                if ((!(key in req))) {
                    if(!fType.optional) {
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
                if(subType.type==='never') {
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
            let err: ReturnType<typeof checkType> = null;
            for (const subType of type.types) {
                err = checkType(req, subType, path);
                if (!err) {
                    return null;
                }
            }
            return err;
        }

        case 'record': {
            let err: ReturnType<typeof checkType> = null;
            if(typeof req !== 'object') {
                return invalidParamError();
            }
            if(type.keys) {
                for(const key in req) {
                    const err = checkType(key, type.keys, `${path}[${key}]`);
                    if (err) {
                        return err;
                    }
                }
            }
            for(const [key, value] of Object.entries(req)) {
                err = checkType(value, type.values, [path, String(key)].filter(Boolean).join('.'));
                if (err) {
                    return err;
                }
            }
        }
    }
    return null;
}

export const HMApi_Types: {
    requests: Record<HMApi.Request['type'], ParamType>,
    objects: {
        Room: ParamType,
        RoomController: ParamType,
        Device: ParamType,
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
                'type': {type: 'string'},
                'settings': {
                    'type': 'record',
                    keys: {type: 'string'},
                    values: {
                        type: 'union',
                        types: [
                            {type: 'string'},
                            {type: 'number'},
                            {type: 'boolean'},
                        ]
                    }
                }
            }
        },
        Device: {
            type: 'object',
            properties: {
                'id': {type: 'string'},
                'name': {type: 'string'},
                'type': {type: 'string'},
                'params': {
                    'type': 'record',
                    keys: {type: 'string'},
                    values: {
                        type: 'union',
                        types: [
                            {type: 'string'},
                            {type: 'number'},
                            {type: 'boolean'},
                        ]
                    }
                }
            }
        }
    }
};

