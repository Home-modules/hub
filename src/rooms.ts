import { HMApi } from "./api.js";
import fs from "fs";
import { SettingsFieldDef } from "./plugins.js";
import { DeviceInstance, devices, getDeviceTypes, registeredDeviceTypes, saveDevices } from "./devices.js";
import { Log } from "./log.js";
const log = new Log("rooms");

export abstract class RoomControllerInstance {
    static id: `${string}:${string}`;
    static super_name: string;
    static sub_name: string;
    /** A list of fields for the room controller in the room edit page */
    static settingsFields: SettingsFieldDef[];

    id: string;
    name: string;
    icon: HMApi.Room['icon'];
    type: string;
    settings: Record<string, string|number|boolean>;

    disabled: false|string = false;
    initialized = false;
    devices: Record<string, DeviceInstance> = {};

    constructor(properties: HMApi.Room) {
        const id = this.id = properties.id;
        this.name = properties.name;
        this.icon = properties.icon;
        this.type = properties.controllerType.type;
        this.settings = properties.controllerType.settings;
        
        if(devices[id]) {
            for(const deviceId in devices[id]) {
                const device = devices[id][deviceId];
                this.devices[deviceId] = new (getDeviceTypes(this.type)[device.type])(device, id);
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

let rooms: { [id: string]: HMApi.Room } = {};
export let roomControllerInstances: { [id: string]: RoomControllerInstance } = {};

if(fs.existsSync('../data/rooms.json')) {
    rooms= JSON.parse(fs.readFileSync('../data/rooms.json', 'utf8'));
} else saveRooms();

function saveRooms() {
    fs.writeFile('../data/rooms.json', JSON.stringify(rooms), ()=>undefined);
}

export function getRooms(): typeof rooms {
    return rooms;
}

export function getRoom(id: string): HMApi.Room | undefined {
    return rooms[id];
}


export async function editRoom(room: HMApi.Room): Promise<boolean|string> {
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

export async function addRoom(room: HMApi.Room): Promise<boolean|string> {
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

    const newRooms: { [key: string]: HMApi.Room } = {};
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

export function getRoomControllerTypes(): HMApi.RoomControllerType[] {
    return Object.values(registeredRoomControllers).map(({id, super_name, sub_name, settingsFields}) => ({
        id,
        settings: settingsFields,
        name: super_name,
        sub_name,
    }));
}

export async function initRoomsDevices() {
    for(const roomId in rooms) {
        roomControllerInstances[roomId] = new registeredRoomControllers[rooms[roomId].controllerType.type](rooms[roomId]);
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