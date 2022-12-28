import { HMApi } from "../api/api.js";
import { devices, favoriteDevices } from "../devices/devices.js";
import { editFavoriteDevices } from "../devices/favoriteDevices.js";
import { saveDevices } from "../devices/devicesFile.js";
import { RoomControllerInstance } from "./RoomControllerInstance.js";
import { saveRooms } from "./roomsFile.js";
import { rooms, registeredRoomControllers, roomControllerInstances, setRooms, setRoomControllerInstances } from "./rooms.js";



export async function editRoom(room: HMApi.T.Room): Promise<boolean | string> {
    const { id } = room;
    const oldRoom = rooms[id];
    if (!oldRoom) {
        return false;
    }

    const controllerType = registeredRoomControllers[room.controllerType.type];
    const err = await controllerType.validateSettings(room.controllerType.settings);
    if (err)
        return err;

    await roomControllerInstances[id].dispose();
    rooms[id] = room;
    saveRooms();
    roomControllerInstances[id] = new controllerType(room);
    await roomControllerInstances[id].init();
    return true;
}

export async function addRoom(room: HMApi.T.Room): Promise<boolean | string> {
    const { id } = room;
    if (rooms[id]) {
        return false;
    }

    const controllerType = registeredRoomControllers[room.controllerType.type];
    const err = await controllerType.validateSettings(room.controllerType.settings);
    if (err)
        return err;

    rooms[id] = room;
    saveRooms();
    roomControllerInstances[id] = new controllerType(room);
    await roomControllerInstances[id].init();
    return true;
}

export async function deleteRoom(id: string): Promise<boolean> {
    if (!rooms[id]) {
        return false;
    }
    await roomControllerInstances[id].dispose();
    delete roomControllerInstances[id];
    delete rooms[id];
    saveRooms();
    delete devices[id];
    saveDevices();
    editFavoriteDevices(favoriteDevices.filter(d => d[0] !== id));
    return true;
}

export function reorderRooms(ids: string[]): boolean {
    const oldIds = Object.keys(rooms);

    // Check if there are no added or removed rooms
    const added = ids.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !ids.includes(id));
    if (added.length || removed.length) {
        return false;
    }

    const newRooms: { [key: string]: HMApi.T.Room; } = {};
    ids.forEach(id => {
        newRooms[id] = rooms[id];
    });
    setRooms(newRooms);
    saveRooms();

    const newInstances: { [key: string]: RoomControllerInstance; } = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[id];
    });
    setRoomControllerInstances(newInstances);

    return true;
}
