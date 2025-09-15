import type { HMApi } from "../api/api.ts";
import { checkType, HMApi_Types } from "../api/api_checkType.ts";
import { shutdownHandler } from "../async-cleanup.ts";
import { changePassword, changeUsername, checkAuthToken, getSessions, getSessionsCount, incrementRateLimit, loginUser, logOutOtherSessions, logOutSession, terminateSession, usernameExists } from "./auth.ts";
import { type DeviceTypeClass, endLiveSlider, getDevices, getDeviceStates, getDeviceTypes, getFavoriteDeviceStates, registeredDeviceTypes, restartDevice, sendDeviceInteractionAction, startLiveSlider, toggleDeviceIsFavorite } from "../devices/devices.ts";
import { addDevice, deleteDevice, editDevice, reorderDevices } from "../devices/editDevices.ts";
import getFlatFields from "../flat-fields.ts";
import { getInstalledPlugins, getInstalledPluginsInfo, type SettingsFieldDef, togglePluginIsActivated } from "../plugins.ts";
import { getRoomControllerTypes, getRooms, getRoomState, registeredRoomControllers, restartRoom, roomControllerInstances } from "../rooms/rooms.ts";
import { addRoom, deleteRoom, editRoom, reorderRooms } from "../rooms/editRooms.ts";
import version from "../version.ts";
import { routines } from "../automation/automation.ts";
import { addRoutine, deleteRoutine, editRoutine, reorderRoutines } from "../automation/editRoutines.ts";
import { registeredGlobalActions, registeredGlobalTriggers } from "../automation/global-actions-events.ts";
import { disableRoutine, enableRoutine, runRoutine } from "../automation/run-routine.ts";

function ok<R extends HMApi.Request>(data: HMApi.Response<R>): HMApi.ResponseOrError<R> {
    return { type: "ok", data };
}
function error<R extends HMApi.Request>(error: HMApi.Error<R>): HMApi.ResponseOrError<R> {
    return { type: "error", error };
}
// biome-ignore lint/suspicious/noExplicitAny: idk
type ExtractError<R extends HMApi.Request, E extends HMApi.Error<R>> = R extends any ? E extends HMApi.Error<R> ? R : never : never;
// biome-ignore lint/suspicious/noExplicitAny: idk
type RequestWith404 = ExtractError<HMApi.Request, HMApi.Error.NotFound<any>>;
type Get404Object<R extends HMApi.Request, E extends HMApi.Error<R>> = E extends HMApi.Error.NotFound<infer T> ? T : never
function error404<R extends RequestWith404>(object: Get404Object<R, HMApi.Error<R>>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    return error<R>({ code: 404, message: "NOT_FOUND", object });
}

type ExtractRequest<T extends HMApi.Request, U extends T['type']> =
    T extends { type: U; } ? T : never;
type RequestHandler<R extends HMApi.Request> = 
    (req: R, extra: {token:string, ip: string}) => Promise<HMApi.ResponseOrError<R>>;
const handleRequestFunctions: {[K in HMApi.Request['type']]: RequestHandler<ExtractRequest<HMApi.Request, K>>} = {
    
    
    async "empty"() {
        return ok({});
    },

    async "getVersion"() {
        return ok({ version });
    },

    async "restart"() {
        setTimeout(() => shutdownHandler('restart'), 100); // 100ms should be enough, since the whole process of sending the request from the frontend until receiving the result usually takes less than 100ms, let alone just sending the result from backend.
        return ok({});
    },


    async "account.login"(req, {ip}) {
        try {
            const token = loginUser(req.username, req.password, req.device, ip);
            return ok({ token });
        }
        catch (e) {
            if (e instanceof Error) {
                if (e.message === "USER_NOT_FOUND")
                    return error({ code: 401, message: "LOGIN_USER_NOT_FOUND" });
                if (e.message === "PASSWORD_INCORRECT")
                    return error({ code: 401, message: "LOGIN_PASSWORD_INCORRECT" });
                throw e;
            }
            throw e;
        }
    },

    async "account.logout"(_, { token }) {
        logOutSession(token);
        return ok({});
    },

    async "account.logoutOtherSessions"(_, { token }) {
        try {
            return ok({ sessions: logOutOtherSessions(token) });
        } catch (e) {
            if (e === 'SESSION_TOO_NEW')
                return error({ code: 403, message: "SESSION_TOO_NEW" });
            throw e;
        }
    },

    async "account.getSessionsCount"(_, { token }) {
        return ok({ sessions: getSessionsCount(token) });
    },

    async "account.getSessions"(_, { token }) {
        return ok({ sessions: getSessions(token) });
    },

    async "account.logoutSession"(req, { token }) {
        try {
            terminateSession(token, req.id);
            return ok({});
        } catch (err) {
            if (err === 'SESSION_NOT_FOUND') 
                return error404("session");
            if (err === 'SESSION_TOO_NEW') 
                return error({ code: 403, message: "SESSION_TOO_NEW" });
            throw err;
        }
    },

    async "account.changePassword"(req, { token }) {
        try {
            changePassword(token, req.oldPassword, req.newPassword);
            return ok({});
        } catch (err) {
            if (err === 'PASSWORD_INCORRECT') 
                return error({ code: 401, message: "LOGIN_PASSWORD_INCORRECT" });
            if (err === 'SESSION_TOO_NEW') 
                return error({ code: 403, message: "SESSION_TOO_NEW" });
            throw err;
        }
    },

    async "account.changeUsername"(req, { token }) {
        if (req.username.length < 3)
            return error({ code: 400, message: "USERNAME_TOO_SHORT" });
        
        try {
            const newTk = changeUsername(token, req.username);
            if (!newTk) {
                return error({ code: 400, message: "USERNAME_ALREADY_TAKEN" });
            }
            return ok({ token: newTk });
        } catch (err) {
            if (err === 'SESSION_TOO_NEW') 
                return error({ code: 403, message: "SESSION_TOO_NEW" });
            throw err;
        }
    },

    async "account.checkUsernameAvailable"(req, { token }){
        return ok({ available: !usernameExists(token, req.username) });
    },


    async "rooms.getRooms"() {
        return ok({ rooms: getRooms() });
    },

    async "rooms.editRoom"(req) {
        const res = await editRoom(req.room);
        if (res === true)
            return ok({});
        if (res) // Res is either 'true' or a string (in which case it is an error)
            return error({ code: 400, message: "CUSTOM_PLUGIN_ERROR", text: res });
        return error404("room");
    },

    async "rooms.addRoom"(req) {
        const res = await addRoom(req.room);
        if (res === true)
            return ok({});
        if (res) // Res is either 'true' or a string (in which case it is an error)
            return error({ code: 400, message: "CUSTOM_PLUGIN_ERROR", text: res });
        return error({ code: 400, message: "ROOM_ALREADY_EXISTS" });
    },

    async "rooms.removeRoom"(req) {
        const res = await deleteRoom(req.id);
        if (res)
            return ok({});
        return error404("room");
    },

    async "rooms.changeRoomOrder"(req) {
        if (reorderRooms(req.ids))
            return ok({});
        return error({ code: 400, message: "ROOMS_NOT_EQUAL" });
    },

    async "rooms.restartRoom"(req) {
        const success = await restartRoom(req.id);
        if (success)
            return ok({});
        return error404("room");
    },

    async "rooms.controllers.getRoomControllerTypes"() {
        return ok({ types: getRoomControllerTypes() });
    },

    async "plugins.fields.getSelectLazyLoadItems"(req) {
        let field: SettingsFieldDef | undefined;

        if (req.for === "device" || req.for === "roomController") {
            if (!(req.controller in registeredRoomControllers))
                return error404("controller");
            if (req.for === 'device' && !(req.deviceType in registeredDeviceTypes[req.controller]))
                return error404("deviceType");

            field = req.for === 'device' ?
                (getFlatFields(registeredDeviceTypes[req.controller][req.deviceType].settingsFields).find(f => f.id === req.field)) :
                (getFlatFields(registeredRoomControllers[req.controller].settingsFields).find(f => f.id === req.field));
        }
        else if (req.for === "deviceAction") {
            const deviceTypes = registeredDeviceTypes[req.controller];
            if (!deviceTypes)
                return error404("controller");
            const deviceType = deviceTypes[req.deviceType];
            if (!deviceType)
                return error404("deviceType");
            const action = deviceType.actions?.find(a => a.id === req.action);
            if (!action)
                return error404("deviceAction");
            field = getFlatFields(action.fields).find(f => f.id === req.field);
        } else {
            const types = req.for === "globalAction" ? registeredGlobalActions : registeredGlobalTriggers;
            const type = types[req.id];
            if (!type) return error404(req.for);
            field = getFlatFields(type.fields).find(f => f.id === req.field);
        }

        if (!field) return error404("field");

        if (field.type !== 'select' || Array.isArray(field.options) || !field.options.isLazy)
            return error({ code: 400, message: "FIELD_NOT_LAZY_SELECT" });

        const result = await field.options.callback();

        if (Array.isArray(result))
            return ok({ items: result });
        return error({ code: 400, message: "CUSTOM_PLUGIN_ERROR", text: result.text });
    },


    async "devices.getDevices"(req) {
        const devices = getDevices(req.roomId);
        if (devices === undefined)
            return error404("room");
        return ok({ devices });
    },

    async "devices.getDeviceTypes"(req) {
        // Check if the room controller type is valid
        if (!(req.controllerType in registeredRoomControllers))
            return error404("controller");

        return ok({
            types: Object.values(getDeviceTypes(req.controllerType))
                .map(({ id, super_name, sub_name, icon, settingsFields, forRoomController, hasMainToggle, events=[], actions=[] }): HMApi.T.DeviceType => ({
                    id, name: super_name, sub_name, settings: settingsFields, icon, forRoomController, hasMainToggle, events, actions
                }))
        });
    },

    async "devices.getDeviceType"(req) {
        const room = getRooms()[req.roomId];
        if (!room) return error404("room");
        const device = getDevices(req.roomId)?.[req.deviceId];
        if (!device) return error404("room");

        const {
            id, super_name, sub_name, icon,
            settingsFields, forRoomController, hasMainToggle, events=[], actions=[]
        } = getDeviceTypes(room.controllerType.type)[device.type];

        return ok({
            type: {
                id, name: super_name, sub_name,
                settings: settingsFields, icon,
                forRoomController, hasMainToggle,
                events, actions
            },
            roomController: room.controllerType.type
        });
    },

    async "devices.addDevice"(req) {
        const res = await addDevice(req.roomId, req.device);
        if (res === 'device_exists')
            return error({ code: 400, message: "DEVICE_ALREADY_EXISTS" });
        if (res === 'room_not_found')
            return error404("room");
        if (typeof res === 'string')
            return error({ code: 400, message: "CUSTOM_PLUGIN_ERROR", text: res });
        return ok({});
    },

    async "devices.editDevice"(req) {
        const res = await editDevice(req.roomId, req.device);
        if (res === 'device_not_found')
            return error404("device");
        if (res === 'room_not_found')
            return error404("room");
        if (typeof res === 'string')
            return error({ code: 400, message: "CUSTOM_PLUGIN_ERROR", text: res });
        return ok({});
    },

    async "devices.removeDevice"(req) {
        const res = await deleteDevice(req.roomId, req.id);
        if (res === 'device_not_found')
            return error404("device");
        if (res === 'room_not_found')
            return error404("room");
        return ok({});
    },

    async "devices.changeDeviceOrder"(req) {
        const res = reorderDevices(req.roomId, req.ids);
        if (res === 'devices_not_equal')
            return error({ code: 400, message: "DEVICES_NOT_EQUAL" });
        if (res === 'room_not_found')
            return error404("room");
        return ok({});
    },

    async "devices.restartDevice"(req) {
        const res = await restartDevice(req.roomId, req.id);
        if (res === 'device_not_found')
            return error404("device");
        if (res === 'room_not_found')
            return error404("room");
        if (res === 'room_disabled')
            return error({
                code: 500, message: "ROOM_DISABLED",
                error: roomControllerInstances[req.roomId].disabled as string
            });
        return ok({});
    },

    
    async "rooms.getRoomStates"() {
        return ok({
            states: Object.fromEntries(
                Object.keys(getRooms())
                    .map(key => [key, roomControllerInstances[key]] as const)
                    .map(([id, instance]) => [id, getRoomState(instance)])
            )
        });
    },

    async "devices.getDeviceStates"(req) {
        if (!(req.roomId in roomControllerInstances))
            return error404("room");

        return ok({ states: await getDeviceStates(req.roomId) });
    },

    async "devices.toggleDeviceMainToggle"(req) {
        if (!(req.roomId in roomControllerInstances))
            return error404("room");
        
        const roomController = roomControllerInstances[req.roomId];
        if (roomController.disabled)
            return error({ code: 500, message: "ROOM_DISABLED", error: roomController.disabled });
        
        if (!(req.id in roomController.devices))
            return error404("device");
        
        const device = roomController.devices[req.id];
        if (device.disabled)
            return error({ code: 500, message: "DEVICE_DISABLED", error: device.disabled });
        
        const deviceType = getDeviceTypes(roomController.type)[device.type];
        if (!deviceType.hasMainToggle)
            return error({ code: 400, message: "NO_MAIN_TOGGLE" });

        await device.toggleMainToggle();
        return ok({});
    },

    async "devices.getFavoriteDeviceStates"() {
        return ok({ states: await getFavoriteDeviceStates() });
    },

    async "devices.toggleDeviceIsFavorite"(req) {
        const res = await toggleDeviceIsFavorite(req.roomId, req.id, req.isFavorite);
        if (res === 'room_not_found')
            return error404("room");
        if (res === 'device_not_found')
            return error404("device");
        return ok({});
    },

    async "devices.interactions.sendAction"(req) {
        const res = await sendDeviceInteractionAction(req.roomId, req.deviceId, req.interactionId, req.action);
        switch (res) {
            case 'room_not_found':
                return error404("room");
            case 'device_not_found':
                return error404("device");
            case 'interaction_not_found':
                return error404("interaction");
            case 'room_disabled':
                return error({ code: 500, message: "ROOM_DISABLED", error: roomControllerInstances[req.roomId].disabled as string });
            case 'device_disabled':
                return error({ code: 500, message: "DEVICE_DISABLED", error: roomControllerInstances[req.roomId].devices[req.deviceId].disabled as string });
            case 'invalid_action':
                return error404("action");
            case 'value_out_of_range':
                return error({ code: 400, message: "PARAMETER_OUT_OF_RANGE", paramName: "action.value" });
            default:
                return ok({});
        }
    },

    async "devices.interactions.initSliderLiveValue"(req) {
        const room = roomControllerInstances[req.roomId];
        if (!room)
            return error404("room");
        if (room.disabled)
            return error({ code: 500, message: "ROOM_DISABLED", error: room.disabled });
        const device = room.devices[req.deviceId];
        if (!device)
            return error404("device");
        if (device.disabled)
            return error({ code: 500, message: "DEVICE_DISABLED", error: device.disabled });
        const interaction = (device.constructor as DeviceTypeClass).interactions[req.interactionId];
        if (!interaction)
            return error404("interaction");
        if (interaction.type !== 'slider')
            return error({ code: 400, message: "INTERACTION_TYPE_INVALID", expected: "slider" });
        return ok({ id: startLiveSlider(device, req.interactionId) });
    },

    async "devices.interactions.endSliderLiveValue"(req) {
        if (endLiveSlider(req.id))
            return ok({});
        return error404("stream");
    },


    async "plugins.getInstalledPlugins"() {
        return ok({ plugins: await getInstalledPluginsInfo() });
    },

    async "plugins.togglePluginIsActivated"(req) {
        if (!(await getInstalledPlugins()).includes(req.id)) {
            return error404("plugin");
        }

        setTimeout(() => {
            togglePluginIsActivated(req.id, req.isActivated);
        }, 100);

        return ok({});
    },

    async "automation.getRoutines"() {
        return ok({
            routines: routines.routines,
            order: routines.order
        });
    },

    async "automation.addRoutine"(req) {
        const res = await addRoutine(req.routine);
        if (res >= 0)
            return ok({ id: res });
        return error({ code: 400, message: "ROUTINE_ALREADY_EXISTS" });
    },

    async "automation.editRoutine"(req) {
        const res = await editRoutine(req.routine);
        if (!res)
            return ok({});
        if (res === "NOT_DISABLED")
            return error({ code: 400, message: "ROUTINE_NOT_DISABLED" });
        return error404("routine");
    },

    async "automation.removeRoutine"(req) {
        const res = await deleteRoutine(req.id);
        if (!res)
            return ok({});
        if (res === "NOT_DISABLED")
            return error({ code: 400, message: "ROUTINE_NOT_DISABLED" });
        return error404("routine");
    },

    async "automation.changeRoutineOrder"(req) {
        if (await reorderRoutines(req.ids))
            return ok({});
        return error({ code: 400, message: "ROUTINES_NOT_EQUAL" });
    },

    async "automation.getGlobalTriggers"() {
        return ok({
            triggers: Object.values(registeredGlobalTriggers).
                map(({ fields, id, name }) => ({ fields, id, name }))
        });
    },

    async "automation.getGlobalActions"() {
        return ok({
            actions: Object.values(registeredGlobalActions).
                map(({ fields, id, name }) => ({ fields, id, name }))
        });
    },

    async "automation.getRoutinesEnabled"() {
        return ok({ enabled: routines.enabled });
    },

    async "automation.setRoutinesEnabled"(req) {
        for (const id of req.routines) {
            if (!(id in routines.routines))
                return error404("routine");
            if (req.enabled) enableRoutine(id);
            else disableRoutine(id);
        }
        return ok({});
    },

    async "automation.getManualTriggerRoutines"() {
        return ok({
            routines: routines.order
                .filter(id => routines.enabled[id])
                .map(id => routines.routines[id])
                .flatMap(routine => (
                    routine.triggers
                        .filter(trigger => trigger.type === "manual")
                        .map(trigger => ({
                            id: routine.id,
                            label: (trigger as HMApi.T.Automation.Trigger.Manual).label
                        }))
                ))
        });
    },

    async "automation.triggerManualRoutine"(req) {
        const routine = routines.routines[req.routine];
        if (!routine) return error404("routine");
        if (!routine.triggers.some(tr => tr.type === "manual"))
            return error({ code: 400, message: "ROUTINE_NOT_MANUAL" });
        if (!routines.enabled[req.routine])
            return error({ code: 400, message: "ROUTINE_NOT_ENABLED" });

        await runRoutine(req.routine);
        return ok({});
    },
};

export default function handleRequest(token: string, req: HMApi.Request, ip: string): HMApi.ResponseOrError<HMApi.Request> | Promise<HMApi.ResponseOrError<HMApi.Request>> {
    if (req.type !== "account.login") {
        try {
            const username = checkAuthToken(token);
            if (!username) {
                return {
                    type: "error",
                    error: {
                        code: 401,
                        message: "TOKEN_INVALID"
                    }
                };
            }
            incrementRateLimit(token);
        } catch (e) {
            if (e === 'FLOOD') {
                return {
                    type: "error",
                    error: {
                        code: 429,
                        message: "TOO_MANY_REQUESTS"
                    }
                };
            }
            throw e;
        }
    }

    if (!(req.type in HMApi_Types.requests) || !(req.type in handleRequestFunctions))
        return error({ code: 400, message: "INVALID_REQUEST_TYPE" });
    
    const err = checkType(req, HMApi_Types.requests[req.type]);
    if (err) return error(err);

    // biome-ignore lint/suspicious/noExplicitAny: TS is stupid
    return handleRequestFunctions[req.type](req as any, { token, ip });
}