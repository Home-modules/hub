import { checkType, HMApi_Types } from "../api/api_checkType.js";
import { log, devices, setDevices } from "./devices.js";
import fs from "fs";
export function loadDevicesFile() {
    if (!(() => {
        const corruptError = "Warning: The file containing information about the devices is corrupt. All devices have been lost.";
        if (!fs.existsSync('../data/devices.json')) {
            log.w("data/devices.json doesn't exist. Creating it...");
            return false;
        }
        const json = fs.readFileSync('../data/devices.json', 'utf8');
        if (!json) {
            log.e("data/devices.json exists but is empty. This was probably caused by a crash while saving the file. Recreating it...");
            console.error(corruptError);
        }
        let parsed;
        try {
            parsed = JSON.parse(json);
        }
        catch (e) {
            console.error(corruptError);
            log.e("data/devices.json contains malformed JSON. Recreating it...");
            log.e(e);
            return false;
        }
        // Check format
        if (!((typeof parsed === 'object') && !(parsed instanceof Array))) {
            log.e("data/devices.json is corrupt: the type is not an object. Recreating it...");
            console.error(corruptError);
            return false;
        }
        const invalidObjects = [];
        let shouldSave = false;
        for (const [key, object] of Object.entries(parsed)) {
            if (!((typeof object === 'object') && !(object instanceof Array))) {
                log.e(`data/devices.json -> ${key} is corrupt: the type is not an object. Recreating it...`);
                console.error(`Warning: Part of the file containing information about the devices in room ${key} is invalid. All devices in the room have been lost.`);
                invalidObjects.push(key);
            }
            else {
                const invalidDevices = [];
                for (const [id, device] of Object.entries(object)) {
                    let err = checkType(device, HMApi_Types.objects.Device);
                    if (id !== device.id) {
                        err = 'device.id is not equal to its key.';
                    }
                    if (err) {
                        console.error(`Warning: Part of the file containing information about the device ${device.name} (${id}) in the room ${key} is corrupt. The device will be deleted.`);
                        log.e(`data/devices.json -> room ${key} -> device ${id} is invalid:`, err);
                        invalidDevices.push(id);
                        shouldSave = true;
                    }
                }
                for (const id of invalidDevices) {
                    delete object[id];
                }
            }
        }
        for (const id of invalidObjects) {
            delete parsed[id];
        }
        setDevices(parsed);
        return !(invalidObjects.length || shouldSave);
    })()) {
        saveDevices();
    }
}
export function saveDevices() {
    fs.writeFile('../data/devices.json', JSON.stringify(devices), () => undefined);
    log.d("Saving devices");
}
