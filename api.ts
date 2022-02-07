export namespace HMApi {
    export type RequestEmpty = {
        type: "empty"
    };

    export type RequestGetVersion = {
        type: "getVersion"
    };

    export type RequestLogin = {
        type: "login",
        username: string,
        password: string
    };

    export type RequestLogout = {
        type: "logout"
    };

    export type RequestLogoutOtherSessions = {
        type: "logoutOtherSessions"
    };

    export type RequestGetSessionsCount = {
        type: "getSessionsCount"
    }

    export type Request= RequestEmpty | RequestGetVersion | RequestLogin | RequestLogout | RequestLogoutOtherSessions | RequestGetSessionsCount;


    export type ResponseEmpty = Record<string, never>;

    export type ResponseGetVersion = {
        version: `${number}.${number}.${number}`
    };

    export type ResponseLogin = {
        token: string
    };

    export type ResponseSessionCount = {
        sessions: number
    };

    export type ResponseData<R extends Request> = 
        R extends RequestEmpty ? ResponseEmpty :
        R extends RequestGetVersion ? ResponseGetVersion :
        R extends RequestLogin ? ResponseLogin :
        R extends RequestLogout ? ResponseEmpty :
        R extends RequestLogoutOtherSessions ? ResponseSessionCount :
        R extends RequestGetSessionsCount ? ResponseSessionCount :
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
        missingParameters: (keyof R)[];
    };

    /**
     * Request has an invalid value for a field
     */
    export type RequestErrorInvalidParameter<R extends Request> = {
        code: 400,
        message: "INVALID_PARAMETER"
        paramName: keyof R;
    };

    /**
     * An internal server error occurred
     */
    export type RequestErrorInternalServerError = {
        code: 500,
        message: "INTERNAL_SERVER_ERROR"
    };

    export type RequestErrorLoginUserNotFound = {
        code: 401,
        message: "LOGIN_USER_NOT_FOUND"
    };

    export type RequestErrorLoginPasswordIncorrect = {
        code: 401,
        message: "LOGIN_PASSWORD_INCORRECT"
    };

    export type RequestError<R extends Request> =
        RequestErrorTokenInvalid |
        RequestErrorInvalidRequest |
        RequestErrorInvalidJSON |
        RequestErrorInvalidRequestType |
        RequestErrorMissingParameter<R> |
        RequestErrorInvalidParameter<R> |
        RequestErrorInternalServerError |
        RequestErrorLoginUserNotFound |
        RequestErrorLoginPasswordIncorrect;

    export type Response<R extends Request> = {
        type: "ok",
        data: ResponseData<R>
    } | {
        type: "error",
        error: RequestError<R>
    };
}