import { getRooms } from "../rooms/rooms.js";
import { log, favoriteDevices, devices, setFavoriteDevices } from "./devices.js";
import fs from "fs";

export function loadFavoriteDevices() {
    if (!(() => {
        const corruptError = "Warning: The file containing information about the favorite devices is corrupt. The list has been cleared.";
        if (!fs.existsSync('../data/favorite-devices.json')) {
            log.w("data/favorite-devices.json does not exist. Creating it...");
            return false;
        }
        const json = fs.readFileSync('../data/favorite-devices.json', 'utf8');
        if (!json) {
            console.error(corruptError);
        }
        let parsed: typeof favoriteDevices;
        try {
            parsed = JSON.parse(json);
        } catch (e) {
            console.error(corruptError);
            log.e("data/favorite-devices.json contains malformed JSON. Recreating it...");
            log.e(e);
            return false;
        }
        const invalidFavDevices: [string, string][] = [];
        for (const [roomId, deviceId] of parsed) {
            if ((!getRooms()[roomId]) || (!devices[roomId]?.[deviceId])) {
                invalidFavDevices.push([roomId, deviceId]);
                console.error("Warning: One of the items in the list of favorite devices doesn't exist. It will be removed.");
                log.e(`data/favorite-devices.json contains the device ${roomId}/${deviceId}, but this device doesn't exist.`);
            }
        }
        setFavoriteDevices(parsed.filter(([roomId1, deviceId1]) => !invalidFavDevices.some(([roomId2, deviceId2]) => (roomId1 === roomId2 && deviceId1 === deviceId2))));
        return true;
    })()) {
        saveFavoriteDevices();
    }
}

export function saveFavoriteDevices() {
    fs.writeFile('../data/favorite-devices.json', JSON.stringify(favoriteDevices), () => undefined);
    log.d("Saving favorite devices");
}

export function editFavoriteDevices(devices: [string, string][]) {
    setFavoriteDevices(devices);
    saveFavoriteDevices();
}
