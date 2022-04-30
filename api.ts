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
        /** The new password to be set. The app must have a second 'confirm password' field. An error will NOT be returned if new password is the same as the current password. */
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

    /**
     * Edits the properties of a room.
     * All properties except ID can be changed.
     * If the property `controllerType` is changed, the room will be restarted. (all devices will be turned off, the connection to the controller will be dropped and the room will be initialized again)
     * @throws `ROOM_NOT_FOUND` if the room doesn't exist
     */
    export type RequestEditRoom = {
        type: "rooms.editRoom",
        /** The modified room. The room to edit will be determined from the `id` property. */
        room: Room
    }

    /**
     * Adds a new room to the house.
     */
    export type RequestAddRoom = {
        type: "rooms.addRoom",
        /** The new room to add. */
        room: Room
    }

    /**
     * Shuts down and removes a room from the house.
     * @throws `NOT_FOUND` if the room doesn't exist
     */
    export type RequestRemoveRoom = {
        type: "rooms.removeRoom",
        /** Room ID */
        id: string
    }

    /**
     * Changes the order of the rooms. The new ids must not have any new or deleted room IDs.
     * @throws `ROOMS_NOT_EQUAL` if the passed IDs have new or deleted room IDs.
     */
    export type RequestChangeRoomOrder = {
        type: "rooms.changeRoomOrder",
        /** The new order of the rooms. */
        ids: string[]
    }


    /**
     * Gets the available room controller types.
     */
    export type RequestGetRoomControllerTypes = {
        type: "rooms.controllers.getRoomControllerTypes"
    }

    /**
     * Gets the items of a lazy-loading dropdown. (for room controller and device options)
     */
    export type RequestGetSelectFieldLazyLoadItems = {
        type: "plugins.fields.getSelectLazyLoadItems",
        /** Whether the field is for a room controller or a device */
        for: "roomController",
        /** Room controller type */
        controller: string,
        /** Field name */
        field: string
    } | {
        type: "plugins.fields.getSelectLazyLoadItems",
        /** Whether the field is for a room controller or a device */
        for: "device",
        /** The controller type of the room in which the device is */
        controller: string,
        /** Device type */
        deviceType: string,
        /** Field name */
        field: string
    }

    /**
     * Gets the devices in a room.
     * @throws `NOT_FOUND` if the room doesn't exist
     */
    export type RequestGetDevices = {
        type: "devices.getDevices",
        /** Room ID */
        roomId: string
    }

    export type Request= RequestEmpty | RequestGetVersion | RequestLogin | RequestLogout | RequestLogoutOtherSessions | RequestGetSessionsCount | RequestChangePassword | RequestChangeUsername | RequestCheckUsernameAvailable | RequestGetRooms | RequestEditRoom | RequestAddRoom | RequestRemoveRoom | RequestChangeRoomOrder | RequestGetRoomControllerTypes | RequestGetSelectFieldLazyLoadItems | RequestGetDevices;


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

    export type ResponseGetRoomControllerTypes = {
        /** The available room controller types */
        types: RoomControllerType[]
    }

    export type ResponseSelectFieldItems = {
        /** The items of the dropdown */
        items: (SettingsFieldSelectOption | SettingsFieldSelectOptionGroup)[]
    }

    export type ResponseGetDevices = {
        /** The devices in the room */
        devices: Record<string, Device>
    }

    export type ResponseData<R extends Request> = 
        R extends RequestEmpty ? ResponseEmpty :
        R extends RequestGetVersion ? ResponseGetVersion :
        R extends RequestLogin ? ResponseLogin :
        R extends RequestLogout ? ResponseEmpty :
        R extends RequestLogoutOtherSessions ? ResponseSessionCount :
        R extends RequestGetSessionsCount ? ResponseSessionCount :
        R extends RequestChangePassword ? ResponseEmpty :
        R extends RequestChangeUsername ? ResponseLogin :
        R extends RequestCheckUsernameAvailable ? ResponseCheckUsernameAvailable :
        R extends RequestGetRooms ? ResponseGetRooms :
        R extends RequestEditRoom ? ResponseEmpty :
        R extends RequestAddRoom ? ResponseEmpty :
        R extends RequestRemoveRoom ? ResponseEmpty :
        R extends RequestChangeRoomOrder ? ResponseEmpty :
        R extends RequestGetRoomControllerTypes ? ResponseGetRoomControllerTypes :
        R extends RequestGetSelectFieldLazyLoadItems ? ResponseSelectFieldItems :
        R extends RequestGetDevices ? ResponseGetDevices :
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
     * The requested item/resource was not found.
     */
    export type RequestErrorNotFound = {
        code: 404,
        message: "NOT_FOUND"
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

    /**
     * A room with the same ID already exists.
     */
    export type RequestErrorRoomAlreadyExists = {
        code: 400,
        message: "ROOM_ALREADY_EXISTS"
    };

    /**
     * The passed room IDs have new or deleted room IDs.
     */
    export type RequestErrorRoomsNotEqual = {
        code: 400,
        message: "ROOMS_NOT_EQUAL"
    };

    /**
     * The settings field is not a lazy-loading dropdown.
     */
    export type RequestErrorFieldNotLazySelect = {
        code: 400,
        message: "FIELD_NOT_LAZY_SELECT"
    }

    /**
     * The plugin returned an error for the request
     */
    export type RequestErrorPluginCustomError = {
        code: 400,
        message: "CUSTOM_PLUGIN_ERROR",
        params: Record<string, string>
    }

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
        R extends RequestEditRoom ? RequestErrorNotFound :
        R extends RequestAddRoom ? RequestErrorRoomAlreadyExists :
        R extends RequestRemoveRoom ? RequestErrorNotFound :
        R extends RequestChangeRoomOrder ? RequestErrorRoomsNotEqual :
        R extends RequestGetRoomControllerTypes ? never :
        R extends RequestGetSelectFieldLazyLoadItems ? RequestErrorNotFound | RequestErrorFieldNotLazySelect | RequestErrorPluginCustomError :
        R extends RequestGetDevices ? RequestErrorNotFound :
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
        /** Room controller type and mode */
        controllerType: RoomController,
    }

    /**
     * A room controller type definition
     */
    export type RoomControllerType = ({
        /** The room controller id */
        id: `${string}:${string}`,
        /** The room controller name */
        name: string,
        /** The room controller sub-name (aka mode) */
        sub_name: string
    }) & {
        /** Settings fields */
        settings: SettingsField[]
    }

    /**
     * A room controller type and mode along with its configuration
     */
    export type RoomController = {
        /** The room controller type and mode (id of its type) */
        type: string,
        /** Settings for the controller */
        settings: Record<string, string|number|boolean>
    }
    
    export type DeviceType = {
        id: `${string}:${string}`,
        name: string,
        sub_name: string
    };

    export type Device = {
        /** The device ID */
        id: string,
        /** The device name */
        name: string,
        /** The device type */
        type: string,
        /** The device parameters */
        params: {
            [key: string]: string|number|boolean,
        },
    }

    type SettingsFieldGeneralProps<T>= {
        /** Field ID */
        id: string,
        /** Field label */
        label: string,
        /** Field description */
        description?: string,
        /** The default value for the field */
        default?: T,
        /** True if the field is required */
        required?: boolean,
    }

    export type SettingsFieldText = SettingsFieldGeneralProps<string> & {
        type: 'text',
        /** Field placeholder */
        placeholder?: string,
        /** Minimum number of characters in the field. */
        min_length?: number,
        /** Maximum number of characters in the field. */
        max_length?: number,
        /** Error message to show when the value is too short. */
        min_length_error?: string,
        /** Error message to show when the value is too long. */
        max_length_error?: string,
        /** A text to show after the value (e.g. unit of measurement) */
        postfix?: string,
    }

    export type SettingsFieldNumber = SettingsFieldGeneralProps<number> & {
        type: 'number',
        /** Field placeholder */
        placeholder?: string,
        /** Minimum value */
        min?: number,
        /** Maximum value */
        max?: number,
        /** Error message to show when the value is too small. */
        min_error?: string,
        /** Error message to show when the value is too large. */
        max_error?: string,
        /** A text to show after the value (e.g. unit of measurement) */
        postfix?: string,
        /** Whether to show the arrows/spinners and allow scrolling and using up and down arrow buttons to change value. Enabled by default */
        scrollable?: boolean,
    }

    export type SettingsFieldCheckbox = SettingsFieldGeneralProps<boolean> & {
        type: 'checkbox',
        /** If provided, the description will change to this value when the field is checked. */
        description_on_true?: string
    }

    export type SettingsFieldRadio = Omit<SettingsFieldGeneralProps<string>, 'label'> & {
        type: 'radio',
        /** THe list of radio buttons */
        options: Record<string, {
            /** Option label */
            label: string,
            /** Option description. Not recommended if the radio group has a label and/or description. Ignored if direction is horizontal */
            description?: string,
        }>,
        /** The preferred orientation of the radio buttons. 'h' means they will be on the same line and 'v' means they will be on different lines. */
        direction: 'h'|'v',
        /** Label before the radio buttons */
        label?: string
    }

    export type SettingsFieldSelect = SettingsFieldGeneralProps<string> & {
        type: 'select',
        /** The list of options */
        options: (SettingsFieldSelectOption|SettingsFieldSelectOptionGroup)[] | SettingsFieldSelectLazyOptions,
        /** Whether the user can fill in the value instead of selecting an item. The field will show the value of the active option instead of its label+subtext. */
        allowCustomValue?: boolean,
        /** Whether the custom value should be checked to be in the items. Ignored if allowCustomValue is false */
        checkCustomValue?: boolean,
        /** A search bar will be shown in the dropdown if true. A number can instead be provided which will be the minimum number of total options for the search bar to be shown. */
        showSearchBar?: boolean | number,
    }

    export type SettingsFieldSelectOption = {
        isGroup?: false,
        /** The value of the dropdown when this option is selected */
        value: string,
        /** Option label */
        label: string,
        /** Smaller/lighter text to be shown alongside the label. Might be shown in parentheses if proper rendering isn't possible. */
        subtext?: string,
    }

    export type SettingsFieldSelectOptionGroup = {
        isGroup: true,
        /** Group label */
        label: string,
        /** Smaller/lighter text to be shown alongside the label. Might be shown in parentheses if proper rendering isn't possible. */
        subtext?: string,
        /** Whether to expand or collapse the group when the dropdown is shown. Might be ignored if not supported. */
        expanded?: boolean,
        /** The list of options in the group */
        children: SettingsFieldSelectOption[],
    }

    export type SettingsFieldSelectLazyOptions = {
        isLazy: true;
        /** The fallback texts to use instead of the default ones */
        fallbackTexts?: {
            /** The text to show when the list is loading */
            whenLoading?: string;
            /** The text to show when the list is empty */
            whenEmpty?: string;
            /** The text to show if the list cannot be loaded (request failure) */
            whenError?: string;
        }
        /** 
         * When to load the items: 
         * - When the field is rendered
         * - When the dropdown is opened (Warning: dropdown button will show the value of the active item instead of its label+subtext before the list is loaded, so it is recommended to only use this mode when values == labels.)
         */
        loadOn: 'render'|'open',
        /** Whether to refresh every time the dropdown is opened (default is true) */
        refreshOnOpen?: boolean,
        /** 
         * Whether to show a manual refresh button in the dropdown. The button is always hidden while loading the list. (default is false)
         * Can be a(n):
         * - boolean: true to show the button (controls all states)
         * - object: Control each state and set a custom text
         * - array (2 items): First item (boolean) controls the visibility, second item (string) controls the button text
         */
        showRefreshButton?: boolean | {
            /** Whether to show the button when the list is loaded and not empty */
            whenNormal?: boolean,
            /** Whether to show the button when the list is empty */
            whenEmpty?: boolean,
            /** Whether to show the button when the list cannot be loaded */
            whenError?: boolean,
            /** Whether to show the button when loading the list. The button will be disabled in this state and only shown to prevent UI flashes. */
            whenLoading?: boolean,
            /** Refresh button text (default: "Refresh" (normal, empty) or "Refreshing" (loading) or "Retry" (error)) */
            buttonText?: string | {
                /** Default: "Refresh" */
                whenNormal?: string,
                /** Default: "Refresh" */
                whenEmpty?: string,
                /** Default: "Retry" */
                whenError?: string,
                /** Default: "Refresh" */
                whenLoading?: string,
            },
        } | [boolean, string | {
            /** Default: "Refresh" */
            whenNormal?: string,
            /** Default: "Refresh" */
            whenEmpty?: string,
            /** Default: "Retry" */
            whenError?: string,
            /** Default: "Refresh" */
            whenLoading?: string,
        }],
    };

    export type SettingsFieldSlider = SettingsFieldGeneralProps<number> & {
        type: 'slider',
        /** The minimum value */
        min?: number,
        /** The maximum value */
        max?: number,
        /** The step size */
        step?: number,
        /** The slider color (useful for color fields) */
        color?: 'white'|'black'|'blue'|'green'|'red'|'yellow',
        /** Slider appearance (horizontal/vertical/radial) */
        appearance?: 'horizontal'|'vertical'|'radial',
    }

    export type SettingsFieldHorizontalWrapper = {
        type: 'horizontal_wrapper',
        /** The columns */
        columns: SettingsFieldHorizontalWrapperColumn[],
    }

    export type SettingsFieldHorizontalWrapperColumn = {
        /** The fields in the column */
        fields: SettingsField[],
        /** 
         * The width of the column. 
         * The total width of all columns is mapped to the wrapper's width. 
         * If not specified, the width will be automatically determined by the content. 
         * You can set the width to 1 while the other columns have auto width to fill the remaining space.
         */
        width?: number,
    }

    export type SettingsFieldContainer = {
        type: 'container',
        /** Container label (aka 'legend') */
        label: string,
        /** The list of fields */
        children: SettingsField[],
    }

    export type SettingsField = SettingsFieldText | SettingsFieldNumber | SettingsFieldCheckbox | SettingsFieldRadio | SettingsFieldSelect | SettingsFieldHorizontalWrapper | SettingsFieldContainer;
    export type SettingsFieldWithoutContainer = Exclude<HMApi.SettingsField, SettingsFieldContainer | SettingsFieldHorizontalWrapper>
}