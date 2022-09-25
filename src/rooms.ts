import { HMApi } from "./api.js";
import fs from "fs";
import { SettingsFieldDef } from "./plugins.js";
import { DeviceInstance, devices, favoriteDevices, getDeviceTypes, registeredDeviceTypes, saveDevices, setFavoriteDevices } from "./devices.js";
import { Log } from "./log.js";
import { checkType, HMApi_Types } from "./api_checkType.js";
const log = new Log("rooms");

export abstract class RoomControllerInstance {
    static id: `${string}:${string}`;
    static super_name: string;
    static sub_name: string;
    /** A list of fields for the room controller in the room edit page */
    static settingsFields: SettingsFieldDef[];

    id: string;
    name: string;
    icon: HMApi.T.Room['icon'];
    type: string;
    settings: Record<string, string|number|boolean>;

    disabled: false|string = false;
    initialized = false;
    devices: Record<string, DeviceInstance> = {};

    constructor(properties: HMApi.T.Room) {
        const id = this.id = properties.id;
        this.name = properties.name;
        this.icon = properties.icon;
        this.type = properties.controllerType.type;
        this.settings = properties.controllerType.settings;
        
        if (devices[id]) {
            const invalidDevices: string[] = [];
            for(const deviceId in devices[id]) {
                const device = devices[id][deviceId];
                const deviceType = getDeviceTypes(this.type)[device.type];
                if (!deviceType) {
                    console.error(`Warning: The device ${device.name} (${device.id}) in the room ${this.name} (${this.id}) has an invalid type. This was probably caused by deactivating the plugin that provided this device type. The device will be deleted.`);
                    log.e(`Device type type ${device.type} for device ${device.id} in room ${this.id} not found. This was probably caused by deactivating the plugin that registered this device type. Device will be deleted.`);
                    invalidDevices.push(device.id);
                    continue;
                }
                this.devices[deviceId] = new deviceType(device, id);
            }
            if (invalidDevices.length) {
                for (const id of invalidDevices) {
                    delete devices[this.id][id];
                }
                saveDevices();
            }
        }
    }

    async init() {
        Log.i(this.constructor.name, 'Room', this.id, 'Initializing');
        for(const deviceId in this.devices) {
            await this.devices[deviceId].init();
        }
        this.initialized = true;
    }

    async dispose() {
        Log.i(this.constructor.name, 'Room', this.id, 'Shutting down');
        for(const deviceId in this.devices) {
            await this.devices[deviceId].dispose();
        }
        this.initialized = false;
    }

    disable(reason: string) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Room', this.id, 'Disabled:', reason);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings: Record<string, string|number|boolean>): void | undefined | string | Promise<void | undefined | string> {
        return undefined;
    }
}

export type NonAbstractClass<T extends abstract new (...args: any)=>any> = Omit<T, 'prototype'> & (new (...args: ConstructorParameters<T>) => InstanceType<T>);

let rooms: { [id: string]: HMApi.T.Room } = {};
export let roomControllerInstances: { [id: string]: RoomControllerInstance } = {};

if(!(() => {
    if (!fs.existsSync('../data/rooms.json')) {
        log.w("data/rooms.json doesn't exist. Creating it...");
        return false;
    }

    const corruptError = "Warning: The file containing information about rooms is corrupt. The file will be recreated but all rooms have been lost.";
    const roomsJSON = fs.readFileSync('../data/rooms.json', 'utf8');
    if (!roomsJSON) { // This can happen when the hub crashes while saving rooms (it shouldn't), usually when a room controller is being initialized. This leads to a corrupted file.
        log.e("data/rooms.json exists but is empty. This was probably caused by a crash while saving the file. Recreating it...");
        console.error(corruptError);
        return false;
    }
    let parsed: typeof rooms;
    try {
        parsed = JSON.parse(roomsJSON);
    } catch(e) {
        log.e("data/rooms.json contains malformed JSON. Recreating it...");
        log.e(e);
        console.error(corruptError);
        return false;
    }

    // Check format
    if (!((typeof parsed === 'object') && !(parsed instanceof Array))) {
        log.e("data/rooms.json is corrupt: the type is not an object. Recreating it...");
        console.error(corruptError);
        return false;
    }

    // Check rooms
    const invalidRooms: string[] = [];
    for (const [id, room] of Object.entries(parsed)) {
        let err: ReturnType<typeof checkType>|string = checkType(room, HMApi_Types.objects.Room);
        if (id !== room.id) {
            err = 'room.id is not equal to its key.';
        }
        if (err) {
            console.error(`Warning: Part of the file containing information about the room ${room.name} (${id}) is corrupt. The room will be deleted.`);
            log.e(`data/rooms.json -> room ${id} is invalid:`, err);
            invalidRooms.push(id);
        }
    }
    for (const id of invalidRooms) {
        delete parsed[id];
    }
    rooms = parsed;
    return !invalidRooms.length; // WIll be false if it isn't empty.
})()) {
    saveRooms();
}

function saveRooms() {
    log.i("Saving data/rooms.json...");
    fs.writeFile('../data/rooms.json', JSON.stringify(rooms), ()=>undefined);
}

export function getRooms(): typeof rooms {
    return rooms;
}

export function getRoom(id: string): HMApi.T.Room | undefined {
    return rooms[id];
}


export async function editRoom(room: HMApi.T.Room): Promise<boolean|string> {
    const { id } = room;
    const oldRoom = rooms[id];
    if (!oldRoom) {
        return false;
    }

    const controllerType = registeredRoomControllers[room.controllerType.type];
    const err = await controllerType.validateSettings(room.controllerType.settings);
    if (err) return err;

    await roomControllerInstances[id].dispose();
    rooms[id] = room;
    saveRooms();
    roomControllerInstances[id] = new controllerType(room);
    await roomControllerInstances[id].init();
    return true;
}

export async function addRoom(room: HMApi.T.Room): Promise<boolean|string> {
    const { id } = room;
    if (rooms[id]) {
        return false;
    }

    const controllerType = registeredRoomControllers[room.controllerType.type];
    const err = await controllerType.validateSettings(room.controllerType.settings);
    if (err) return err;

    rooms[id] = room;
    saveRooms();
    roomControllerInstances[id] = new controllerType(room);
    await roomControllerInstances[id].init();
    return true;
}

export async function deleteRoom(id: string): Promise<boolean> {
    if (!rooms[id]) {
        return false;
    }
    await roomControllerInstances[id].dispose();
    delete roomControllerInstances[id];
    delete rooms[id];
    saveRooms();
    delete devices[id];
    saveDevices();
    setFavoriteDevices(favoriteDevices.filter(d => d[0] !== id));
    return true;
}

export function reorderRooms(ids: string[]): boolean {
    const oldIds= Object.keys(rooms);

    // Check if there are no added or removed rooms
    const added = ids.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !ids.includes(id));
    if(added.length || removed.length) {
        return false;
    }

    const newRooms: { [key: string]: HMApi.T.Room } = {};
    ids.forEach(id => {
        newRooms[id] = rooms[id];
    });
    rooms = newRooms;
    saveRooms();

    const newInstances: { [key: string]: RoomControllerInstance } = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[id];
    });
    roomControllerInstances = newInstances;

    return true;
}

export async function restartRoom(id: string): Promise<boolean> {
    if (!rooms[id]) {
        return false;
    }
    if(roomControllerInstances[id]) {
        await roomControllerInstances[id].dispose();
        delete roomControllerInstances[id];
    }
    roomControllerInstances[id] = new registeredRoomControllers[rooms[id].controllerType.type](rooms[id]);
    await roomControllerInstances[id].init();
    return true;
}


export const registeredRoomControllers: Record<string, RoomControllerClass> = {};

export type RoomControllerClass = NonAbstractClass<typeof RoomControllerInstance>;

export function registerRoomController(def: RoomControllerClass) {
    registeredRoomControllers[def.id] = def;
    log.d('Registered room controller', def.id);
}

export function getRoomControllerTypes(): HMApi.T.RoomControllerType[] {
    return Object.values(registeredRoomControllers).map(({id, super_name, sub_name, settingsFields}) => ({
        id,
        settings: settingsFields,
        name: super_name,
        sub_name,
    }));
}

export async function initRoomsDevices() {
    const invalidRooms: string[] = [];
    for (const room of Object.values(rooms)) {
        const controllerType = registeredRoomControllers[room.controllerType.type];
        if (!controllerType) {
            console.error(`Warning: The controller for the room ${room.name} (${room.id}) has an invalid type. This was probably caused by deactivating the plugin that provided this room controller type. The room will be deleted.`);
            log.e(`Room controller type ${room.controllerType.type} for room ${room.id} not found. This was probably caused by deactivating the plugin that registered this room controller type. Room will be deleted.`);
            invalidRooms.push(room.id);
            continue;
        }
        roomControllerInstances[room.id] = new controllerType(room);
    }
    if (invalidRooms.length) {
        for (const room of invalidRooms) {
            delete rooms[room];
        }
        saveRooms();
    }
    for(const instance of Object.values(roomControllerInstances)) {
        await instance.init();
    }
}

export async function shutDownRoomsDevices() {
    for(const instance of Object.values(roomControllerInstances)) {
        await instance.dispose();
    }
}