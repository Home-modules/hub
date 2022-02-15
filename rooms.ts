import { HMApi } from "./api.js";
import fs from "fs";

let rooms: { [key: string]: HMApi.Room } = {};

if(fs.existsSync('./rooms.json')) {
    rooms= JSON.parse(fs.readFileSync('./rooms.json', 'utf8'));
} else saveRooms();

function saveRooms() {
    fs.writeFile('./rooms.json', JSON.stringify(rooms), ()=>undefined);
}

export function getRooms(): typeof rooms {
    return rooms;
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
