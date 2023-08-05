import { HMApi, Log } from "../plugins.js";
import { roomControllerInstances } from "../rooms/rooms.js";
import { routines } from "./automation.js";
import { registeredGlobalActions, registeredGlobalTriggers } from "./global-actions-events.js";
import { saveRoutines } from "./routinesFile.js";

const log = new Log("automation");

const unlistenGlobalTriggers: Record<number, Record<number, () => void>> = {};

export async function enableRoutine(id: number) {
    const routine = routines.routines[id];
    if (!routine) return false;
    if (routines.enabled[id]) return true; // ignore
    log.i("Enabling routine", id);

    routines.enabled[id] = true;
    routine.triggers.forEach((trigger, index) => {
        if (trigger.type !== "globalTrigger") return;
        const type = registeredGlobalTriggers[trigger.name];
        if (!type) return;
        unlistenGlobalTriggers[id] ||= {};
        unlistenGlobalTriggers[id][index] = type.listen(trigger.options, () => runRoutine(id));
        log.i("Listened to global trigger", type.id, "for routine", id);
    });

    saveRoutines();
}

export async function disableRoutine(id: number) {
    const routine = routines.routines[id];
    if (!routine) return false;
    if (!routines.enabled[id]) return true; // ignore
    log.i("Disabling routine", id);

    routines.enabled[id] = false;
    routine.triggers.forEach((trigger, index) => {
        if (trigger.type !== "globalTrigger") return;
        unlistenGlobalTriggers[id]?.[index]?.();
        log.i("Stopped listening to global trigger", index, "for routine", id);
    });
    
    saveRoutines();
}

export async function runRoutine(id: number) {
    const routine = routines.routines[id];
    if (!routine) return false;
    log.i("Running routine", id);

    if (routine.actionExecution === "parallel") {
        await Promise.all(routine.actions.map(ac => executeAction(ac)));
    } else {
        for (const action of routine.actions) {
            await executeAction(action);
        }
    }

    log.i("Finished running routine", id);
}

async function executeAction(action: HMApi.T.Automation.Action): Promise<void> {
    log.i("Executing action of type", action.type);
    switch (action.type) {
        case "globalAction": {
            const type = registeredGlobalActions[action.name];
            if (!type) return;
            log.i("Global action", type.id);
            await type.perform(action.options);
            break;
        }
        case "triggerRoutine": {
            log.i("Triggers routine", action.routine);
            await runRoutine(action.routine);
            break;
        }
        case "toggleDeviceMainToggle": {
            const device = roomControllerInstances[action.room]?.devices[action.device];
            if (!device) return;
            const state = action.setTo === undefined ? (!device.mainToggleState) : action.setTo;
            log.i("Setting main toggle state for device ", action.room, ">", action.device, "to", state);
            if (state !== device.mainToggleState) await device.toggleMainToggle();
            break;
        }
    }
    log.i("Done executing action");
}