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
    saveRooms();
    return true;
}

export function deleteRoom(id: string): boolean {
    if (!rooms[id]) {
        return false;
    }
    delete rooms[id];
    saveRooms();
    return true;
}