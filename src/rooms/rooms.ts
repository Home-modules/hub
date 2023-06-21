import { HMApi } from "../api/api.js";
import { Log } from "../log.js";
import { getSetting } from "../settings.js";
import { RoomControllerInstance, NonAbstractClass } from "./RoomControllerInstance.js";
import { autoRestartMaxTries } from "./autoRestart.js";
import { loadRoomsFile, saveRooms } from "./roomsFile.js";
export const log = new Log("rooms");

export let rooms: { [id: string]: HMApi.T.Room } = {};
export let roomControllerInstances: { [id: string]: RoomControllerInstance } = {};
export function getRooms() { return rooms; }
export function setRooms(Rooms: typeof rooms) { rooms = Rooms; }
export function setRoomControllerInstances(instances: typeof roomControllerInstances) { roomControllerInstances = instances; }

loadRoomsFile();

export function getRoom(id: string): HMApi.T.Room | undefined {
    return rooms[id];
}


export async function restartRoom(id: string): Promise<boolean> {
    if (!rooms[id]) {
        return false;
    }
    if(roomControllerInstances[id]) {
        await roomControllerInstances[id].dispose();
        delete roomControllerInstances[id];
    }
    roomControllerInstances[id] = new registeredRoomControllers[rooms[id].controllerType.type](rooms[id]);
    await roomControllerInstances[id].init();
    return true;
}


export const registeredRoomControllers: Record<string, RoomControllerClass> = {};

export type RoomControllerClass = NonAbstractClass<typeof RoomControllerInstance>;

export function registerRoomController(def: RoomControllerClass) {
    registeredRoomControllers[def.id] = def;
    log.d('Registered room controller', def.id);
}

export function getRoomControllerTypes(): HMApi.T.RoomControllerType[] {
    return Object.values(registeredRoomControllers).map(({id, super_name, sub_name, settingsFields}) => ({
        id,
        settings: settingsFields,
        name: super_name,
        sub_name,
    }));
}

export async function initRoomsDevices() {
    const invalidRooms: string[] = [];
    for (const room of Object.values(rooms)) {
        const controllerType = registeredRoomControllers[room.controllerType.type];
        if (!controllerType) {
            console.error(`Warning: The controller for the room ${room.name} (${room.id}) has an invalid type. This was probably caused by deactivating the plugin that provided this room controller type. The room will be deleted.`);
            log.e(`Room controller type ${room.controllerType.type} for room ${room.id} not found. This was probably caused by deactivating the plugin that registered this room controller type. Room will be deleted.`);
            invalidRooms.push(room.id);
            continue;
        }
        roomControllerInstances[room.id] = new controllerType(room);
    }
    if (invalidRooms.length) {
        for (const room of invalidRooms) {
            delete rooms[room];
        }
        saveRooms();
    }
    for(const instance of Object.values(roomControllerInstances)) {
        await instance.init();
    }
}

export async function shutDownRoomsDevices() {
    for(const instance of Object.values(roomControllerInstances)) {
        await instance.dispose();
    }
}

export function getRoomState(instance: RoomControllerInstance): HMApi.T.RoomState {
    return (
        instance.disabled === false ? {
            disabled: false,
            id: instance.id,
            name: instance.name,
            icon: instance.icon
        } : {
            disabled: true,
            error: instance.disabled,
            id: instance.id,
            name: instance.name,
            icon: instance.icon,
            retries: instance.retryCount,
            maxRetries: autoRestartMaxTries
        }
    );
}