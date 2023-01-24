import { Paths } from "./api-type-to-path-union.js";

export namespace HMApi {
    export namespace Request {
        /** 
         * Just an empty request, useful as a heartbeat request 
         */
        export type Empty = {
            type: "empty"
        };

        /** 
         * Gets the hub software version. 
         */
        export type GetVersion = {
            type: "getVersion"
        };

        /**
         * Restarts the hub (and as a result all rooms and devices).
         */
        export type Restart = {
            type: "restart";
        };

        /** 
         * Logs in to a hub account. 
         * A token is returned which must be passed to all future requests. 
         * (this is the only request that doesn't require an auth token, you can pass any value for it) 
         * ---
         * @throws `LOGIN_USER_NOT_FOUND` if the user doesn't exist
         * @throws `LOGIN_PASSWORD_INCORRECT` if the password is incorrect
         */
        export type Login = {
            type: "account.login",
            /** The username. If it doesn't exist, the error LOGIN_USER_NOT_FOUND will be returned. */
            username: string,
            /** The password. If it is incorrect, the error LOGIN_PASSWORD_INCORRECT will be returned with a 1 second delay. */
            password: string,
            /** Device info, should contain device info, OS info or browser info, whichever is applicable. Should not be empty. */
            device: string
        };

        /** 
         * Logs out from the hub account. 
         * App state should be updated to show the login screen. 
         */
        export type Logout = {
            type: "account.logout"
        };

        /** 
         * Terminates all sessions for this account except the one from which the request was made. 
         * 
         * ---
         * @throws `SESSION_TOO_NEW` if the current session is less than 24 hours old.
         */
        export type LogoutOtherSessions = {
            type: "account.logoutOtherSessions"
        };

        /** 
         * Counts the number of sessions for this account, including this one. 
         */
        export type GetSessionsCount = {
            type: "account.getSessionsCount"
        }

        /**
         * Gets the list of all sessions for this account.
         */
        export type GetSessions = {
            type: "account.getSessions"
        }

        /**
         * Terminates a specific session.
         * 
         * ---
         * @throws `SESSION_TOO_NEW` if the current session is less than 24 hours old.
         */
        export type LogoutSession = {
            type: "account.logoutSession",
            /** The session ID to terminate. */
            id: string
        }

        /** 
         * Changes the password of the current account. 
         * 
         * ---
         * @throws LOGIN_PASSWORD_INCORRECT if the current password is incorrect.
         * @throws `SESSION_TOO_NEW` if the current session is less than 24 hours old.
         */
        export type ChangePassword = {
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
         * ---
         * @throws USERNAME_ALREADY_TAKEN if the username is already taken.
         * @throws USERNAME_TOO_SHORT if the username is shorter than 3 characters.
         * @throws `SESSION_TOO_NEW` if the current session is less than 24 hours old.
         */
        export type ChangeUsername = {
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
        export type CheckUsernameAvailable = {
            type: "account.checkUsernameAvailable",
            /** The username to check. */
            username: string
        }

        /** 
         * Gets the rooms in the house 
         */
        export type GetRooms = {
            type: "rooms.getRooms",
        }

        /**
         * Edits the properties of a room.
         * All properties except ID can be changed.  
         * The room will be restarted. (all devices will be turned off, the connection to the controller will be dropped and the room will be initialized again)
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         */
        export type EditRoom = {
            type: "rooms.editRoom",
            /** The modified room. The room to edit will be determined from the `id` property. */
            room: T.Room
        }

        /**
         * Adds a new room to the house.
         * 
         * ---
         * @throws `ROOM_ALREADY_EXISTS` if a room with the same ID already exists.
         */
        export type AddRoom = {
            type: "rooms.addRoom",
            /** The new room to add. */
            room: T.Room
        }

        /**
         * Shuts down and removes a room from the house.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         */
        export type RemoveRoom = {
            type: "rooms.removeRoom",
            /** Room ID */
            id: string
        }

        /**
         * Changes the order of the rooms. The new ids must not have any new or deleted room IDs.
         * 
         * ---
         * @throws `ROOMS_NOT_EQUAL` if the passed IDs have new or deleted room IDs.
         */
        export type ChangeRoomOrder = {
            type: "rooms.changeRoomOrder",
            /** The new order of the rooms. */
            ids: string[]
        }

        /**
         * Restarts a room.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         */
        export type RestartRoom = {
            type: "rooms.restartRoom",
            /** The ID of the room to restart */
            id: string
        }


        /**
         * Gets the available room controller types.
         */
        export type GetRoomControllerTypes = {
            type: "rooms.controllers.getRoomControllerTypes"
        }

        /**
         * Gets the items of a lazy-loading dropdown. (for room controller and device options)
         * 
         * ---
         * @throws `NOT_FOUND` with `object="controller"` if the controller doesn't exist
         * @throws `NOT_FOUND` with `object="deviceType"` if the device type doesn't exist
         * @throws `NOT_FOUND` with `object="field"` if the field doesn't exist
         * @throws `FIELD_NOT_LAZY_SELECT` if the field is not a lazy-loading dropdown
         */
        export type GetSelectFieldLazyLoadItems = {
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
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         */
        export type GetDevices = {
            type: "devices.getDevices",
            /** Room ID */
            roomId: string
        }

        /**
         * Gets the device types for the given room controller type.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="controller"` if the room controller doesn't exist
         */
        export type GetDeviceTypes = {
            type: "devices.getDeviceTypes",
            /** Room controller type */
            controllerType: string
        }

        /**
         * Adds a new device to a room.
         * 
         * ---
         * @throws `DEVICE_ALREADY_EXISTS` if a device with the same ID already exists
         * @throws `NOT_FOUND` with `object="room"` if the room (to which the device is to be added) doesn't exist
         */
        export type AddDevice = {
            type: "devices.addDevice",
            /** Room ID */
            roomId: string,
            /** The new device to add. */
            device: T.Device
        }

        /**
         * Edits the properties of a device.
         * All properties except ID can be changed.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist
         * @throws `NOT_FOUND` with `object="room"` if the room (which contains the device) doesn't exist
         */
        export type EditDevice = {
            type: "devices.editDevice",
            /** Room ID */
            roomId: string,
            /** The modified device. The device to edit will be determined from the `id` property. */
            device: T.Device
        }

        /**
         * Shuts down and removes a device from a room.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist
         * @throws `NOT_FOUND` with `object="room"` if the room (which contains the device) doesn't exist
         */
        export type RemoveDevice = {
            type: "devices.removeDevice",
            /** Room ID */
            roomId: string,
            /** Device ID */
            id: string
        }

        /**
         * Changes the order of the devices in a room. The new ids must not have any new or deleted device IDs.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room was not found.
         * @throws `DEVICES_NOT_EQUAL` if the passed IDs have new or deleted device IDs. 
         */
        export type ChangeDeviceOrder = {
            type: "devices.changeDeviceOrder",
            /** The ID of the room in which the devices are */
            roomId: string,
            /** The new order of the devices */
            ids: string[]
        }

        /**
         * Restarts a device.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist
         */
        export type RestartDevice = {
            type: "devices.restartDevice",
            /** Room ID */
            roomId: string,
            /** Device ID */
            id: string
        }

        /**
         * Gets the current state of the rooms
         */
        export type GetRoomStates = {
            type: "rooms.getRoomStates"
        }

        /**
         * Gets the current state of the devices in a room
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         */
        export type GetDeviceStates = {
            type: "devices.getDeviceStates",
            /** Room ID */
            roomId: string
        }

        /**
         * Gets the current state of the favorite devices
         */
        export type GetFavoriteDeviceStates = {
            type: "devices.getFavoriteDeviceStates"
        }

        /**
         * Toggles the main toggle of a device.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist
         * @throws `NO_MAIN_TOGGLE` if the device doesn't have a main toggle
         * @throws `ROOM_DISABLED` if the room controller is disabled because of an error
         * @throws `DEVICE_DISABLED` if the device is disabled because of an error
         */
        export type ToggleDeviceMainToggle = {
            type: "devices.toggleDeviceMainToggle",
            /** Room ID */
            roomId: string,
            /** Device ID */
            id: string
        }

        /**
         * Adds/removes a device to/from the favorites list.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room doesn't exist
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist  
         * @throws Does **not** throw any error if `isFavorite===true` and the device is already in the favorites list, or if `isFavorite===false` and the device is not in the favorites list.
         */
        export type ToggleDeviceIsFavorite = {
            type: "devices.toggleDeviceIsFavorite",
            /** Room ID */
            roomId: string,
            /** Device ID */
            id: string,
            /** Whether the device is now a favorite */
            isFavorite: boolean
        }

        /**
         * Performs an action on a device interaction.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room containing the device doesn't exist
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist
         * @throws `NOT_FOUND` with `object="interaction"` if the interaction doesn't exist
         * @throws `NOT_FOUND` with `object="action"` if there is no action with the given type or if the action is not available for the device
         * @throws `ROOM_DISABLED` if the room controller is disabled because of an error
         * @throws `DEVICE_DISABLED` if the device is disabled because of an error
         */
        export type SendDeviceInteractionAction = {
            type: "devices.interactions.sendAction",
            /** Room ID */
            roomId: string,
            /** Device ID */
            deviceId: string,
            /** Interaction ID */
            interactionId: string,
            /** Action to perform */
            action: T.DeviceInteraction.Action;
        }

        /**
         * Initializes a live slider value stream for use with WebSocket. A stream ID will be returned which should be used when sending data over WebSocket.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="room"` if the room containing the device doesn't exist
         * @throws `NOT_FOUND` with `object="device"` if the device doesn't exist
         * @throws `NOT_FOUND` with `object="interaction"` if the interaction doesn't exist
         * @throws `INTERACTION_TYPE_INVALID` if the interaction is not a slider
         * @throws `ROOM_DISABLED` if the room controller is disabled because of an error
         * @throws `DEVICE_DISABLED` if the device is disabled because of an error
         */
        export type InitSliderLiveValue = {
            type: "devices.interactions.initSliderLiveValue",
            /** Room ID */
            roomId: string,
            /** Device ID */
            deviceId: string,
            /** Interaction ID */
            interactionId: string,
        }

        /**
         * Ends a live slider value stream.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="stream"` if the ID is not found or has been already closed.
         */
        export type EndSliderLiveValue = {
            type: "devices.interactions.endSliderLiveValue",
            /** The stream ID returned from initSliderLiveValue */
            id: number
        }

        /**
         * Gets the list of installed plugins.
         */
        export type GetInstalledPlugins = {
            type: "plugins.getInstalledPlugins"
        }

        /**
         * Activates / deactivates a plugin.
         * 
         * ---
         * @throws `NOT_FOUND` with `object="plugin"` if there is no installed plugin with that name.
         */
        export type TogglePluginIsActivated = {
            type: "plugins.togglePluginIsActivated",
            /** The ID of the plugin (excluding the `hmp-` prefix) */
            id: string,
            /** Whether the plugin should now be activated. If the state is the same as before, this request does nothing. */
            isActivated: boolean;
        }

    }
    //#region Request union type
    export type Request =
        Request.Empty |
        Request.GetVersion |
        Request.Restart |
        Request.Login |
        Request.Logout |
        Request.LogoutOtherSessions |
        Request.GetSessionsCount |
        Request.GetSessions |
        Request.LogoutSession |
        Request.ChangePassword |
        Request.ChangeUsername |
        Request.CheckUsernameAvailable |
        Request.GetRooms |
        Request.EditRoom |
        Request.AddRoom |
        Request.RemoveRoom |
        Request.ChangeRoomOrder |
        Request.RestartRoom |
        Request.GetRoomControllerTypes |
        Request.GetSelectFieldLazyLoadItems |
        Request.GetDevices |
        Request.GetDeviceTypes |
        Request.AddDevice |
        Request.EditDevice |
        Request.RemoveDevice |
        Request.ChangeDeviceOrder |
        Request.RestartDevice |
        Request.GetRoomStates |
        Request.GetDeviceStates |
        Request.ToggleDeviceMainToggle |
        Request.GetFavoriteDeviceStates |
        Request.ToggleDeviceIsFavorite |
        Request.SendDeviceInteractionAction |
        Request.InitSliderLiveValue |
        Request.EndSliderLiveValue |
        Request.GetInstalledPlugins |
        Request.TogglePluginIsActivated;
    //#endregion

    export namespace Response {
        /** Nothing is returned */
        export type Empty = Record<string, never>;

        export type Version = {
            /** The hub software version */
            version: `${number}.${number}.${number}`
        };

        export type Login = {
            /** A token to be used in future requests. */
            token: string
        };

        export type SessionCount = {
            /** The number of active sessions / terminated sessions */
            sessions: number
        };

        export type Sessions = {
            /** The active sessions */
            sessions: T.Session[]
        }

        export type UsernameAvailability = {
            /** False if the username is already taken, true otherwise. */
            available: boolean
        };

        export type Rooms = {
            /** The rooms in the house */
            rooms: {[roomId: string]: T.Room}
        }

        export type RoomControllerTypes = {
            /** The available room controller types */
            types: T.RoomControllerType[]
        }

        export type SelectFieldItems = {
            /** The items of the dropdown */
            items: (T.SettingsField.SelectOption | T.SettingsField.SelectOptionGroup)[]
        }

        export type Devices = {
            /** The devices in the room */
            devices: Record<string, T.Device>
        }

        export type DeviceTypes = {
            /** The available device types for this room controller type */
            types: T.DeviceType[]
        }

        export type RoomStates = {
            /** The current state of the rooms */
            states: Record<string, T.RoomState>
        }

        export type DeviceStates = {
            /** The current state of the devices in the room */
            states: Record<string, T.DeviceState>
        }

        export type FavoriteDeviceStates = {
            /** The current state of the favorite devices */
            states: T.DeviceState[]
        }

        export type SliderLiveValueID = {
            /** The ID to use when updating the value via WebSocket */
            id: number
        }

        export type Plugins = {
            /** The installed plugins */
            plugins: T.Plugin[]
        }
    }
    //#region Response generic type
    export type Response<R extends Request> = 
        R extends Request.Empty ? Response.Empty :
        R extends Request.GetVersion ? Response.Version :
        R extends Request.Restart ? Response.Empty :
        R extends Request.Login ? Response.Login :
        R extends Request.Logout ? Response.Empty :
        R extends Request.LogoutOtherSessions ? Response.SessionCount :
        R extends Request.GetSessionsCount ? Response.SessionCount :
        R extends Request.GetSessions ? Response.Sessions :
        R extends Request.LogoutSession ? Response.Empty :
        R extends Request.ChangePassword ? Response.Empty :
        R extends Request.ChangeUsername ? Response.Login :
        R extends Request.CheckUsernameAvailable ? Response.UsernameAvailability :
        R extends Request.GetRooms ? Response.Rooms :
        R extends Request.EditRoom ? Response.Empty :
        R extends Request.AddRoom ? Response.Empty :
        R extends Request.RemoveRoom ? Response.Empty :
        R extends Request.ChangeRoomOrder ? Response.Empty :
        R extends Request.RestartRoom ? Response.Empty :
        R extends Request.GetRoomControllerTypes ? Response.RoomControllerTypes :
        R extends Request.GetSelectFieldLazyLoadItems ? Response.SelectFieldItems :
        R extends Request.GetDevices ? Response.Devices :
        R extends Request.GetDeviceTypes ? Response.DeviceTypes :
        R extends Request.AddDevice ? Response.Empty :
        R extends Request.EditDevice ? Response.Empty :
        R extends Request.RemoveDevice ? Response.Empty :
        R extends Request.ChangeDeviceOrder ? Response.Empty :
        R extends Request.RestartDevice ? Response.Empty :
        R extends Request.GetRoomStates ? Response.RoomStates :
        R extends Request.GetDeviceStates ? Response.DeviceStates :
        R extends Request.ToggleDeviceMainToggle ? Response.Empty :
        R extends Request.GetFavoriteDeviceStates ? Response.FavoriteDeviceStates :
        R extends Request.ToggleDeviceIsFavorite ? Response.Empty :
        R extends Request.SendDeviceInteractionAction ? Response.Empty :
        R extends Request.InitSliderLiveValue ? Response.SliderLiveValueID :
        R extends Request.EndSliderLiveValue ? Response.Empty :
        R extends Request.GetInstalledPlugins ? Response.Plugins :
        R extends Request.TogglePluginIsActivated ? Response.Empty :
        never;
    //#endregion

    export namespace Error {
        /**
         * Auth token isn't valid or expired
         */
        export type TokenInvalid = {
            code: 401,
            message: "TOKEN_INVALID"
        };

        /**
         * The HTTP request is invalid: Wrong method, invalid URL, etc.
         */
        export type InvalidRequest = {
            code: 400,
            message: "INVALID_REQUEST"
        }

        /**
         * Request has malformed JSON
         */
        export type InvalidJSON = {
            code: 400,
            message: "INVALID_REQUEST_JSON"
        };

        /**
         * Request type is missing or invalid
         */
        export type InvalidRequestType = {
            code: 400,
            message: "INVALID_REQUEST_TYPE"
        };

        /**
         * Request is missing a required field
         */
        export type MissingParameter<R extends Request> = {
            code: 400,
            message: "MISSING_PARAMETER"
            missingParameters: Paths<R>[];
        };

        /**
         * Request has an invalid value for a field
         */
        export type InvalidParameter<R extends Request> = {
            code: 400,
            message: "INVALID_PARAMETER"
            paramName: Paths<R>;
        };

        /**
         * A number parameter is out of range, a string or array is too long or too short
         */
        export type ParameterOutOfRange<R extends Request> = {
            code: 400,
            message: "PARAMETER_OUT_OF_RANGE"
            paramName: Paths<R>;
        };

        /**
         * An internal server error has occurred
         */
        export type InternalServerError = {
            code: 500,
            message: "INTERNAL_SERVER_ERROR"
        };

        /**
         * More than 10 requests have been made in the last second
         */
        export type TooManyRequests = {
            code: 429,
            message: "TOO_MANY_REQUESTS"
        };

        /**
         * The session is not old enough to perform sensitive operations. The session must be at least 24 hours old.
         */
        export type SessionTooNew = {
            code: 403,
            message: "SESSION_TOO_NEW"
        };

        /**
         * The requested item/resource was not found.
         */
        export type NotFound<O extends string> = {
            code: 404,
            message: "NOT_FOUND",
            object: O
        };

        /**
         * The user trying to be logged in to doesn't exists.
         */
        export type LoginUserNotFound = {
            code: 401,
            message: "LOGIN_USER_NOT_FOUND"
        };

        /**
         * The entered password was incorrect. This error has 1 second of delay to prevent brute force attacks.
         */
        export type LoginPasswordIncorrect = {
            code: 401,
            message: "LOGIN_PASSWORD_INCORRECT"
        };

        /**
         * Another account already has this username.
         */
        export type UsernameAlreadyTaken = {
            code: 400,
            message: "USERNAME_ALREADY_TAKEN"
        };

        /**
         * The username is too short. (i.e. less than 3 characters)
         */
        export type UsernameTooShort = {
            code: 400,
            message: "USERNAME_TOO_SHORT"
        };

        /**
         * A room with the same ID already exists.
         */
        export type RoomAlreadyExists = {
            code: 400,
            message: "ROOM_ALREADY_EXISTS"
        };

        /**
         * The passed room IDs have new or deleted room IDs.
         */
        export type RoomsNotEqual = {
            code: 400,
            message: "ROOMS_NOT_EQUAL"
        };

        /**
         * The passed device IDs have new or deleted device IDs.
         */
        export type DevicesNotEqual = {
            code: 400,
            message: "DEVICES_NOT_EQUAL"
        };

        /**
         * The settings field is not a lazy-loading dropdown.
         */
        export type FieldNotLazySelect = {
            code: 400,
            message: "FIELD_NOT_LAZY_SELECT"
        }

        /**
         * The plugin returned an error for the request
         */
        export type PluginCustomError = {
            code: 400,
            message: "CUSTOM_PLUGIN_ERROR",
            text: string
        }

        /**
         * The device with the same ID already exists.
         */
        export type DeviceAlreadyExists = {
            code: 400,
            message: "DEVICE_ALREADY_EXISTS"
        }

        /**
         * The device does not have a main toggle.
         */
        export type NoMainToggle = {
            code: 400,
            message: "NO_MAIN_TOGGLE"
        }

        /**
         * The room is disabled because of an error.
         */
        export type RoomDisabled = {
            code: 500,
            message: "ROOM_DISABLED",
            error: string
        }

        /**
         * The device is disabled because of an error.
         */
        export type DeviceDisabled = {
            code: 500,
            message: "DEVICE_DISABLED",
            error: string
        }

        /** 
         * The device interaction is of the wrong type. 
         */
        export type InteractionTypeInvalid = {
            code: 400,
            message: "INTERACTION_TYPE_INVALID",
            expected: T.DeviceInteraction.Type['type'];
        }
    }
    //#region Error generic type
    export type Error<R extends Request> = (
        R extends Request.Empty ? never :
        R extends Request.GetVersion ? never :
        R extends Request.Restart ? never :
        R extends Request.Login ? Error.LoginPasswordIncorrect | Error.LoginUserNotFound :
        R extends Request.Logout ? never :
        R extends Request.LogoutOtherSessions ? Error.SessionTooNew :
        R extends Request.GetSessionsCount ? never :
        R extends Request.GetSessions ? never :
        R extends Request.LogoutSession ? Error.NotFound<"session"> | Error.SessionTooNew :
        R extends Request.ChangePassword ? Error.LoginPasswordIncorrect | Error.SessionTooNew :
        R extends Request.ChangeUsername ? Error.UsernameAlreadyTaken | Error.UsernameTooShort | Error.SessionTooNew :
        R extends Request.CheckUsernameAvailable ? never :
        R extends Request.GetRooms ? never :
        R extends Request.EditRoom ? Error.NotFound<"room"> | Error.PluginCustomError :
        R extends Request.AddRoom ? Error.RoomAlreadyExists | Error.PluginCustomError :
        R extends Request.RemoveRoom ? Error.NotFound<"room"> :
        R extends Request.ChangeRoomOrder ? Error.RoomsNotEqual :
        R extends Request.RestartRoom ? Error.NotFound<"room"> :
        R extends Request.GetRoomControllerTypes ? never :
        R extends Request.GetSelectFieldLazyLoadItems ? Error.NotFound<"controller"|"deviceType"|"field"> | Error.FieldNotLazySelect | Error.PluginCustomError :
        R extends Request.GetDevices ? Error.NotFound<"room"> :
        R extends Request.GetDeviceTypes ? Error.NotFound<"controller"> :
        R extends Request.AddDevice ? Error.DeviceAlreadyExists | Error.NotFound<"room"> | Error.PluginCustomError :
        R extends Request.EditDevice ? Error.NotFound<"device"|"room"> | Error.PluginCustomError :
        R extends Request.RemoveDevice ? Error.NotFound<"device"|"room"> :
        R extends Request.ChangeDeviceOrder ? Error.NotFound<"room"> | Error.DevicesNotEqual :
        R extends Request.RestartDevice ? Error.NotFound<"device"|"room"> | Error.RoomDisabled :
        R extends Request.GetRoomStates ? never :
        R extends Request.GetDeviceStates ? Error.NotFound<"room"> :
        R extends Request.ToggleDeviceMainToggle ? Error.NotFound<"room"> | Error.NotFound<"device"> | Error.NoMainToggle | Error.RoomDisabled | Error.DeviceDisabled :
        R extends Request.GetFavoriteDeviceStates ? never :
        R extends Request.ToggleDeviceIsFavorite ? Error.NotFound<"room"> | Error.NotFound<"device"> :
        R extends Request.SendDeviceInteractionAction ? Error.NotFound<"room" | "device" | "interaction" | "action"> | Error.RoomDisabled | Error.DeviceDisabled :
        R extends Request.InitSliderLiveValue ? Error.NotFound<"room" | "device" | "interaction"> | Error.InteractionTypeInvalid | Error.RoomDisabled | Error.DeviceDisabled :
        R extends Request.EndSliderLiveValue ? Error.NotFound<"stream"> :
        R extends Request.GetInstalledPlugins ? never :
        R extends Request.TogglePluginIsActivated ? Error.NotFound<"plugin"> :
        never
    ) | (
        [R extends R ? keyof Omit<R, 'type'>: never ][0] extends never ? never : (Error.MissingParameter<R> | Error.InvalidParameter<R> | Error.ParameterOutOfRange<R>)
    ) | 
        Error.InvalidRequest |
        Error.InvalidJSON |
        Error.InvalidRequestType |
        Error.InternalServerError |
        Error.TooManyRequests | (
        R extends Request.Login ? never : Error.TokenInvalid
    );
    //#endregion

    export type ResponseOrError<R extends Request> = {
        type: "ok",
        data: Response<R>
    } | {
        type: "error",
        error: Error<R>
    };

    export namespace Update {
        export type RoomStateChanged = {
            type: "rooms.roomStateChanged"
            state: T.RoomState
        }

        export type DeviceStateChanged = {
            type: "devices.deviceStateChanged",
            state: T.DeviceState
        }
    }
    //#region Update union
    export type Update =
        Update.RoomStateChanged |
        Update.DeviceStateChanged;
    //#endregion

    export namespace T {
        /**
         * Describes an active session.
         */
        export type Session = {
            /** The ID of the session */
            id: string;
            /** Device info */
            device: string;
            /** The time when the session was created, in unix time. */
            loginTime: number;
            /** The time when the session was last used, in unix time. */
            lastUsedTime: number;
            /** The IP address of the login */
            ip: string;
            /** Whether the session is the one currently in use */
            isCurrent: boolean;
        }

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
        export type RoomControllerType = {
            /** The room controller id */
            id: `${string}:${string}`,
            /** The room controller name */
            name: string,
            /** The room controller sub-name (aka mode) */
            sub_name: string
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
        
        /**
         * A device type information
         */
        export type DeviceType = {
            /** The device type id */
            id: `${string}:${string}`,
            /** The device name */
            name: string,
            /** The device sub-name (aka mode) */
            sub_name: string,
            /** Settings fields */
            settings: SettingsField[],
            /** The icon to show for the device */
            icon: IconName,
            /** The compatible room controller(s) for the device types. '*' means any. */
            forRoomController: `${string}:${string}`|`${string}:*`|'*'
        };

        /**
         * A device in a room. Does not contain info about the device state or which room it is in.
         */
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

        /**
         * The current state of a room.
         */
        export type RoomState = ({
            /** Whether the room is disabled because of a failure */
            disabled: true,
            /** The error message */
            error: string,
        } | {
            /** Whether the room is disabled because of a failure */
            disabled: false,
        }) & {
            /** The room's ID, usually a more machine-friendly version of `name` */
            id: string,
            /** The room's name, e.g. "Living Room" */
            name: string,
            /** The icon to show for the room */
            icon: Room['icon']
        }

        /**
         * The current state of a device.
         */
        export type DeviceState = ({
            /** Whether the device is disabled because of a failure */
            disabled: true,
            /** The error message */
            error: string,
        } | {
            /** Whether the device is disabled because of a failure */
            disabled: false,
        }) & {
            /** The device's ID */
            id: string,
            /** The room's ID */
            roomId: string,
            /** Whether the device is in the favorites list */
            isFavorite: boolean,
            /** The device's name */
            name: string,
            /** The device's type */
            type: Omit<DeviceType, 'settings'> & {
                /** The interactions for the device */
                interactions: Record<string, DeviceInteraction.Type>,
                /** The interaction that is displayed on the device itself in addition to the context menu. An On/Off label should be shown if not set. */
                defaultInteraction?: string,
            },
            /** Current device icon, use `type.icon` if not provided. Can be overridden by `iconText`. */
            icon?: IconName,
            /** A large text to show instead of the icon. */
            iconText?: string,
            /** Icon color override, should be ignored if `mainToggleState` is true. */
            iconColor?: UIColor,
            /** Whether the device has a main toggle */
            hasMainToggle: boolean,
            /** Whether the device's main toggle is on */
            mainToggleState: boolean,
            /** Active highlight color override */
            activeColor?: UIColor,
            /** Whether the device can be clicked */
            clickable: boolean,
            /** The state of the interactions for the device */
            interactions: Record<string, DeviceInteraction.State | undefined>,
        }

        /**
         * A plugin's information
         */
        export type Plugin = {
            /** Plugin machine friendly name. */
            id: string,
            /** Plugin name */
            name: string,
            /** Plugin description */
            description?: string,
            /** Plugin author */
            author?: string,
            /** Plugin author website */
            authorWebsite?: string,
            /** URL of the plugin's website */
            homepage?: string,
            /** If this object is from the installed plugins, represents the installed version.  
             * Otherwise, represents the latest version. */
            version: string,
            /** Whether the plugin is compatible with the current version of the hub */
            compatible: boolean,
            /** Whether the plugin is activated */
            activated: boolean,
            /** An array of tags for use in global search */
            tags?: string[]
        }

        export namespace SettingsField {
            /**
             * Properties shared by most of SettingsField* types
             */
            export type GeneralProps<T> = {
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
            };

            /**
             * A text input.
             */
            export type TypeText = GeneralProps<string> & {
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
            };

            /**
             * A numerical input.
             */
            export type TypeNumber = GeneralProps<number> & {
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
            };

            /**
             * A check-box. Required check-boxes must be checked.
             */
            export type TypeCheckbox = GeneralProps<boolean> & {
                type: 'checkbox',
                /** If provided, the description will change to this value when the field is checked. */
                description_on_true?: string;
            };

            /**
             * A radio-button group
             */
            export type TypeRadio = Omit<GeneralProps<string>, 'label'> & {
                type: 'radio',
                /** THe list of radio buttons */
                options: Record<string, {
                    /** Option label */
                    label: string,
                    /** Option description. It is recommended to add a description for either all or none of the options. Ignored if direction is horizontal */
                    description?: string,
                }>,
                /** The preferred orientation of the radio buttons. 'h' means they will be on the same line and 'v' means they will be on different lines. */
                direction: 'h' | 'v',
                /** Label before the radio buttons */
                label?: string;
            };

            /**
             * A drop-down / select / combo-box
             */
            export type TypeSelect = GeneralProps<string> & {
                type: 'select',
                /** The list of options */
                options: (SelectOption | SelectOptionGroup)[] | SelectLazyOptions,
                /** Whether the user can fill in the value instead of selecting an item. The field will show the value of the active option instead of its label+subtext. */
                allowCustomValue?: boolean,
                /** Whether the custom value should be checked to be in the items. Ignored if allowCustomValue is false or the options are lazy-loading. */
                checkCustomValue?: boolean,
                /** A search bar will be shown in the dropdown if true. A number can instead be provided which will be the minimum number of total options for the search bar to be shown. */
                showSearchBar?: boolean | number,
            };

            /**
             * An option in a drop-down / select / combo-box
             */
            export type SelectOption = {
                isGroup?: false,
                /** The value of the dropdown when this option is selected */
                value: string,
                /** Option label */
                label: string,
                /** Smaller/lighter text to be shown alongside the label. Might be shown in parentheses if proper rendering isn't possible. */
                subtext?: string,
            };

            /**
             * A group of options in a drop-down / select / combo-box
             */
            export type SelectOptionGroup = {
                isGroup: true,
                /** Group label */
                label: string,
                /** Smaller/lighter text to be shown alongside the label. Might be shown in parentheses if proper rendering isn't possible. */
                subtext?: string,
                /** Whether to expand or collapse the group when the dropdown is shown. Might be ignored if not supported. */
                expanded?: boolean,
                /** The list of options in the group */
                children: SelectOption[],
            };

            /**
             * The options for a lazy-loading drop-down / select / combo-box
             */
            export type SelectLazyOptions = {
                isLazy: true;
                /** The fallback texts to use instead of the default ones */
                fallbackTexts?: {
                    /** The text to show when the list is loading */
                    whenLoading?: string;
                    /** The text to show when the list is empty */
                    whenEmpty?: string;
                    /** The text to show if the list cannot be loaded (request failure) */
                    whenError?: string;
                };
                /** 
                 * When to load the items: 
                 * - When the field is rendered
                 * - When the dropdown is opened (Warning: dropdown button will show the value of the active item instead of its label+subtext before the list is loaded, so it is recommended to only use this mode when values == labels.)
                 */
                loadOn: 'render' | 'open',
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

            /**
             * A slider / range / track-bar
             */
            export type TypeSlider = GeneralProps<number> & {
                type: 'slider',
                /** The minimum value (default: 0) */
                min?: number,
                /** The maximum value (default: 100) */
                max?: number,
                /** The step size, set to 0 to disable (default: 1) */
                step?: number,
                /** The slider color (useful for color fields) */
                color?: UIColor,
                /** Whether to show the value text next to the slider */
                showValue?: boolean,
                /** A text to add to the value shown next to the slider */
                postfix?: string,
                /** Slider appearance (default: horizontal, large) */
                appearance?: {
                    /** horizontal/vertical/radial */
                    type: 'horizontal',
                    /** Width mode: small / large / fill (default: large) */
                    width?: 'small' | 'large' | 'fill',
                } | {
                    /** horizontal/vertical/radial */
                    type: 'vertical',
                    /** Height mode: small / large (default: large) */
                    height?: 'small' | 'large',
                // } | {
                //     /** horizontal/vertical/radial */
                //     type: 'radial',
                //     /** Size: small / large (default: large) */
                //     size?: 'small' | 'large',
                //     /** Start angle in degrees (distance from the bottom center, default: 45) */
                //     startAngle?: number,
                //     /** End angle in degrees (distance from the bottom center, default: 45) */
                //     endAngle?: number,
                }
            }

            /**
             * A horizontal wrapper that contains several columns of fields
             */
            export type TypeHorizontalWrapper = {
                type: 'horizontal_wrapper',
                /** The columns */
                columns: HorizontalWrapperColumn[],
                /** Whether the columns should collapse into one for mobile device (default: true) */
                responsive?: boolean,
            }

            /**
             * A column in a horizontal wrapper
             */
            export type HorizontalWrapperColumn = {
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

            /**
             * A group of fields with a border and legend
             */
            export type TypeContainer = {
                type: 'container',
                /** Container label (aka 'legend') */
                label: string,
                /** The list of fields */
                children: SettingsField[],
            }
        }
        /**
         * A device / controller type / etc settings field
         */
        export type SettingsField<IncludeContainers extends boolean = true> = 
            SettingsField.TypeText | SettingsField.TypeNumber | SettingsField.TypeCheckbox | SettingsField.TypeRadio | SettingsField.TypeSelect | SettingsField.TypeSlider |
            (IncludeContainers extends true ? (SettingsField.TypeHorizontalWrapper | SettingsField.TypeContainer) : never);

        export namespace DeviceInteraction {
            export namespace Type {
                /**
                 * An editable slider. 
                 * 
                 * ---
                 * Actions:
                 * - setSliderValue: Change the slider value
                 * 
                 * ---
                 * As default interaction:
                 * - The label will be removed
                 */
                export type Slider = Omit<SettingsField.TypeSlider, keyof SettingsField.GeneralProps<number> | 'appearance'> & {
                    /** A descriptive label shown above the slider */
                    label?: string,
                    /** 
                     * If enabled, the setSliderValue action will be sent continuously while the slider is moving, instead of only when the user releases the slider.  
                     * Note that the device state will not be refreshed until the slider is released, regardless of this setting.  
                     * (default: false)
                     */
                    live?: boolean,
                }

                /**
                 * An informative label.
                 * 
                 * ---
                 * Does not have any actions.
                 * 
                 * ---
                 * As default interaction:
                 * - Size and align will be ignored.
                 */
                export type Label = {
                    type: 'label',
                    /** Text size */
                    size?: 'small' | 'medium' | 'large',
                    /** Text color */
                    color?: UIColor,
                    /** Text alignment */
                    align?: 'start' | 'center' | 'end',
                    /** Default text to show in case the state is empty (default: "") */
                    defaultValue?: string,
                };

                /**
                 * A button
                 * 
                 * ---
                 * Actions:
                 * - clickButton: Click the button
                 * 
                 * ---
                 * As default interaction:
                 * - `primary` will be ignored and set to `true`.
                 */
                export type Button = {
                    type: 'button',
                    /** Button label */
                    label: string,
                    /** Whether the button is considered primary and should be shown with accent color background (default: false) */
                    primary?: boolean,
                    /** Whether the button requires user attention and should be shown in red (can be combined with primary, default: false) */
                    attention?: boolean,
                    /** Whether the button is enabled and can be clicked (default: true) */
                    enabled?: boolean,
                }

                /**
                 * An on/off toggle button
                 * 
                 * ---
                 * Actions:
                 * - toggleToggleButton
                 * 
                 * ---
                 * As default interaction:
                 * - The label will be removed.
                 */
                export type ToggleButton = {
                    type: 'toggleButton',
                    /** Button label */
                    label: string,
                    /** Default state to show if the state is empty (default: false/off) */
                    default?: boolean
                }

                /**
                 * An numerical field controlled using increase/decrease buttons
                 * 
                 * ---
                 * Actions:
                 * - setTwoButtonNumberValue
                 * 
                 * ---
                 * As default interaction:
                 * - The label will be removed.
                 * - Will be shown in place of the device icon
                 * - Another interaction can also be added as default by separating with a plus sign (e.g. `temperature+speed`)
                 */
                export type TwoButtonNumber = {
                    type: 'twoButtonNumber',
                    /** Button label */
                    label?: string,
                    /** Minimum value */
                    min: number,
                    /** Maximum value */
                    max: number,
                    /** Amount of change for each increase/decrease button press (default: 1) */
                    step?: number,
                    /** Decrease button icon/text and color (default is the "minus" icon) */
                    decreaseButton?: ({
                        icon: IconName
                    } | {
                        /** Should be 1 or 2 characters long */
                        text: string
                    }) & {
                        color?: UIColor
                    },
                    /** Increase button icon/text and color (default is the "plus" icon) */
                    increaseButton?: ({
                        icon: IconName
                    } | {
                        /** Should be 1 or 2 characters long */
                        text: string
                    }) & {
                        color?: UIColor
                    },
                    /** Text to add at the end of the displayed value */
                    postfix?: string,
                }

                /**
                 * A radio-button-style color input for the main UI colors (plus white).
                 * 
                 * The UI colors are white, red, orange, yellow, green, blue, purple, pink and brown
                 * 
                 * ---
                 * Actions:
                 * - setUIColorInputValue
                 * 
                 * ---
                 * As default interaction:
                 * - The label will be removed.
                 */
                export type UIColorInput = {
                    type: 'uiColorInput',
                    /** An optional label to show above the field */
                    label?: string,
                    /** The set of allowed colors. Default is all colors. */
                    allowed?: UIColorWithWhite[],
                    /** Default color to show in case the state is empty. Default is the first allowed color. */
                    defaultValue?: UIColorWithWhite,
                }
            }
            export type Type = Type.Slider | Type.Label | Type.Button | Type.ToggleButton | Type.TwoButtonNumber | Type.UIColorInput;

            export namespace Action {
                /**
                 * Sets a slider value
                 */
                export type SetSliderValue = {
                    type: 'setSliderValue',
                    /** The new value, must be between the specified min and max values */
                    value: number,
                };

                /**
                 * Click a button
                 */
                export type ClickButton = {
                    type: 'clickButton',
                };

                /**
                 * Toggle a `toggleButton`
                 */
                export type ToggleToggleButton = {
                    type: 'toggleToggleButton',
                    /** Whether the button should now be on (true) or off (false) */
                    value: boolean,
                }

                /**
                 * Set the value of a `twoButtonNumber`
                 */
                export type SetTwoButtonNumberValue = {
                    type: 'setTwoButtonNumberValue',
                    /** The new value, must be between the specified min and max values */
                    value: number
                }

                /**
                 * Set the color of a `uiColorInput`
                 */
                export type SetUIColorInputValue = {
                    type: 'setUIColorInputValue',
                    /** The new color, must be one of the specified allowed colors */
                    color: UIColorWithWhite
                }
            }
            export type Action<T extends Type = Type> =
                T extends Type.Slider ? Action.SetSliderValue :
                T extends Type.Label ? never :
                T extends Type.Button ? Action.ClickButton :
                T extends Type.ToggleButton ? Action.ToggleToggleButton :
                T extends Type.TwoButtonNumber ? Action.SetTwoButtonNumberValue :
                T extends Type.UIColorInput ? Action.SetUIColorInputValue :
                never;
            
            export namespace State {
                /** @see Type.Slider */
                export type Slider = {
                    value: number,
                };

                /** @see Type.Label */
                export type Label = {
                    text: string,
                    color?: UIColor,
                }

                /** @see Type.Button */
                export type Button = Record<never, never>;

                /** @see Type.ToggleButton */
                export type ToggleButton = {
                    on: boolean,
                }

                /** @see Type.TwoButtonNumber */
                export type TwoButtonNumber = {
                    value: number,
                }

                /** @see Type.UIColorInput */
                export type UIColorInput = {
                    color: UIColorWithWhite,
                }
            }
            export type State<T extends Type = Type> =
                T extends Type.Slider ? State.Slider :
                T extends Type.Label ? State.Label :
                T extends Type.Button ? State.Button :
                T extends Type.ToggleButton ? State.ToggleButton :
                T extends Type.TwoButtonNumber ? State.TwoButtonNumber :
                T extends Type.UIColorInput ? State.UIColorInput :
                never;
        }
        
        /** A Font Awesome v6 free solid icon name */
        /* cSpell:disable */
        export type IconName = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'A'|'Ad'|'Add'|'AddressBook'|'AddressCard'|'Adjust'|'AirFreshener'|'AlignCenter'|'AlignJustify'|'AlignLeft'|'AlignRight'|'Allergies'|'Ambulance'|'AmericanSignLanguageInterpreting'|'Anchor'|'AngleDoubleDown'|'AngleDoubleLeft'|'AngleDoubleRight'|'AngleDoubleUp'|'AngleDown'|'AngleLeft'|'AngleRight'|'AnglesDown'|'AnglesLeft'|'AnglesRight'|'AnglesUp'|'AngleUp'|'Angry'|'Ankh'|'AppleAlt'|'AppleWhole'|'Archive'|'Archway'|'AreaChart'|'ArrowAltCircleDown'|'ArrowAltCircleLeft'|'ArrowAltCircleRight'|'ArrowAltCircleUp'|'ArrowCircleDown'|'ArrowCircleLeft'|'ArrowCircleRight'|'ArrowCircleUp'|'ArrowDown'|'ArrowDown19'|'ArrowDown91'|'ArrowDownAZ'|'ArrowDownLong'|'ArrowDownShortWide'|'ArrowDownWideShort'|'ArrowDownZA'|'ArrowLeft'|'ArrowLeftLong'|'ArrowLeftRotate'|'ArrowPointer'|'ArrowRight'|'ArrowRightArrowLeft'|'ArrowRightFromBracket'|'ArrowRightFromFile'|'ArrowRightLong'|'ArrowRightRotate'|'ArrowRightToBracket'|'ArrowRightToFile'|'ArrowRotateBack'|'ArrowRotateBackward'|'ArrowRotateForward'|'ArrowRotateLeft'|'ArrowRotateRight'|'Arrows'|'ArrowsAlt'|'ArrowsAltH'|'ArrowsAltV'|'ArrowsH'|'ArrowsLeftRight'|'ArrowsRotate'|'ArrowsUpDown'|'ArrowsUpDownLeftRight'|'ArrowsV'|'ArrowTrendDown'|'ArrowTrendUp'|'ArrowTurnDown'|'ArrowTurnRight'|'ArrowTurnUp'|'ArrowUp'|'ArrowUp19'|'ArrowUp91'|'ArrowUpAZ'|'ArrowUpFromBracket'|'ArrowUpLong'|'ArrowUpRightFromSquare'|'ArrowUpShortWide'|'ArrowUpWideShort'|'ArrowUpZA'|'AslInterpreting'|'AssistiveListeningSystems'|'Asterisk'|'At'|'Atlas'|'Atom'|'AudioDescription'|'AustralSign'|'Automobile'|'Award'|'B'|'Baby'|'BabyCarriage'|'Backspace'|'Backward'|'BackwardFast'|'BackwardStep'|'Bacon'|'Bacteria'|'Bacterium'|'BagShopping'|'Bahai'|'BahtSign'|'BalanceScale'|'BalanceScaleLeft'|'BalanceScaleRight'|'Ban'|'Bandage'|'BandAid'|'Bank'|'BanSmoking'|'BarChart'|'Barcode'|'Bars'|'BarsProgress'|'BarsStaggered'|'Baseball'|'BaseballBall'|'BaseballBatBall'|'Basketball'|'BasketballBall'|'BasketShopping'|'Bath'|'Bathtub'|'Battery'|'Battery0'|'Battery2'|'Battery3'|'Battery4'|'Battery5'|'BatteryCar'|'BatteryEmpty'|'BatteryFull'|'BatteryHalf'|'BatteryQuarter'|'BatteryThreeQuarters'|'Bed'|'BedPulse'|'Beer'|'BeerMugEmpty'|'Bell'|'BellConcierge'|'BellSlash'|'BezierCurve'|'Bible'|'Bicycle'|'Biking'|'Binoculars'|'Biohazard'|'BirthdayCake'|'BitcoinSign'|'Blackboard'|'Blender'|'BlenderPhone'|'Blind'|'Blog'|'Bold'|'Bolt'|'BoltLightning'|'Bomb'|'Bone'|'Bong'|'Book'|'BookAtlas'|'BookBible'|'BookDead'|'BookJournalWhills'|'Bookmark'|'BookMedical'|'BookOpen'|'BookOpenReader'|'BookQuran'|'BookReader'|'BookSkull'|'BorderAll'|'BorderNone'|'BorderStyle'|'BorderTopLeft'|'BowlingBall'|'Box'|'BoxArchive'|'Boxes'|'BoxesAlt'|'BoxesStacked'|'BoxOpen'|'BoxTissue'|'Braille'|'Brain'|'BrazilianRealSign'|'BreadSlice'|'Briefcase'|'BriefcaseClock'|'BriefcaseMedical'|'BroadcastTower'|'Broom'|'BroomBall'|'Brush'|'Bug'|'BugSlash'|'Building'|'BuildingColumns'|'Bullhorn'|'Bullseye'|'Burger'|'Burn'|'Bus'|'BusAlt'|'BusinessTime'|'BusSimple'|'C'|'Cab'|'Cake'|'CakeCandles'|'Calculator'|'Calendar'|'CalendarAlt'|'CalendarCheck'|'CalendarDay'|'CalendarDays'|'CalendarMinus'|'CalendarPlus'|'CalendarTimes'|'CalendarWeek'|'CalendarXmark'|'Camera'|'CameraAlt'|'CameraRetro'|'CameraRotate'|'Campground'|'Cancel'|'CandyCane'|'Cannabis'|'Capsules'|'Car'|'CarAlt'|'Caravan'|'CarBattery'|'CarCrash'|'CaretDown'|'CaretLeft'|'CaretRight'|'CaretSquareDown'|'CaretSquareLeft'|'CaretSquareRight'|'CaretSquareUp'|'CaretUp'|'CarRear'|'CarriageBaby'|'Carrot'|'CarSide'|'CartArrowDown'|'CartFlatbed'|'CartFlatbedSuitcase'|'CartPlus'|'CartShopping'|'CashRegister'|'Cat'|'CediSign'|'CentSign'|'Certificate'|'Chain'|'ChainBroken'|'ChainSlash'|'Chair'|'Chalkboard'|'ChalkboardTeacher'|'ChalkboardUser'|'ChampagneGlasses'|'ChargingStation'|'ChartArea'|'ChartBar'|'ChartColumn'|'ChartGantt'|'ChartLine'|'ChartPie'|'Check'|'CheckCircle'|'CheckDouble'|'CheckSquare'|'CheckToSlot'|'Cheese'|'Chess'|'ChessBishop'|'ChessBoard'|'ChessKing'|'ChessKnight'|'ChessPawn'|'ChessQueen'|'ChessRook'|'ChevronCircleDown'|'ChevronCircleLeft'|'ChevronCircleRight'|'ChevronCircleUp'|'ChevronDown'|'ChevronLeft'|'ChevronRight'|'ChevronUp'|'Child'|'Church'|'Circle'|'CircleArrowDown'|'CircleArrowLeft'|'CircleArrowRight'|'CircleArrowUp'|'CircleCheck'|'CircleChevronDown'|'CircleChevronLeft'|'CircleChevronRight'|'CircleChevronUp'|'CircleDollarToSlot'|'CircleDot'|'CircleDown'|'CircleExclamation'|'CircleH'|'CircleHalfStroke'|'CircleInfo'|'CircleLeft'|'CircleMinus'|'CircleNotch'|'CirclePause'|'CirclePlay'|'CirclePlus'|'CircleQuestion'|'CircleRadiation'|'CircleRight'|'CircleStop'|'CircleUp'|'CircleUser'|'CircleXmark'|'City'|'Clapperboard'|'ClinicMedical'|'Clipboard'|'ClipboardCheck'|'ClipboardList'|'Clock'|'ClockFour'|'ClockRotateLeft'|'Clone'|'Close'|'ClosedCaptioning'|'Cloud'|'CloudArrowDown'|'CloudArrowUp'|'CloudDownload'|'CloudDownloadAlt'|'CloudMeatball'|'CloudMoon'|'CloudMoonRain'|'CloudRain'|'CloudShowersHeavy'|'CloudSun'|'CloudSunRain'|'CloudUpload'|'CloudUploadAlt'|'Clover'|'Cny'|'Cocktail'|'Code'|'CodeBranch'|'CodeCommit'|'CodeCompare'|'CodeFork'|'CodeMerge'|'CodePullRequest'|'Coffee'|'Cog'|'Cogs'|'Coins'|'ColonSign'|'Columns'|'Comment'|'CommentAlt'|'CommentDollar'|'CommentDots'|'Commenting'|'CommentMedical'|'Comments'|'CommentsDollar'|'CommentSlash'|'CommentSms'|'CompactDisc'|'Compass'|'CompassDrafting'|'Compress'|'CompressAlt'|'CompressArrowsAlt'|'ComputerMouse'|'ConciergeBell'|'ContactBook'|'ContactCard'|'Cookie'|'CookieBite'|'Copy'|'Copyright'|'Couch'|'CreditCard'|'CreditCardAlt'|'Crop'|'CropAlt'|'CropSimple'|'Cross'|'Crosshairs'|'Crow'|'Crown'|'Crutch'|'CruzeiroSign'|'Cube'|'Cubes'|'Cut'|'Cutlery'|'D'|'Dashboard'|'Database'|'Deaf'|'Deafness'|'Dedent'|'DeleteLeft'|'Democrat'|'Desktop'|'DesktopAlt'|'Dharmachakra'|'Diagnoses'|'DiagramNext'|'DiagramPredecessor'|'DiagramProject'|'DiagramSuccessor'|'Diamond'|'DiamondTurnRight'|'Dice'|'DiceD20'|'DiceD6'|'DiceFive'|'DiceFour'|'DiceOne'|'DiceSix'|'DiceThree'|'DiceTwo'|'DigitalTachograph'|'Directions'|'Disease'|'Divide'|'Dizzy'|'Dna'|'Dog'|'Dollar'|'DollarSign'|'Dolly'|'DollyBox'|'DollyFlatbed'|'Donate'|'DongSign'|'DoorClosed'|'DoorOpen'|'DotCircle'|'Dove'|'DownLeftAndUpRightToCenter'|'Download'|'DownLong'|'DraftingCompass'|'Dragon'|'DrawPolygon'|'DriversLicense'|'Droplet'|'DropletSlash'|'Drum'|'DrumSteelpan'|'DrumstickBite'|'Dumbbell'|'Dumpster'|'DumpsterFire'|'Dungeon'|'E'|'EarDeaf'|'EarListen'|'Earth'|'EarthAfrica'|'EarthAmerica'|'EarthAmericas'|'EarthAsia'|'EarthEurope'|'EarthOceania'|'Edit'|'Egg'|'Eject'|'Elevator'|'Ellipsis'|'EllipsisH'|'EllipsisV'|'EllipsisVertical'|'Envelope'|'EnvelopeOpen'|'EnvelopeOpenText'|'EnvelopesBulk'|'EnvelopeSquare'|'Equals'|'Eraser'|'Ethernet'|'Eur'|'Euro'|'EuroSign'|'Exchange'|'ExchangeAlt'|'Exclamation'|'ExclamationCircle'|'ExclamationTriangle'|'Expand'|'ExpandAlt'|'ExpandArrowsAlt'|'ExternalLink'|'ExternalLinkAlt'|'ExternalLinkSquare'|'ExternalLinkSquareAlt'|'Eye'|'EyeDropper'|'EyeDropperEmpty'|'EyeLowVision'|'EyeSlash'|'F'|'FaceAngry'|'FaceDizzy'|'FaceFlushed'|'FaceFrown'|'FaceFrownOpen'|'FaceGrimace'|'FaceGrin'|'FaceGrinBeam'|'FaceGrinBeamSweat'|'FaceGrinHearts'|'FaceGrinSquint'|'FaceGrinSquintTears'|'FaceGrinStars'|'FaceGrinTears'|'FaceGrinTongue'|'FaceGrinTongueSquint'|'FaceGrinTongueWink'|'FaceGrinWide'|'FaceGrinWink'|'FaceKiss'|'FaceKissBeam'|'FaceKissWinkHeart'|'FaceLaugh'|'FaceLaughBeam'|'FaceLaughSquint'|'FaceLaughWink'|'FaceMeh'|'FaceMehBlank'|'FaceRollingEyes'|'FaceSadCry'|'FaceSadTear'|'FaceSmile'|'FaceSmileBeam'|'FaceSmileWink'|'FaceSurprise'|'FaceTired'|'Fan'|'FastBackward'|'FastForward'|'Faucet'|'Fax'|'Feather'|'FeatherAlt'|'FeatherPointed'|'Feed'|'Female'|'FighterJet'|'File'|'FileAlt'|'FileArchive'|'FileArrowDown'|'FileArrowUp'|'FileAudio'|'FileClipboard'|'FileCode'|'FileContract'|'FileCsv'|'FileDownload'|'FileExcel'|'FileExport'|'FileImage'|'FileImport'|'FileInvoice'|'FileInvoiceDollar'|'FileLines'|'FileMedical'|'FileMedicalAlt'|'FilePdf'|'FilePowerpoint'|'FilePrescription'|'FileSignature'|'FileText'|'FileUpload'|'FileVideo'|'FileWaveform'|'FileWord'|'FileZipper'|'Fill'|'FillDrip'|'Film'|'Filter'|'FilterCircleDollar'|'FilterCircleXmark'|'Fingerprint'|'Fire'|'FireAlt'|'FireExtinguisher'|'FireFlameCurved'|'FireFlameSimple'|'FirstAid'|'Fish'|'FistRaised'|'Flag'|'FlagCheckered'|'FlagUsa'|'Flask'|'FloppyDisk'|'FlorinSign'|'Flushed'|'Folder'|'FolderMinus'|'FolderOpen'|'FolderPlus'|'FolderTree'|'Font'|'FontAwesome'|'FontAwesomeFlag'|'FontAwesomeLogoFull'|'Football'|'FootballBall'|'Forward'|'ForwardFast'|'ForwardStep'|'FrancSign'|'Frog'|'Frown'|'FrownOpen'|'FunnelDollar'|'Futbol'|'FutbolBall'|'G'|'Gamepad'|'GasPump'|'Gauge'|'GaugeHigh'|'GaugeMed'|'GaugeSimple'|'GaugeSimpleHigh'|'GaugeSimpleMed'|'Gavel'|'Gbp'|'Gear'|'Gears'|'Gem'|'Genderless'|'Ghost'|'Gift'|'Gifts'|'GlassCheers'|'Glasses'|'GlassMartini'|'GlassMartiniAlt'|'GlassWhiskey'|'Globe'|'GlobeAfrica'|'GlobeAmericas'|'GlobeAsia'|'GlobeEurope'|'GlobeOceania'|'GolfBall'|'GolfBallTee'|'Gopuram'|'GraduationCap'|'GreaterThan'|'GreaterThanEqual'|'Grimace'|'Grin'|'GrinAlt'|'GrinBeam'|'GrinBeamSweat'|'GrinHearts'|'GrinSquint'|'GrinSquintTears'|'GrinStars'|'GrinTears'|'GrinTongue'|'GrinTongueSquint'|'GrinTongueWink'|'GrinWink'|'Grip'|'GripHorizontal'|'GripLines'|'GripLinesVertical'|'GripVertical'|'GuaraniSign'|'Guitar'|'Gun'|'H'|'Hamburger'|'Hammer'|'Hamsa'|'Hand'|'HandBackFist'|'HandDots'|'HandFist'|'HandHolding'|'HandHoldingDollar'|'HandHoldingDroplet'|'HandHoldingHeart'|'HandHoldingMedical'|'HandHoldingUsd'|'HandHoldingWater'|'HandLizard'|'HandMiddleFinger'|'HandPaper'|'HandPeace'|'HandPointDown'|'HandPointer'|'HandPointLeft'|'HandPointRight'|'HandPointUp'|'HandRock'|'Hands'|'HandsAmericanSignLanguageInterpreting'|'HandsAslInterpreting'|'HandsBubbles'|'HandScissors'|'HandsClapping'|'Handshake'|'HandshakeAltSlash'|'HandshakeAngle'|'HandshakeSimpleSlash'|'HandshakeSlash'|'HandsHelping'|'HandsHolding'|'HandSparkles'|'HandSpock'|'HandsPraying'|'HandsWash'|'Hanukiah'|'HardDrive'|'HardHat'|'HardOfHearing'|'Hashtag'|'HatCowboy'|'HatCowboySide'|'HatHard'|'HatWizard'|'Hdd'|'Header'|'Heading'|'Headphones'|'HeadphonesAlt'|'HeadphonesSimple'|'Headset'|'HeadSideCough'|'HeadSideCoughSlash'|'HeadSideMask'|'HeadSideVirus'|'Heart'|'Heartbeat'|'HeartBroken'|'HeartCrack'|'HeartMusicCameraBolt'|'HeartPulse'|'Helicopter'|'HelmetSafety'|'Highlighter'|'Hiking'|'Hippo'|'History'|'HockeyPuck'|'HollyBerry'|'Home'|'HomeAlt'|'HomeLg'|'HomeLgAlt'|'HomeUser'|'Horse'|'HorseHead'|'Hospital'|'HospitalAlt'|'HospitalSymbol'|'HospitalUser'|'HospitalWide'|'Hotdog'|'Hotel'|'HotTub'|'HotTubPerson'|'Hourglass'|'Hourglass1'|'Hourglass2'|'Hourglass3'|'HourglassEmpty'|'HourglassEnd'|'HourglassHalf'|'HourglassStart'|'House'|'HouseChimney'|'HouseChimneyCrack'|'HouseChimneyMedical'|'HouseChimneyUser'|'HouseChimneyWindow'|'HouseCrack'|'HouseDamage'|'HouseLaptop'|'HouseMedical'|'HouseUser'|'Hryvnia'|'HryvniaSign'|'HSquare'|'I'|'IceCream'|'Icicles'|'Icons'|'ICursor'|'IdBadge'|'IdCard'|'IdCardAlt'|'IdCardClip'|'Igloo'|'Ils'|'Image'|'ImagePortrait'|'Images'|'Inbox'|'Indent'|'IndianRupee'|'IndianRupeeSign'|'Industry'|'Infinity'|'Info'|'InfoCircle'|'Inr'|'Institution'|'Italic'|'J'|'Jedi'|'JetFighter'|'Joint'|'JournalWhills'|'Jpy'|'K'|'Kaaba'|'Key'|'Keyboard'|'Khanda'|'KipSign'|'Kiss'|'KissBeam'|'KissWinkHeart'|'KitMedical'|'KiwiBird'|'Krw'|'L'|'LadderWater'|'Landmark'|'Language'|'Laptop'|'LaptopCode'|'LaptopHouse'|'LaptopMedical'|'LariSign'|'Laugh'|'LaughBeam'|'LaughSquint'|'LaughWink'|'LayerGroup'|'Leaf'|'LeftLong'|'LeftRight'|'Legal'|'Lemon'|'LessThan'|'LessThanEqual'|'LevelDown'|'LevelDownAlt'|'LevelUp'|'LevelUpAlt'|'LifeRing'|'Lightbulb'|'LineChart'|'Link'|'LinkSlash'|'LiraSign'|'List'|'List12'|'ListAlt'|'ListCheck'|'ListDots'|'ListNumeric'|'ListOl'|'ListSquares'|'ListUl'|'LitecoinSign'|'Location'|'LocationArrow'|'LocationCrosshairs'|'LocationDot'|'LocationPin'|'Lock'|'LockOpen'|'LongArrowAltDown'|'LongArrowAltLeft'|'LongArrowAltRight'|'LongArrowAltUp'|'LongArrowDown'|'LongArrowLeft'|'LongArrowRight'|'LongArrowUp'|'LowVision'|'LuggageCart'|'Lungs'|'LungsVirus'|'M'|'Magic'|'MagicWandSparkles'|'Magnet'|'MagnifyingGlass'|'MagnifyingGlassDollar'|'MagnifyingGlassLocation'|'MagnifyingGlassMinus'|'MagnifyingGlassPlus'|'MailBulk'|'MailForward'|'MailReply'|'MailReplyAll'|'Male'|'ManatSign'|'Map'|'MapLocation'|'MapLocationDot'|'MapMarked'|'MapMarkedAlt'|'MapMarker'|'MapMarkerAlt'|'MapPin'|'MapSigns'|'Marker'|'Mars'|'MarsAndVenus'|'MarsDouble'|'MarsStroke'|'MarsStrokeH'|'MarsStrokeRight'|'MarsStrokeUp'|'MarsStrokeV'|'MartiniGlass'|'MartiniGlassCitrus'|'MartiniGlassEmpty'|'Mask'|'MaskFace'|'MasksTheater'|'Maximize'|'Medal'|'Medkit'|'Meh'|'MehBlank'|'MehRollingEyes'|'Memory'|'Menorah'|'Mercury'|'Message'|'Meteor'|'Microchip'|'Microphone'|'MicrophoneAlt'|'MicrophoneAltSlash'|'MicrophoneLines'|'MicrophoneLinesSlash'|'MicrophoneSlash'|'Microscope'|'MillSign'|'Minimize'|'Minus'|'MinusCircle'|'MinusSquare'|'Mitten'|'Mobile'|'MobileAlt'|'MobileAndroid'|'MobileButton'|'MobilePhone'|'MobileScreenButton'|'MoneyBill'|'MoneyBill1'|'MoneyBill1Wave'|'MoneyBillAlt'|'MoneyBillWave'|'MoneyBillWaveAlt'|'MoneyCheck'|'MoneyCheckAlt'|'MoneyCheckDollar'|'Monument'|'Moon'|'MortarBoard'|'MortarPestle'|'Mosque'|'Motorcycle'|'Mountain'|'Mouse'|'MousePointer'|'MugHot'|'MugSaucer'|'Multiply'|'Museum'|'Music'|'N'|'NairaSign'|'Navicon'|'NetworkWired'|'Neuter'|'Newspaper'|'NotEqual'|'NotesMedical'|'NoteSticky'|'O'|'ObjectGroup'|'ObjectUngroup'|'OilCan'|'Om'|'Otter'|'Outdent'|'P'|'Pager'|'Paintbrush'|'PaintRoller'|'Palette'|'Pallet'|'Panorama'|'Paperclip'|'PaperPlane'|'ParachuteBox'|'Paragraph'|'Parking'|'Passport'|'Pastafarianism'|'Paste'|'Pause'|'PauseCircle'|'Paw'|'Peace'|'Pen'|'PenAlt'|'Pencil'|'PencilAlt'|'PencilRuler'|'PencilSquare'|'PenClip'|'PenFancy'|'PenNib'|'PenRuler'|'PenSquare'|'PenToSquare'|'PeopleArrows'|'PeopleArrowsLeftRight'|'PeopleCarry'|'PeopleCarryBox'|'PepperHot'|'Percent'|'Percentage'|'Person'|'PersonBiking'|'PersonBooth'|'PersonDotsFromLine'|'PersonDress'|'PersonHiking'|'PersonPraying'|'PersonRunning'|'PersonSkating'|'PersonSkiing'|'PersonSkiingNordic'|'PersonSnowboarding'|'PersonSwimming'|'PersonWalking'|'PersonWalkingWithCane'|'PesetaSign'|'PesoSign'|'Phone'|'PhoneAlt'|'PhoneFlip'|'PhoneSlash'|'PhoneSquare'|'PhoneSquareAlt'|'PhoneVolume'|'PhotoFilm'|'PhotoVideo'|'PieChart'|'PiggyBank'|'Pills'|'PingPongPaddleBall'|'PizzaSlice'|'PlaceOfWorship'|'Plane'|'PlaneArrival'|'PlaneDeparture'|'PlaneSlash'|'Play'|'PlayCircle'|'Plug'|'Plus'|'PlusCircle'|'PlusMinus'|'PlusSquare'|'Podcast'|'Poll'|'PollH'|'Poo'|'PooBolt'|'Poop'|'PooStorm'|'Portrait'|'PoundSign'|'PowerOff'|'Pray'|'PrayingHands'|'Prescription'|'PrescriptionBottle'|'PrescriptionBottleAlt'|'PrescriptionBottleMedical'|'Print'|'Procedures'|'ProjectDiagram'|'PumpMedical'|'PumpSoap'|'PuzzlePiece'|'Q'|'Qrcode'|'Question'|'QuestionCircle'|'Quidditch'|'QuidditchBroomBall'|'QuoteLeft'|'QuoteLeftAlt'|'QuoteRight'|'QuoteRightAlt'|'Quran'|'R'|'Radiation'|'RadiationAlt'|'Rainbow'|'Random'|'Receipt'|'RecordVinyl'|'RectangleAd'|'RectangleList'|'RectangleTimes'|'RectangleXmark'|'Recycle'|'Redo'|'RedoAlt'|'Refresh'|'Registered'|'Remove'|'RemoveFormat'|'Reorder'|'Repeat'|'Reply'|'ReplyAll'|'Republican'|'Restroom'|'Retweet'|'Ribbon'|'RightFromBracket'|'RightLeft'|'RightLong'|'RightToBracket'|'Ring'|'Rmb'|'Road'|'Robot'|'Rocket'|'Rotate'|'RotateBack'|'RotateBackward'|'RotateForward'|'RotateLeft'|'RotateRight'|'Rouble'|'Route'|'Rss'|'RssSquare'|'Rub'|'Ruble'|'RubleSign'|'Ruler'|'RulerCombined'|'RulerHorizontal'|'RulerVertical'|'Running'|'Rupee'|'RupeeSign'|'RupiahSign'|'S'|'SadCry'|'SadTear'|'Sailboat'|'Satellite'|'SatelliteDish'|'Save'|'ScaleBalanced'|'ScaleUnbalanced'|'ScaleUnbalancedFlip'|'School'|'Scissors'|'Screwdriver'|'ScrewdriverWrench'|'Scroll'|'ScrollTorah'|'SdCard'|'Search'|'SearchDollar'|'SearchLocation'|'SearchMinus'|'SearchPlus'|'Section'|'Seedling'|'Server'|'Shapes'|'Share'|'ShareAlt'|'ShareAltSquare'|'ShareFromSquare'|'ShareNodes'|'ShareSquare'|'Shekel'|'ShekelSign'|'Sheqel'|'SheqelSign'|'Shield'|'ShieldAlt'|'ShieldBlank'|'ShieldVirus'|'Ship'|'ShippingFast'|'Shirt'|'ShoePrints'|'Shop'|'ShoppingBag'|'ShoppingBasket'|'ShoppingCart'|'ShopSlash'|'Shower'|'Shrimp'|'Shuffle'|'ShuttleSpace'|'ShuttleVan'|'Sign'|'Signal'|'Signal5'|'SignalPerfect'|'Signature'|'SignHanging'|'SignIn'|'SignInAlt'|'Signing'|'SignLanguage'|'SignOut'|'SignOutAlt'|'SignsPost'|'SimCard'|'Sink'|'Sitemap'|'Skating'|'Skiing'|'SkiingNordic'|'Skull'|'SkullCrossbones'|'Slash'|'Sleigh'|'Sliders'|'SlidersH'|'Smile'|'SmileBeam'|'SmileWink'|'Smog'|'Smoking'|'SmokingBan'|'Sms'|'Snowboarding'|'Snowflake'|'Snowman'|'Snowplow'|'Soap'|'SoccerBall'|'Socks'|'SolarPanel'|'Sort'|'SortAlphaAsc'|'SortAlphaDesc'|'SortAlphaDown'|'SortAlphaDownAlt'|'SortAlphaUp'|'SortAlphaUpAlt'|'SortAmountAsc'|'SortAmountDesc'|'SortAmountDown'|'SortAmountDownAlt'|'SortAmountUp'|'SortAmountUpAlt'|'SortAsc'|'SortDesc'|'SortDown'|'SortNumericAsc'|'SortNumericDesc'|'SortNumericDown'|'SortNumericDownAlt'|'SortNumericUp'|'SortNumericUpAlt'|'SortUp'|'Spa'|'SpaceShuttle'|'SpaghettiMonsterFlying'|'SpellCheck'|'Spider'|'Spinner'|'Splotch'|'Spoon'|'SprayCan'|'SprayCanSparkles'|'Sprout'|'Square'|'SquareArrowUpRight'|'SquareCaretDown'|'SquareCaretLeft'|'SquareCaretRight'|'SquareCaretUp'|'SquareCheck'|'SquareEnvelope'|'SquareFull'|'SquareH'|'SquareMinus'|'SquareParking'|'SquarePen'|'SquarePhone'|'SquarePhoneFlip'|'SquarePlus'|'SquarePollHorizontal'|'SquarePollVertical'|'SquareRootAlt'|'SquareRootVariable'|'SquareRss'|'SquareShareNodes'|'SquareUpRight'|'SquareXmark'|'Stairs'|'Stamp'|'Star'|'StarAndCrescent'|'StarHalf'|'StarHalfAlt'|'StarHalfStroke'|'StarOfDavid'|'StarOfLife'|'StepBackward'|'StepForward'|'SterlingSign'|'Stethoscope'|'StickyNote'|'Stop'|'StopCircle'|'Stopwatch'|'Stopwatch20'|'Store'|'StoreAlt'|'StoreAltSlash'|'StoreSlash'|'Stream'|'StreetView'|'Strikethrough'|'Stroopwafel'|'Subscript'|'Subtract'|'Subway'|'Suitcase'|'SuitcaseMedical'|'SuitcaseRolling'|'Sun'|'Superscript'|'Surprise'|'Swatchbook'|'Swimmer'|'SwimmingPool'|'Synagogue'|'Sync'|'SyncAlt'|'Syringe'|'T'|'Table'|'TableCells'|'TableCellsLarge'|'TableColumns'|'TableList'|'Tablet'|'TabletAlt'|'TabletAndroid'|'TabletButton'|'TableTennis'|'TableTennisPaddleBall'|'Tablets'|'TabletScreenButton'|'TachographDigital'|'Tachometer'|'TachometerAlt'|'TachometerAltAverage'|'TachometerAltFast'|'TachometerAverage'|'TachometerFast'|'Tag'|'Tags'|'Tape'|'Tasks'|'TasksAlt'|'Taxi'|'Teeth'|'TeethOpen'|'Teletype'|'Television'|'Temperature0'|'Temperature1'|'Temperature2'|'Temperature3'|'Temperature4'|'TemperatureEmpty'|'TemperatureFull'|'TemperatureHalf'|'TemperatureHigh'|'TemperatureLow'|'TemperatureQuarter'|'TemperatureThreeQuarters'|'Tenge'|'TengeSign'|'Terminal'|'TextHeight'|'TextSlash'|'TextWidth'|'Th'|'TheaterMasks'|'Thermometer'|'Thermometer0'|'Thermometer1'|'Thermometer2'|'Thermometer3'|'Thermometer4'|'ThermometerEmpty'|'ThermometerFull'|'ThermometerHalf'|'ThermometerQuarter'|'ThermometerThreeQuarters'|'ThLarge'|'ThList'|'ThumbsDown'|'ThumbsUp'|'Thumbtack'|'Ticket'|'TicketAlt'|'TicketSimple'|'Timeline'|'Times'|'TimesCircle'|'TimesRectangle'|'TimesSquare'|'Tint'|'TintSlash'|'Tired'|'ToggleOff'|'ToggleOn'|'Toilet'|'ToiletPaper'|'ToiletPaperSlash'|'Toolbox'|'Tools'|'Tooth'|'Torah'|'ToriiGate'|'TowerBroadcast'|'Tractor'|'Trademark'|'TrafficLight'|'Trailer'|'Train'|'TrainSubway'|'TrainTram'|'Tram'|'Transgender'|'TransgenderAlt'|'Trash'|'TrashAlt'|'TrashArrowUp'|'TrashCan'|'TrashCanArrowUp'|'TrashRestore'|'TrashRestoreAlt'|'Tree'|'TriangleCircleSquare'|'TriangleExclamation'|'Trophy'|'Truck'|'TruckFast'|'TruckLoading'|'TruckMedical'|'TruckMonster'|'TruckMoving'|'TruckPickup'|'TruckRampBox'|'Try'|'TShirt'|'Tty'|'TurkishLira'|'TurkishLiraSign'|'TurnDown'|'TurnUp'|'Tv'|'TvAlt'|'U'|'Umbrella'|'UmbrellaBeach'|'Underline'|'Undo'|'UndoAlt'|'UniversalAccess'|'University'|'Unlink'|'Unlock'|'UnlockAlt'|'UnlockKeyhole'|'Unsorted'|'UpDown'|'UpDownLeftRight'|'Upload'|'UpLong'|'UpRightAndDownLeftFromCenter'|'UpRightFromSquare'|'Usd'|'User'|'UserAlt'|'UserAltSlash'|'UserAstronaut'|'UserCheck'|'UserCircle'|'UserClock'|'UserCog'|'UserDoctor'|'UserEdit'|'UserFriends'|'UserGear'|'UserGraduate'|'UserGroup'|'UserInjured'|'UserLarge'|'UserLargeSlash'|'UserLock'|'UserMd'|'UserMinus'|'UserNinja'|'UserNurse'|'UserPen'|'UserPlus'|'Users'|'UsersCog'|'UserSecret'|'UsersGear'|'UserShield'|'UserSlash'|'UsersSlash'|'UserTag'|'UserTie'|'UserTimes'|'UserXmark'|'Utensils'|'UtensilSpoon'|'V'|'VanShuttle'|'Vault'|'Vcard'|'VectorSquare'|'Venus'|'VenusDouble'|'VenusMars'|'Vest'|'VestPatches'|'Vial'|'Vials'|'Video'|'VideoCamera'|'VideoSlash'|'Vihara'|'Virus'|'VirusCovid'|'VirusCovidSlash'|'Viruses'|'VirusSlash'|'Voicemail'|'Volleyball'|'VolleyballBall'|'VolumeControlPhone'|'VolumeDown'|'VolumeHigh'|'VolumeLow'|'VolumeMute'|'VolumeOff'|'VolumeTimes'|'VolumeUp'|'VolumeXmark'|'VoteYea'|'VrCardboard'|'W'|'Walking'|'Wallet'|'WandMagic'|'WandMagicSparkles'|'WandSparkles'|'Warehouse'|'Warning'|'Water'|'WaterLadder'|'WaveSquare'|'Weight'|'WeightHanging'|'WeightScale'|'Wheelchair'|'WhiskeyGlass'|'Wifi'|'Wifi3'|'WifiStrong'|'Wind'|'WindowClose'|'WindowMaximize'|'WindowMinimize'|'WindowRestore'|'WineBottle'|'WineGlass'|'WineGlassAlt'|'WineGlassEmpty'|'Won'|'WonSign'|'Wrench'|'X'|'Xmark'|'XmarkCircle'|'XmarkSquare'|'XRay'|'Y'|'Yen'|'YenSign'|'YinYang'|'Z'|'Zap';

        /** A UI color */
        export type UIColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
        export type UIColorWithWhite = 'white' | UIColor;
    }
}