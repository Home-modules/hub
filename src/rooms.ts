import { HMApi } from "./api.js";
import fs from "fs";
import { SettingsFieldDef } from "./plugins.js";
import { devices, saveDevices } from "./devices.js";

let rooms: { [key: string]: HMApi.Room } = {};

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

export function initRoom(id: string) {
    // Empty
}

export function shutDownRoom(id: string) {
    // Empty
}

export function editRoom(room: HMApi.Room): boolean {
    const { id } = room;
    const oldRoom = rooms[id];
    if (!oldRoom) {
        return false;
    }
    rooms[id] = room;
    saveRooms();
    return true;
}

export function addRoom(room: HMApi.Room): boolean {
    const { id } = room;
    if (rooms[id]) {
        return false;
    }
    rooms[id] = room;
    initRoom(id);
    saveRooms();
    return true;
}

export function deleteRoom(id: string): boolean {
    if (!rooms[id]) {
        return false;
    }
    shutDownRoom(id);
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
    onInit(room: HMApi.Room): void,
    /** Called when the room shuts down/restarts (e.g. when hub is turning off and when the room is deleted )  */
    onBeforeShutdown(room: HMApi.Room): void,
    /** Called when the rooms settings are saved to validate the room controller options. May return nothing/undefined when there are no errors or an object when there is an error. (object contents are error info, keys and values should be strings) */
    onValidateSettings(values: Record<string, string|number|boolean>): void | undefined | Record<string, string>,
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
