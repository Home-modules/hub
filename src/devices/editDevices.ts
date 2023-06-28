import { HMApi } from "../api/api.js";
import { getRoom, roomControllerInstances } from "../rooms/rooms.js";
import { DeviceInstance } from "./DeviceInstance.js";
import { saveDevices } from "./devicesFile.js";
import { saveFavoriteDevices } from "./favoriteDevices.js";
import { devices, getDeviceTypes, favoriteDevices, setFavoriteDevices } from "./devices.js";


export async function addDevice(roomId: string, device: HMApi.T.Device): Promise<true | "room_not_found" | "device_exists" | string> {
    if (!getRoom(roomId))
        return 'room_not_found'; // Check if room exists

    devices[roomId] ||= {};
    const { id } = device;
    if (devices[roomId][id]) {
        return 'device_exists';
    }

    const deviceType = getDeviceTypes((getRoom(roomId) as HMApi.T.Room).controllerType.type)[device.type];

    const err = await deviceType.validateSettings(device.params);
    if (err)
        return err;

    devices[roomId][id] = device;
    roomControllerInstances[roomId].devices[id] = new deviceType(device, roomControllerInstances[roomId]);
    saveDevices();
    await roomControllerInstances[roomId].devices[id].init();
    return true;
}

export async function editDevice(roomId: string, device: HMApi.T.Device): Promise<true | "room_not_found" | "device_not_found" | string> {
    if (!getRoom(roomId))
        return 'room_not_found'; // Check if room exists

    const { id } = device;
    const oldDevice = devices[roomId]?.[id];
    if (!oldDevice) {
        return 'device_not_found';
    }

    const deviceType = getDeviceTypes((getRoom(roomId) as HMApi.T.Room).controllerType.type)[device.type];

    const err = await deviceType.validateSettings(device.params);
    if (err)
        return err;
    device.params = { ...device.params, '@extra': oldDevice.params['@extra'] };

    roomControllerInstances[roomId].devices[id].dispose();
    devices[roomId][id] = device;
    roomControllerInstances[roomId].devices[id] = new deviceType(device, roomControllerInstances[roomId]);
    saveDevices();
    await roomControllerInstances[roomId].devices[id].init();
    return true;
}

export async function deleteDevice(roomId: string, deviceId: string): Promise<true | "room_not_found" | "device_not_found"> {
    if (!getRoom(roomId))
        return 'room_not_found'; // Check if room exists
    if (!devices[roomId]?.[deviceId])
        return 'device_not_found';

    roomControllerInstances[roomId].devices[deviceId].dispose();
    delete roomControllerInstances[roomId].devices[deviceId];
    delete devices[roomId][deviceId];
    saveDevices();
    setFavoriteDevices(favoriteDevices.filter(([room, device]) => room !== roomId || device !== deviceId));
    saveFavoriteDevices();
    return true;
}

export function reorderDevices(roomId: string, ids: string[]): 'room_not_found' | 'devices_not_equal' | true {
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

    const newDevices: { [key: string]: HMApi.T.Device; } = {};
    ids.forEach(id => {
        newDevices[id] = devices[roomId][id];
    });
    devices[roomId] = newDevices;
    saveDevices();

    const newInstances: { [key: string]: DeviceInstance; } = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[roomId].devices[id];
    });
    roomControllerInstances[roomId].devices = newInstances;

    return true;
}
