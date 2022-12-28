var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { devices, favoriteDevices } from "../devices/devices.js";
import { editFavoriteDevices } from "../devices/favoriteDevices.js";
import { saveDevices } from "../devices/devicesFile.js";
import { saveRooms } from "./roomsFile.js";
import { rooms, registeredRoomControllers, roomControllerInstances, setRooms, setRoomControllerInstances } from "./rooms.js";
export function editRoom(room) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = room;
        const oldRoom = rooms[id];
        if (!oldRoom) {
            return false;
        }
        const controllerType = registeredRoomControllers[room.controllerType.type];
        const err = yield controllerType.validateSettings(room.controllerType.settings);
        if (err)
            return err;
        yield roomControllerInstances[id].dispose();
        rooms[id] = room;
        saveRooms();
        roomControllerInstances[id] = new controllerType(room);
        yield roomControllerInstances[id].init();
        return true;
    });
}
export function addRoom(room) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = room;
        if (rooms[id]) {
            return false;
        }
        const controllerType = registeredRoomControllers[room.controllerType.type];
        const err = yield controllerType.validateSettings(room.controllerType.settings);
        if (err)
            return err;
        rooms[id] = room;
        saveRooms();
        roomControllerInstances[id] = new controllerType(room);
        yield roomControllerInstances[id].init();
        return true;
    });
}
export function deleteRoom(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!rooms[id]) {
            return false;
        }
        yield roomControllerInstances[id].dispose();
        delete roomControllerInstances[id];
        delete rooms[id];
        saveRooms();
        delete devices[id];
        saveDevices();
        editFavoriteDevices(favoriteDevices.filter(d => d[0] !== id));
        return true;
    });
}
export function reorderRooms(ids) {
    const oldIds = Object.keys(rooms);
    // Check if there are no added or removed rooms
    const added = ids.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !ids.includes(id));
    if (added.length || removed.length) {
        return false;
    }
    const newRooms = {};
    ids.forEach(id => {
        newRooms[id] = rooms[id];
    });
    setRooms(newRooms);
    saveRooms();
    const newInstances = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[id];
    });
    setRoomControllerInstances(newInstances);
    return true;
}
