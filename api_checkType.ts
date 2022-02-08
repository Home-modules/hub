import { HMApi } from "./api.js";

// This file contains the algorithm to compare an object to a schema (with a custom format)
// It also has the schemas for types in [HMApi](./api.js)
// It looks like I reinvented the wheel, but TypeScript doesn't support dynamic type checking.

export type ParamType = {
    type: 'any'
} | {
    type: 'exactValue'
    value: any
} | {
    type: 'string'
} | {
    type: 'number'
} | {
    type: 'boolean'
} | {
    type: 'object',
    properties: {
        [key: string]: ParamType
    }
} | {
    type: 'array',
    items: ParamType
} | {
    type: 'tuple',
    items: ParamType[]
} | {
    type: 'union',
    types: ParamType[]
} | {
    type: 'lazyType',
    value: () => ParamType
};

/**
 * Checks if a value is of a certain type.
 * @param req The request object
 * @param type An object describing the type of the request (like a schema)
 * @param path An object path to prepend to keys in case of an error
 */
export function checkType(req: any, type: ParamType, path=""): HMApi.RequestError<HMApi.Request> | null {
    const invalidTypeError = (name=""): HMApi.RequestError<HMApi.Request> => ({
        code: 400,
        message: "INVALID_PARAMETER",
        paramName: [path,name].filter(Boolean).join('.') as keyof HMApi.Request
    });
    switch(type.type) {
        case 'any':
            return null;

        case 'exactValue':
            if(req !== type.value) {
                return invalidTypeError();
            }
            break;

        case 'string':
            if(typeof req !== 'string') {
                return invalidTypeError();
            }
            break;

        case 'number':
            if(typeof req !== 'number') {
                return invalidTypeError();
            }
            break;

        case 'boolean':
            if(typeof req !== 'boolean') {
                return invalidTypeError();
            }
            break;

        case 'object': {
            const missingProps= [];
            for (const key in type.properties) {
                // Check for missing properties
                if (!(key in req)) {
                    missingProps.push([path, String(key)].filter(Boolean).join('.'));
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
                return invalidTypeError();
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
                return invalidTypeError();
            }
            if (req.length !== type.items.length) {
                return invalidTypeError('<length>');
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
            return invalidTypeError();
        }

        case 'lazyType': {
            const subType = type.value();
            return checkType(req, subType, path);
        }
    }
    return null;
}

export const HMApi_Types: {
    requests: Record<HMApi.Request['type'], ParamType>
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
        }
    },
};

