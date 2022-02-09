import { Paths } from "./api-type-to-path-union.js";

export namespace HMApi {
    /** 
     * Just an empty request, useful as a heartbeat request 
     */
    export type RequestEmpty = {
        type: "empty"
    };

    /** 
     * Gets the hub software version. 
     */
    export type RequestGetVersion = {
        type: "getVersion"
    };

    /** 
     * Logs in to a hub account. 
     * A token is returned which must be passed to all future requests. 
     * (this is the only request that doesn't require an auth token, you can pass any value for it) 
     * @throws `LOGIN_USER_NOT_FOUND` if the user doesn't exist
     * @throws `LOGIN_PASSWORD_INCORRECT` if the password is incorrect
     */
    export type RequestLogin = {
        type: "account.login",
        /** The username. If it doesn't exist, the error LOGIN_USER_NOT_FOUND will be returned. */
        username: string,
        /** The password. If it is incorrect, the error LOGIN_PASSWORD_INCORRECT will be returned with a 1 second delay. */
        password: string
    };

    /** 
     * Logs out from the hub account. 
     * App state should be updated to show the login screen. 
     */
    export type RequestLogout = {
        type: "account.logout"
    };

    /** 
     * Terminates all sessions for this account except the one from which the request was made. 
     */
    export type RequestLogoutOtherSessions = {
        type: "account.logoutOtherSessions"
    };

    /** 
     * Counts the number of sessions for this account, including this one. 
     */
    export type RequestGetSessionsCount = {
        type: "account.getSessionsCount"
    }

    /** 
     * Changes the password of the current account. 
     * @throws LOGIN_PASSWORD_INCORRECT if the current password is incorrect.
     */
    export type RequestChangePassword = {
        type: "account.changePassword",
        /** The password currently in use in the account. If wrong, the error LOGIN_PASSWORD_INCORRECT will be returned with a 1 second delay. */
        oldPassword: string,
        /** The new password to be set. The app must have a second 'confirm password' field. An error will NOT be returned if new password is the same as the current pasword. */
        newPassword: string
    }

    /** 
     * Changes the username of the current account. 
     * A new token will be returned for future requests and the previous one will be invalidated. 
     * WARNING: This causes all other sessions to be logged out, because there is no way the new token can be sent to other sessions. 
     * @throws USERNAME_ALREADY_TAKEN if the username is already taken.
     * @throws USERNAME_TOO_SHORT if the username is shorter than 3 characters.
     */
    export type RequestChangeUsername = {
        type: "account.changeUsername",
        /** The new username. 
         * Should not be already taken or else the error USERNAME_ALREADY_TAKEN will be returned. 
         * Use `account.checkUsernameAvailable` to check if a username is available or taken.
         * Should be 3 or more characters, or else the error USERNAME_TOO_SHORT will be returned. */
        username: string
    }
    
    /** 
     * Checks if a username is available or already taken. 
     * Useful for changing username. 
     * Note: This does NOT check for too short usernames. You must check yourself. 
     */
    export type RequestCheckUsernameAvailable = {
        type: "account.checkUsernameAvailable",
        /** The username to check. */
        username: string
    }

    /** 
     * Gets the registered rooms in the house 
     */
    export type RequestGetRooms = {
        type: "rooms.getRooms",
    }

    export type Request= RequestEmpty | RequestGetVersion | RequestLogin | RequestLogout | RequestLogoutOtherSessions | RequestGetSessionsCount | RequestChangePassword | RequestChangeUsername | RequestCheckUsernameAvailable | RequestGetRooms;


    /** Nothing is returned */
    export type ResponseEmpty = Record<string, never>;

    export type ResponseGetVersion = {
        /** The hub software version */
        version: `${number}.${number}.${number}`
    };

    export type ResponseLogin = {
        /** A token to be used in future requests. */
        token: string
    };

    export type ResponseSessionCount = {
        /** The number of active sessions / terminated sessions */
        sessions: number
    };

    export type ResponseCheckUsernameAvailable = {
        /** False if the username is already taken, true otherwise. */
        available: boolean
    };

    export type ResponseGetRooms = {
        /** The rooms in the house */
        rooms: {[roomId: string]: Room}
    }

    export type ResponseData<R extends Request> = 
        R extends RequestEmpty ? ResponseEmpty :
        R extends RequestGetVersion ? ResponseGetVersion :
        R extends RequestLogin ? ResponseLogin :
        R extends RequestLogout ? ResponseEmpty :
        R extends RequestLogoutOtherSessions ? ResponseSessionCount :
        R extends RequestGetSessionsCount ? ResponseSessionCount :
        R extends RequestChangePassword ? ResponseEmpty :
        R extends RequestChangeUsername ? ResponseEmpty :
        R extends RequestCheckUsernameAvailable ? ResponseCheckUsernameAvailable :
        R extends RequestGetRooms ? ResponseGetRooms :
        never;


    /**
     * Auth token isn't valid or expired
     */
    export type RequestErrorTokenInvalid = {
        code: 401,
        message: "TOKEN_INVALID"
    };

    /**
     * The HTTP request is invalid: Wrong method, invalid URL, etc.
     */
    export type RequestErrorInvalidRequest = {
        code: 400,
        message: "INVALID_REQUEST"
    }

    /**
     * Request has malformed JSON
     */
    export type RequestErrorInvalidJSON = {
        code: 400,
        message: "INVALID_REQUEST_JSON"
    };

    /**
     * Request type is missing or invalid
     */
    export type RequestErrorInvalidRequestType = {
        code: 400,
        message: "INVALID_REQUEST_TYPE"
    };

    /**
     * Request is missing a required field
     */
    export type RequestErrorMissingParameter<R extends Request> = {
        code: 400,
        message: "MISSING_PARAMETER"
        missingParameters: Paths<R>[];
    };

    /**
     * Request has an invalid value for a field
     */
    export type RequestErrorInvalidParameter<R extends Request> = {
        code: 400,
        message: "INVALID_PARAMETER"
        paramName: Paths<R>;
    };

    /**
     * A number parameter is out of range, a string or array is too long or too short
     */
    export type RequestErrorParameterOutOfRange<R extends Request> = {
        code: 400,
        message: "PARAMETER_OUT_OF_RANGE"
        paramName: Paths<R>;
    };

    /**
     * An internal server error has occurred
     */
    export type RequestErrorInternalServerError = {
        code: 500,
        message: "INTERNAL_SERVER_ERROR"
    };

    /**
     * The user trying to be logged in to doesn't exists.
     */
    export type RequestErrorLoginUserNotFound = {
        code: 401,
        message: "LOGIN_USER_NOT_FOUND"
    };

    /**
     * The entered password was incorrect. This error has 1 second of delay to prevent brute force attacks.
     */
    export type RequestErrorLoginPasswordIncorrect = {
        code: 401,
        message: "LOGIN_PASSWORD_INCORRECT"
    };

    /**
     * Another account already has this username.
     */
    export type RequestErrorUsernameAlreadyTaken = {
        code: 400,
        message: "USERNAME_ALREADY_TAKEN"
    };

    /**
     * The username is too short. (i.e. less than 3 characters)
     */
    export type RequestErrorUsernameTooShort = {
        code: 400,
        message: "USERNAME_TOO_SHORT"
    };

    export type RequestError<R extends Request> = (
        R extends RequestEmpty ? never :
        R extends RequestGetVersion ? never :
        R extends RequestLogin ? RequestErrorLoginPasswordIncorrect | RequestErrorLoginUserNotFound :
        R extends RequestLogout ? never :
        R extends RequestLogoutOtherSessions ? never :
        R extends RequestGetSessionsCount ? never :
        R extends RequestChangePassword ? RequestErrorLoginPasswordIncorrect :
        R extends RequestChangeUsername ? RequestErrorUsernameAlreadyTaken | RequestErrorUsernameTooShort :
        R extends RequestCheckUsernameAvailable ? never :
        R extends RequestGetRooms ? never :
        never
    ) | (
        [R extends R ? keyof Omit<R, 'type'>: never ][0] extends never ? never : (RequestErrorMissingParameter<R> | RequestErrorInvalidParameter<R> | RequestErrorParameterOutOfRange<R>)
    ) | 
        RequestErrorInvalidRequest |
        RequestErrorInvalidJSON |
        RequestErrorInvalidRequestType |
        RequestErrorInternalServerError | (
        R extends RequestLogin ? never : RequestErrorTokenInvalid
    );


    export type Response<R extends Request> = {
        type: "ok",
        data: ResponseData<R>
    } | {
        type: "error",
        error: RequestError<R>
    };


    /**
     * Describes a room.
     */
    export type Room = {
        /** The room's ID, usually a more machine-friendly version of `name` */
        id: string,
        /** The room's name, e.g. "Living Room" */
        name: string,
        /** The icon to show for the room */
        icon: "living-room" | "kitchen" | "bedroom" | "bathroom" | "other",
        /** The method of communication to the room controller */
        communication: RoomControllerCommunicationSerial,
    }

    /**
     * Use a serial port to communicate with the room controller.
     * 
     * This method has a high cable length limit, but requires a separate port for each room and devices do not have enough ports most of the time.
     */
    export type RoomControllerCommunicationSerial = {
        type: "serial",
        /** The serial port to use */
        port: string,
        /** The baud rate to use. Default is 9600 */
        baudRate?: number,
        // /** The serial port's data bits */
        // dataBits?: 8 | 7 | 6 | 5,
        // /** The serial port's stop bits */
        // stopBits?: 1 | 2,
        // /** The serial port's parity */
        // parity?: "none" | "even" | "mark" | "odd" | "space"
    }
}