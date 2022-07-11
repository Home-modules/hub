import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";
import { getRoom, NonAbstractClass, roomControllerInstances } from "./rooms.js";
import fs from "fs";
import { Log } from "./log.js";
const log = new Log("devices");

export abstract class DeviceInstance {
    static id: `${string}:${string}`;
    static super_name: string;
    static sub_name: string;
    static icon: HMApi.IconName;
    /** The room controller with which the device is compatible with. If it ends with `:*` (like `test:*`), the device is considered compatible with all subtypes. */
    static forRoomController: `${string}:*`|`${string}:${string}`;
    /** A list of fields for the device in the edit page */
    static settingsFields: SettingsFieldDef[];


    id: string;
    name: string;
    type: string;
    settings: Record<string, string|number|boolean>;
    roomId: string;

    disabled: false|string = false;
    initialized = false;

    constructor(public properties: HMApi.Device, roomId: string) {
        this.id = properties.id;
        this.name = properties.name;
        this.type = properties.type;
        this.settings = properties.params;
        this.roomId = roomId;
    }

    async init() {
        Log.i(this.constructor.name, 'Device', this.id, 'Initializing');
        this.initialized = true;
    }

    async dispose() {
        Log.i(this.constructor.name, 'Device', this.id, 'Shutting down');
        this.initialized = false;
    }

    get roomController() {
        return roomControllerInstances[this.roomId];
    }

    disable(reason: string) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Device', this.id, 'Disabled:', reason);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings: Record<string, string|number|boolean>): void | undefined | string | Promise<void | undefined | string> {
        return undefined;
    }
}

export let devices: Record<string, Record<string, HMApi.Device>> = { };

if(fs.existsSync('../data/devices.json')) {
    devices= JSON.parse(fs.readFileSync('../data/devices.json', 'utf8'));
} else saveDevices();

export function saveDevices() {
    fs.writeFile('../data/devices.json', JSON.stringify(devices), ()=>undefined);
    log.d("Saving devices");
}

export function getDevices(roomId: string): Record<string, HMApi.Device> | undefined {
    if(getRoom(roomId)) { // Check if room exists
        return devices[roomId] || {};
    }
}

export const registeredDeviceTypes: Record<string, Record<string, DeviceTypeClass>>= {}; // For each controller, there are different devices.

export function registerDeviceType(def: DeviceTypeClass) {
    log.d("Registering device type", def.id);
    registeredDeviceTypes[def.forRoomController] ||= {};
    registeredDeviceTypes[def.forRoomController][def.id] = def;
}

export type DeviceTypeClass =  NonAbstractClass<typeof DeviceInstance>

export function getDeviceTypes(controllerType: string) {
    const [superType] = controllerType.split(":");
    return {...registeredDeviceTypes[controllerType], ...registeredDeviceTypes[superType + ":*"]};
}

// export async function initDevice(roomId: string, id: string) {
//     const room = getRoom(roomId) as HMApi.Room;
//     const device = devices[roomId][id];
//     const deviceTypes = {
//         ...registeredDeviceTypes[room.controllerType.type],
//         ...registeredDeviceTypes[room.controllerType.type.split(':')[0] + ":*"],
//     };
//     try {
//         await deviceTypes[device.type].onInit(device, room);
//     } catch(err) {
//         disabledDevices[roomId] ||= {};
//         disabledDevices[roomId][id] = String(err);
//     }
// }

// export async function shutDownDevice(roomId: string, id: string) {
//     if(disabledDevices[roomId]?.[id]) {
//         return; // Disabled devices are uninitialized
//     }
//     const room = getRoom(roomId) as HMApi.Room;
//     const device = devices[roomId][id];
//     const deviceTypes = {
//         ...registeredDeviceTypes[room.controllerType.type],
//         ...registeredDeviceTypes[room.controllerType.type.split(':')[0] + ":*"],
//     };
//     await deviceTypes[device.type].onBeforeShutdown(device, room);
// }

// function validateOptions(roomId: string, deviceType: string, options: Record<string, string | number | boolean>) {
//     const room = getRoom(roomId) as HMApi.Room;
//     const deviceTypes = {
//         ...registeredDeviceTypes[room.controllerType.type],
//         ...registeredDeviceTypes[room.controllerType.type.split(':')[0] + ":*"],
//     };
//     return deviceTypes[deviceType].onValidateSettings(options);
// }

export async function addDevice(roomId: string, device: HMApi.Device): Promise<true | "room_not_found" | "device_exists"|string> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    devices[roomId] ||= {};
    const { id } = device;
    if (devices[roomId][id]) {
        return 'device_exists';
    }

    const deviceType= getDeviceTypes((getRoom(roomId) as HMApi.Room).controllerType.type)[device.type];

    const err = await deviceType.validateSettings(device.params);
    if(err) return err;

    devices[roomId][id] = device;
    roomControllerInstances[roomId].devices[id] = new deviceType(device, roomId);
    saveDevices();
    await roomControllerInstances[roomId].devices[id].init();
    return true;
}

export async function editDevice(roomId: string, device: HMApi.Device): Promise<true | "room_not_found" | "device_not_found" | string> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    const { id } = device;
    const oldDevice = devices[roomId]?.[id];
    if (!oldDevice) {
        return 'device_not_found';
    }

    const deviceType= getDeviceTypes((getRoom(roomId) as HMApi.Room).controllerType.type)[device.type];

    const err = await deviceType.validateSettings(device.params);
    if(err) return err;

    roomControllerInstances[roomId].devices[id].dispose();
    devices[roomId][id] = device;
    roomControllerInstances[roomId].devices[id] = new deviceType(device, roomId);
    saveDevices();
    await roomControllerInstances[roomId].devices[id].init();
    return true;
}

export async function deleteDevice(roomId: string, deviceId: string): Promise<true | "room_not_found" | "device_not_found"> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists
    if(!devices[roomId]?.[deviceId]) return 'device_not_found';

    roomControllerInstances[roomId].devices[deviceId].dispose();
    delete roomControllerInstances[roomId].devices[deviceId];
    delete devices[roomId][deviceId];
    saveDevices();
    return true;
}

export function reorderDevices(roomId: string, ids: string[]): 'room_not_found'|'devices_not_equal'|true {
    if(!(roomId in devices)) {
        return 'room_not_found';
    }
    
    const oldIds= Object.keys(devices[roomId]);

    // Check if there are no added or removed devices
    const added = ids.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !ids.includes(id));
    if(added.length || removed.length) {
        return 'devices_not_equal';
    }

    const newDevices: { [key: string]: HMApi.Device } = {};
    ids.forEach(id => {
        newDevices[id] = devices[roomId][id];
    });
    devices[roomId] = newDevices;
    saveDevices();

    const newInstances: { [key: string]: DeviceInstance } = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[roomId].devices[id];
    });
    roomControllerInstances[roomId].devices = newInstances;

    return true;
}