import { HMApi } from "./api.js";
import fs from "fs";
import { SettingsFieldDef } from "./plugins.js";
import { devices, initDevice, saveDevices, shutDownDevice } from "./devices.js";

let rooms: { [id: string]: HMApi.Room } = {};
const disabledRooms: { [id: string]: string|undefined } = {};

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

export async function initRoom(id: string) {
    const room= rooms[id];
    try {
        await registeredRoomControllers[room.controllerType.type].onInit(room);
    } catch (err) {
        disabledRooms[id] = String(err);
        return;
    }
    if(devices[id]) {
        for(const deviceId in devices[id]) {
            await initDevice(id, deviceId);
        }
    }
}

export async function shutDownRoom(id: string) {
    if(disabledRooms[id]) {
        return; // Disabled rooms are not initialized
    }
    const room= rooms[id];
    if(devices[id]) {
        for(const deviceId in devices[id]) {
            await shutDownDevice(id, deviceId);
        }
    }
    await registeredRoomControllers[room.controllerType.type].onBeforeShutdown(room);
    disabledRooms[id] = undefined;
}


export async function editRoom(room: HMApi.Room): Promise<boolean|string> {
    const { id } = room;
    const oldRoom = rooms[id];
    if (!oldRoom) {
        return false;
    }

    const err = await registeredRoomControllers[room.controllerType.type].onValidateSettings(room.controllerType.settings);
    if (err) return err;

    await shutDownRoom(id);
    rooms[id] = room;
    saveRooms();
    await initRoom(id);
    return true;
}

export async function addRoom(room: HMApi.Room): Promise<boolean|string> {
    const { id } = room;
    if (rooms[id]) {
        return false;
    }

    const err = await registeredRoomControllers[room.controllerType.type].onValidateSettings(room.controllerType.settings);
    if (err) return err;

    rooms[id] = room;
    await initRoom(id);
    saveRooms();
    return true;
}

export async function deleteRoom(id: string): Promise<boolean> {
    if (!rooms[id]) {
        return false;
    }
    await shutDownRoom(id);
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
    return true;
}


export const registeredRoomControllers: Record<string, RoomControllerDef> = {};

export type RoomControllerDef = {
    id: `${string}:${string}`,
    name: string,
    sub_name: string,
    /** Called when the room starts/restarts (e.g. every time the hub starts and when the room is created) */
    onInit(room: HMApi.Room): void|Promise<void>,
    /** Called before the room shuts down/restarts (e.g. when hub is turning off and when the room is deleted). Devices will already have shut down when this is called.  */
    onBeforeShutdown(room: HMApi.Room): void|Promise<void>,
    /** Called when the rooms settings are saved to validate the room controller options. May return nothing/undefined when there are no errors or an error string when there is one. */
    onValidateSettings(values: Record<string, string|number|boolean>): void | undefined | string | Promise<void | undefined | string>,
    /** A list of fields for the room controller in the room edit page */
    settingsFields: SettingsFieldDef[],
}

export function registerRoomController(def: RoomControllerDef) {
    registeredRoomControllers[def.id] = def;
}

export function getRoomControllerTypes(): HMApi.RoomControllerType[] {
    return Object.values(registeredRoomControllers).map(({id, name, sub_name, settingsFields}) => ({
        id,
        settings: settingsFields,
        name,
        sub_name,
    }));
}

export async function initRoomsDevices() {
    for(const roomId in rooms) {
        await initRoom(roomId);
    }
}

export async function shutDownRoomsDevices() {
    for(const roomId in rooms) {
        await shutDownRoom(roomId);
    }
}