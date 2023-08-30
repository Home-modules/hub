import { delay } from "../misc.js";
import { SettingsFieldDef } from "../plugins.js";

type GlobalTriggerType = {
    id: string,
    name: string,
    fields: SettingsFieldDef[],
    /** 
     * Called when a routine is enabled.  
     * Takes the options set for the trigger,
     * and a function that must be called when the trigger is fired.  
     * Must return a function that is called by the hub when the routine is disabled.
     */
    listen(options: Record<string,string|number|boolean>, fire: ()=>void): ()=>void
};

export const registeredGlobalTriggers: Record<string, GlobalTriggerType> = {};

export function registerGlobalTrigger(info: GlobalTriggerType) {
    registeredGlobalTriggers[info.id] = info;
}

type GlobalActionType = {
    id: string,
    name: string,
    fields: SettingsFieldDef[],
    perform(options: Record<string, string|number|boolean>): void|Promise<void>,
};

export const registeredGlobalActions: Record<string, GlobalActionType> = {};

export function registerGlobalAction(info: GlobalActionType) {
    registeredGlobalActions[info.id] = info;
}


// Builtin triggers and actions

registerGlobalTrigger({
    id: "time-of-day",
    name: "Time of day reached",
    listen: listenTime,
    fields: [
        {
            id: "hour",
            type: "number",
            label: "Hour",
            description: "In 24-hour format",
            min: 0,
            max: 23,
            default: 12
        },
        {
            id: "minute",
            type: "number",
            label: "Minute",
            min: 0,
            max: 59,
            default: 0
        }
    ]
});
function listenTime(options: Record<string, string|number|boolean>, fire: ()=>void) {
    const hour = options.hour as number;
    const minute = options.minute as number;
  
    const now = new Date();
    
    const targetTime = new Date();
    targetTime.setHours(hour);
    targetTime.setMinutes(minute);
    targetTime.setSeconds(0);
    targetTime.setMilliseconds(0);
  
    if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1); // Set the target time to the next day if it has already passed today
    }
  
    const timeToWait = +targetTime - +now;
  
    const timeout = setTimeout(() => {
        fire();
        // const nextTargetTime = new Date(targetTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours to the target time for the next day
        listenTime(options, fire); // Re-register the listener for the next day
    }, timeToWait);
  
    return () => {
        clearTimeout(timeout);
    };
}

registerGlobalAction({
    id: "delay",
    name: "Wait specified time",
    fields: [
        {
            id: "time",
            label: "Time",
            description: "Time to wait in seconds. Note: action execution should be set to 'sequential' for this action to work.",
            type: "number",
            default: 1,
            postfix: 's',
        }
    ],
    perform(options) {
        return delay(options.time as number * 1000);
    },
});
