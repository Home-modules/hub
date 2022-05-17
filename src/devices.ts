import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";
import { getRoom } from "./rooms.js";
import fs from "fs";



export let devices: Record<string, Record<string, HMApi.Device>> = {
};


if(fs.existsSync('../data/devices.json')) {
    devices= JSON.parse(fs.readFileSync('../data/devices.json', 'utf8'));
} else saveDevices();

export function saveDevices() {
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
    /** Called when the rooms settings are saved to validate the room controller options. May return nothing/undefined when there are no errors or an error string when there is one. */
    onValidateSettings(values: Record<string, string|number|boolean>): void | undefined | string | Promise<void | undefined | string>,
    /** Called when the device starts/restarts (e.g. every time the hub starts and when the device is created) */
    onInit(device: HMApi.Device, room: HMApi.Room): void,
    /** Called before the device stops/restarts */
    onBeforeShutdown(device: HMApi.Device, room: HMApi.Room): void,
}

export function getDeviceTypes(controllerType: string): DeviceTypeDef[] {
    const [superType] = controllerType.split(":");
    return Object.values({...registeredDeviceTypes[controllerType], ...registeredDeviceTypes[superType + ":*"]});
}

export async function initDevice(roomId: string, id: string) {
    const room = getRoom(roomId) as HMApi.Room;
    const device = devices[roomId][id];
    const deviceTypes = {
        ...registeredDeviceTypes[room.controllerType.type],
        ...registeredDeviceTypes[room.controllerType.type.split(':')[0] + ":*"],
    };
    await deviceTypes[device.type].onInit(device, room);
}

export async function shutDownDevice(roomId: string, id: string) {
    const room = getRoom(roomId) as HMApi.Room;
    const device = devices[roomId][id];
    const deviceTypes = {
        ...registeredDeviceTypes[room.controllerType.type],
        ...registeredDeviceTypes[room.controllerType.type.split(':')[0] + ":*"],
    };
    await deviceTypes[device.type].onBeforeShutdown(device, room);
}

function validateOptions(roomId: string, deviceType: string, options: Record<string, string | number | boolean>) {
    const room = getRoom(roomId) as HMApi.Room;
    const deviceTypes = {
        ...registeredDeviceTypes[room.controllerType.type],
        ...registeredDeviceTypes[room.controllerType.type.split(':')[0] + ":*"],
    };
    return deviceTypes[deviceType].onValidateSettings(options);
}

export async function addDevice(roomId: string, device: HMApi.Device): Promise<true | "room_not_found" | "device_exists"|string> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    devices[roomId] ||= {};
    const { id } = device;
    if (devices[roomId][id]) {
        return 'device_exists';
    }

    const err = await validateOptions(roomId, device.type, device.params);
    if(err) return err;

    devices[roomId][id] = device;
    saveDevices();
    await initDevice(roomId, id);
    return true;
}

export async function editDevice(roomId: string, device: HMApi.Device): Promise<true | "room_not_found" | "device_not_found" | string> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    const { id } = device;
    const oldDevice = devices[roomId]?.[id];
    if (!oldDevice) {
        return 'device_not_found';
    }
    
    const err = await validateOptions(roomId, device.type, device.params);
    if(err) return err;

    await shutDownDevice(roomId, id);
    devices[roomId][id] = device;
    saveDevices();
    await initDevice(roomId, id);
    return true;
}

export async function deleteDevice(roomId: string, deviceId: string): Promise<true | "room_not_found" | "device_not_found"> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists
    if(!devices[roomId]?.[deviceId]) return 'device_not_found';
    await shutDownDevice(roomId, deviceId);
    delete devices[roomId][deviceId];
    saveDevices();
    return true;
}