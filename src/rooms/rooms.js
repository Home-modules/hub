var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Log } from "../log.js";
import { loadRoomsFile, saveRooms } from "./roomsFile.js";
export const log = new Log("rooms");
export let rooms = {};
export let roomControllerInstances = {};
export function getRooms() { return rooms; }
export function setRooms(Rooms) { rooms = Rooms; }
export function setRoomControllerInstances(instances) { roomControllerInstances = instances; }
loadRoomsFile();
export function getRoom(id) {
    return rooms[id];
}
export function restartRoom(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!rooms[id]) {
            return false;
        }
        if (roomControllerInstances[id]) {
            yield roomControllerInstances[id].dispose();
            delete roomControllerInstances[id];
        }
        roomControllerInstances[id] = new registeredRoomControllers[rooms[id].controllerType.type](rooms[id]);
        yield roomControllerInstances[id].init();
        return true;
    });
}
export const registeredRoomControllers = {};
export function registerRoomController(def) {
    registeredRoomControllers[def.id] = def;
    log.d('Registered room controller', def.id);
}
export function getRoomControllerTypes() {
    return Object.values(registeredRoomControllers).map(({ id, super_name, sub_name, settingsFields }) => ({
        id,
        settings: settingsFields,
        name: super_name,
        sub_name,
    }));
}
export function initRoomsDevices() {
    return __awaiter(this, void 0, void 0, function* () {
        const invalidRooms = [];
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
        for (const instance of Object.values(roomControllerInstances)) {
            yield instance.init();
        }
    });
}
export function shutDownRoomsDevices() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const instance of Object.values(roomControllerInstances)) {
            yield instance.dispose();
        }
    });
}
