var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getRoom, roomControllerInstances } from "../rooms/rooms.js";
import { saveDevices } from "./devicesFile.js";
import { saveFavoriteDevices } from "./favoriteDevices.js";
import { devices, getDeviceTypes, favoriteDevices, setFavoriteDevices } from "./devices.js";
export function addDevice(roomId, device) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!getRoom(roomId))
            return 'room_not_found'; // Check if room exists
        devices[roomId] || (devices[roomId] = {});
        const { id } = device;
        if (devices[roomId][id]) {
            return 'device_exists';
        }
        const deviceType = getDeviceTypes(getRoom(roomId).controllerType.type)[device.type];
        const err = yield deviceType.validateSettings(device.params);
        if (err)
            return err;
        devices[roomId][id] = device;
        roomControllerInstances[roomId].devices[id] = new deviceType(device, roomControllerInstances[roomId]);
        saveDevices();
        yield roomControllerInstances[roomId].devices[id].init();
        return true;
    });
}
export function editDevice(roomId, device) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!getRoom(roomId))
            return 'room_not_found'; // Check if room exists
        const { id } = device;
        const oldDevice = (_a = devices[roomId]) === null || _a === void 0 ? void 0 : _a[id];
        if (!oldDevice) {
            return 'device_not_found';
        }
        const deviceType = getDeviceTypes(getRoom(roomId).controllerType.type)[device.type];
        const err = yield deviceType.validateSettings(device.params);
        if (err)
            return err;
        roomControllerInstances[roomId].devices[id].dispose();
        devices[roomId][id] = device;
        roomControllerInstances[roomId].devices[id] = new deviceType(device, roomControllerInstances[roomId]);
        saveDevices();
        yield roomControllerInstances[roomId].devices[id].init();
        return true;
    });
}
export function deleteDevice(roomId, deviceId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!getRoom(roomId))
            return 'room_not_found'; // Check if room exists
        if (!((_a = devices[roomId]) === null || _a === void 0 ? void 0 : _a[deviceId]))
            return 'device_not_found';
        roomControllerInstances[roomId].devices[deviceId].dispose();
        delete roomControllerInstances[roomId].devices[deviceId];
        delete devices[roomId][deviceId];
        saveDevices();
        setFavoriteDevices(favoriteDevices.filter(([room, device]) => room !== roomId || device !== deviceId));
        saveFavoriteDevices();
        return true;
    });
}
export function reorderDevices(roomId, ids) {
    if (!(roomId in devices)) {
        return 'room_not_found';
    }
    const oldIds = Object.keys(devices[roomId]);
    // Check if there are no added or removed devices
    const added = ids.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !ids.includes(id));
    if (added.length || removed.length) {
        return 'devices_not_equal';
    }
    const newDevices = {};
    ids.forEach(id => {
        newDevices[id] = devices[roomId][id];
    });
    devices[roomId] = newDevices;
    saveDevices();
    const newInstances = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[roomId].devices[id];
    });
    roomControllerInstances[roomId].devices = newInstances;
    return true;
}
