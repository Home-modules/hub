import { HMApi } from "../plugins.js";
import { routines } from "./automation.js";
import { saveRoutines } from "./routinesFile.js";

export async function addRoutine(routine: HMApi.T.Automation.Routine) {
    const id = ++routines.lastId;
    routine.id = id;
    if (routines.routines[id]) return -1;
    routines.routines[id] = routine;
    routines.order.unshift(id);
    routines.enabled[id] = false;
    await saveRoutines();
    return id;
}

export async function editRoutine(routine: HMApi.T.Automation.Routine) {
    const { id } = routine;
    if (!routines.routines[id]) return "NOT_FOUND";
    if (routines.enabled[id]) return "NOT_DISABLED";
    routines.routines[id] = routine;
    await saveRoutines();
}

export async function deleteRoutine(id: number) {
    if (!routines.routines[id]) return "NOT_FOUND";
    if (routines.enabled[id]) return "NOT_DISABLED";

    delete routines.routines[id];
    delete routines.enabled[id];
    routines.order.splice(routines.order.indexOf(id), 1);

    saveRoutines();
}

export async function reorderRoutines(ids: number[]) {

    // Check if there are no added or removed routines
    const added = ids.filter(id => !routines.order.includes(id));
    const removed = routines.order.filter(id => !ids.includes(id));
    if (added.length || removed.length) {
        return false;
    }

    routines.order = ids;
    await saveRoutines();

    return true;
}
