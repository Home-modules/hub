import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";
import { getRoom } from "./rooms.js";
import fs from "fs";



let devices: Record<string, Record<string, HMApi.Device>> = {
};


if(fs.existsSync('../data/devices.json')) {
    devices= JSON.parse(fs.readFileSync('../data/devices.json', 'utf8'));
} else saveDevices();

function saveDevices() {
    fs.writeFile('../data/devices.json', JSON.stringify(devices), ()=>undefined);
}

export function getDevices(roomId: string): Record<string, HMApi.Device> | undefined {
    if(getRoom(roomId)) { // Check if room exists
        return devices[roomId] || {};
    }
}

export const registeredDeviceTypes: Record<string, Record<string, DeviceTypeDef>>= {}; // For each controller, there are different devices.

export function registerDeviceType(def: DeviceTypeDef) {
    registeredDeviceTypes[def.forRoomController] ||= {};
    registeredDeviceTypes[def.forRoomController][def.id] = def;
}

export type DeviceTypeDef = {
    id: `${string}:${string}`,
    name: string,
    sub_name: string,
    icon: HMApi.IconName,
    /** The room controller with which the device is compatible with. If it ends with `:*` (like `test:*`), the device is considered compatible with all subtypes. */
    forRoomController: `${string}:*`|`${string}:${string}`,
    /** A list of fields for the device in the edit page */
    settingsFields: SettingsFieldDef[],
    /** Called when the rooms settings are saved to validate the room controller options. May return nothing/undefined when there are no errors or an object when there is an error. (object contents are error info, keys and values should be strings) */
    onValidateSettings(values: Record<string, string|number|boolean>): void | undefined | Record<string, string>,
    /** Called when the device starts/restarts (e.g. every time the hub starts and when the device is created) */
    onInit(device: HMApi.Device): void,
    onBeforeShutdown(device: HMApi.Device): void,
}

export function getDeviceTypes(controllerType: string): DeviceTypeDef[] {
    const [superType] = controllerType.split(":");
    return Object.values({...registeredDeviceTypes[controllerType], ...registeredDeviceTypes[superType + ":*"]});
}

export function addDevice(roomId: string, device: HMApi.Device): 'room_not_found'|'device_exists'|true {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    devices[roomId] ||= {};
    const { id } = device;
    if (devices[roomId][id]) {
        return 'device_exists';
    }
    devices[roomId][id] = device;
    saveDevices();
    return true;
}

export function editDevice(roomId: string, device: HMApi.Device): 'room_not_found'|'device_not_found'|true {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    const { id } = device;
    const oldDevice = devices[roomId]?.[id];
    if (!oldDevice) {
        return 'device_not_found';
    }
    devices[roomId][id] = device;
    saveDevices();
    return true;
}

export function deleteDevice(roomId: string, deviceId: string): 'room_not_found'|'device_not_found'|true {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists
    if(!devices[roomId]?.[deviceId]) return 'device_not_found';
    delete devices[roomId][deviceId];
    saveDevices();
    return true;
}