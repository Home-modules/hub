import { sendUpdate } from "../api-server/websocket.ts";
import { delay } from "../misc.ts";
import { getSetting } from "../settings.ts";
import { getRoomState, restartRoom, roomControllerInstances } from "./rooms.ts";

const retries: Record<string, number> = {};
export const autoRestartMaxTries = getSetting('autoRestartMaxTries', 5);

export async function roomFailed(id: string) {
    if (retries[id] === undefined) retries[id] = 0;
    retries[id]++;
    roomControllerInstances[id].retryCount = Math.min(retries[id] - 1, autoRestartMaxTries);
    if (retries[id] <= autoRestartMaxTries) {
        await delay(getSetting('autoRestartDelay', 5) * 1000);
        await restartRoom(id);
    }
}

export function roomSucceeded(id: string) {
    retries[id] = 0;
    sendUpdate({
        type: "rooms.roomStateChanged",
        state: getRoomState(roomControllerInstances[id])
    });
}
