import fs from "fs";
import { checkType, HMApi_Types } from "../api/api_checkType.js";
import { routines, setRoutines } from "./automation.js";
import { Log } from "../log.js";
const log = new Log("routines-file");

export function loadRoutinesFile() {
    if (!(() => {
        if (!fs.existsSync('../data/automation-routines.json')) {
            log.w("data/automation-routines.json doesn't exist. Creating it...");
            return false;
        }

        const corruptError = "Warning: The file containing automation data is corrupt. The file will be recreated but all routines have been lost.";
        const routinesJSON = fs.readFileSync('../data/automation-routines.json', 'utf8');
        if (!routinesJSON) { // This can happen when the hub crashes while saving routines (it shouldn't). This leads to a corrupted file.
            log.e("data/automation-routines.json exists but is empty. This was probably caused by a crash while saving the file. Recreating it...");
            console.error(corruptError);
            return false;
        }
        let parsed: typeof routines;
        try {
            parsed = JSON.parse(routinesJSON);
        } catch (e) {
            log.e("data/automation-routines.json contains malformed JSON. Recreating it...");
            log.e(e);
            console.error(corruptError);
            return false;
        }

        // Check format
        const err = checkType(parsed, {
            type: "object",
            properties: {
                routines: {
                    type: "record",
                    keys: {
                        type: "string",
                        customCheck(str) {
                            const num = parseFloat(str);
                            return !isNaN(num) && Number.isInteger(num);
                        },
                    },
                    values: { type: "any" } // Checked later
                },
                order: { type: "array", items: { type: "number" } },
                enabled: {
                    type: "record",
                    keys: {
                        type: "string",
                        customCheck(str) {
                            const num = parseFloat(str);
                            return !isNaN(num) && Number.isInteger(num);
                        },
                    },
                    values: { type: "boolean" }
                },
                lastId: { type: "number" }
            }
        });
        if(err) {
            log.e("data/automation-routines.json is corrupt:", err);
            console.error(corruptError);
            return false;
        }

        // Check rooms
        const invalidRoutines: number[] = [];
        for (const [id, routine] of Object.entries(parsed.routines)) {
            
            let err: ReturnType<typeof checkType> | string = checkType(routine, HMApi_Types.objects.Routine);
            if (parseInt(id) !== routine.id) {
                err = 'room.id is not equal to its key.';
            }
            if (err) {
                console.error(`Warning: Part of the file containing information about the room ${routine.name} (${id}) is corrupt. The room will be deleted.`);
                log.e(`data/automation-routines.json -> room ${id} is invalid:`, err);
                invalidRoutines.push(parseInt(id));
            }
        }
        for (const id of invalidRoutines) {
            delete parsed.routines[id];
            delete parsed.enabled[id];
            if (parsed.order.includes(id)) parsed.order.splice(parsed.order.indexOf(id), 1);
        }
        setRoutines(parsed);
        return !invalidRoutines.length; // Will be false if it isn't empty.
    })()) {
        saveRoutines();
    }
}

export function saveRoutines() {
    log.i("Saving data/automation-routines.json...");
    return fs.promises.writeFile('../data/automation-routines.json', JSON.stringify(routines));
}