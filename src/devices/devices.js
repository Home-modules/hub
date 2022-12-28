var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getRoom, getRooms, roomControllerInstances } from "../rooms/rooms.js";
import { Log } from "../log.js";
import { HMApi_Types } from "../api/api_checkType.js";
import { loadDevicesFile } from "./devicesFile.js";
import { loadFavoriteDevices, saveFavoriteDevices } from "./favoriteDevices.js";
export const log = new Log("devices");
export let devices = {};
export let favoriteDevices = [];
export function setDevices(Devices) { devices = Devices; }
export function setFavoriteDevices(favorites) { favoriteDevices = favorites; }
loadDevicesFile();
loadFavoriteDevices();
export function getDevices(roomId) {
    if (getRoom(roomId)) { // Check if room exists
        return devices[roomId] || {};
    }
}
export const registeredDeviceTypes = {}; // For each controller, there are different devices.
export function registerDeviceType(def) {
    var _a;
    log.d("Registering device type", def.id);
    registeredDeviceTypes[_a = def.forRoomController] || (registeredDeviceTypes[_a] = {});
    registeredDeviceTypes[def.forRoomController][def.id] = def;
}
export function getDeviceTypes(controllerType) {
    const [superType] = controllerType.split(":");
    return Object.assign(Object.assign(Object.assign({}, registeredDeviceTypes[controllerType]), registeredDeviceTypes[superType + ":*"]), registeredDeviceTypes['*']);
}
export function restartDevice(roomId, id) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!getRooms()[roomId]) {
            return 'room_not_found';
        }
        if (!((_a = devices[roomId]) === null || _a === void 0 ? void 0 : _a[id])) {
            return 'device_not_found';
        }
        const room = roomControllerInstances[roomId];
        if (room.disabled) {
            return 'room_disabled';
        }
        const device = room.devices[id];
        if (device) {
            yield device.dispose();
            delete room.devices[id];
        }
        room.devices[id] = new (getDeviceTypes(room.type)[device.type])(devices[roomId][id], roomControllerInstances[roomId]);
        yield room.devices[id].init();
    });
}
export function getDeviceStates(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const controller = roomControllerInstances[roomId];
        const deviceTypes = getDeviceTypes(controller.type);
        const instanceEntries = Object.keys(getDevices(roomId)).map(key => [key, controller.devices[key]]);
        return Object.fromEntries(yield Promise.all(instanceEntries.map(([id, instance]) => __awaiter(this, void 0, void 0, function* () { return ([id, yield getDeviceState(instance, deviceTypes[instance.type])]); }))));
    });
}
export function getDeviceState(instance, deviceType) {
    return __awaiter(this, void 0, void 0, function* () {
        const { mainToggleState, icon, iconText, iconColor, activeColor, interactionStates } = yield instance.getCurrentState();
        return Object.assign(Object.assign({}, (instance.disabled === false ? {
            disabled: false,
        } : {
            disabled: true,
            error: instance.disabled,
        })), { id: instance.id, roomId: instance.roomId, isFavorite: favoriteDevices.some(([rId, dId]) => rId === instance.roomId && dId === instance.id), name: instance.name, type: (({ id, super_name, sub_name, icon, interactions, defaultInteraction, defaultInteractionWhenOff, forRoomController }) => ({
                id, name: super_name, sub_name, icon, interactions, forRoomController,
                defaultInteraction: (deviceType.hasMainToggle && !mainToggleState) ? defaultInteractionWhenOff : defaultInteraction
            }))(deviceType), icon,
            iconText,
            iconColor, hasMainToggle: deviceType.hasMainToggle, mainToggleState,
            activeColor, clickable: deviceType.clickable, interactions: interactionStates });
    });
}
export function getFavoriteDeviceStates() {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(favoriteDevices.map(([roomId, deviceId]) => __awaiter(this, void 0, void 0, function* () {
            const roomController = roomControllerInstances[roomId];
            const device = roomController.devices[deviceId];
            const deviceType = getDeviceTypes(roomController.type)[device.type];
            if (roomController.disabled)
                return undefined;
            return getDeviceState(device, deviceType);
        }))).then(states => states.filter(Boolean));
    });
}
export function toggleDeviceIsFavorite(roomId, deviceId, isFavorite) {
    if (!(roomId in getRooms())) {
        return 'room_not_found';
    }
    if (!(deviceId in devices[roomId])) {
        return 'device_not_found';
    }
    if (isFavorite) {
        if (favoriteDevices.some(([rId, dId]) => rId === roomId && dId === deviceId))
            return; // Check if device is already a favorite. If so, do nothing
        favoriteDevices.push([roomId, deviceId]);
    }
    else {
        favoriteDevices = favoriteDevices.filter(([r, d]) => !(r === roomId && d === deviceId));
    }
    saveFavoriteDevices();
}
export function sendDeviceInteractionAction(roomId, deviceId, interactionId, action) {
    const roomController = roomControllerInstances[roomId];
    if (!roomController)
        return 'room_not_found';
    if (roomController.disabled)
        return 'room_disabled';
    const device = roomController.devices[deviceId];
    if (!device)
        return 'device_not_found';
    if (device.disabled)
        return 'device_disabled';
    let interaction = device.constructor.interactions[interactionId];
    if (!interaction)
        return 'interaction_not_found';
    if (!HMApi_Types.objects.DeviceInteractionActionsPerInteraction[interaction.type].includes(action.type))
        return 'invalid_action';
    switch (action.type) {
        case 'setTwoButtonNumberValue':
        case 'setSliderValue': {
            interaction = interaction;
            // Check min and max and step
            if ((interaction.min !== undefined &&
                action.value < interaction.min) || (interaction.max !== undefined &&
                action.value > interaction.max) || (interaction.step !== undefined &&
                (action.value - (interaction.min === undefined ? 0 : interaction.min)) % interaction.step !== 0)) {
                return 'value_out_of_range';
            }
            break;
        }
        case 'setUIColorInputValue': {
            interaction = interaction;
            if (interaction.allowed !== undefined && !interaction.allowed.includes(action.color)) {
                return 'value_out_of_range';
            }
            break;
        }
    }
    return device.sendInteractionAction(interactionId, action);
}
