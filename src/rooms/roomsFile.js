import fs from "fs";
import { checkType, HMApi_Types } from "../api/api_checkType.js";
import { log, rooms, setRooms } from "./rooms.js";
export function loadRoomsFile() {
    if (!(() => {
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
        let parsed;
        try {
            parsed = JSON.parse(roomsJSON);
        }
        catch (e) {
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
        const invalidRooms = [];
        for (const [id, room] of Object.entries(parsed)) {
            let err = checkType(room, HMApi_Types.objects.Room);
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
        setRooms(parsed);
        return !invalidRooms.length; // WIll be false if it isn't empty.
    })()) {
        saveRooms();
    }
}
export function saveRooms() {
    log.i("Saving data/rooms.json...");
    fs.writeFile('../data/rooms.json', JSON.stringify(rooms), () => undefined);
}
