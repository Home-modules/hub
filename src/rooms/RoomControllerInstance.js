var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { devices, getDeviceTypes } from "../devices/devices.js";
import { saveDevices } from "../devices/devicesFile.js";
import { Log } from "../log.js";
import { log } from "./rooms.js";
export class RoomControllerInstance {
    constructor(properties, instantiateDevices = true) {
        this.disabled = false;
        this.initialized = false;
        this.devices = {};
        this.id = properties.id;
        this.name = properties.name;
        this.icon = properties.icon;
        this.type = properties.controllerType.type;
        this.settings = properties.controllerType.settings;
        instantiateDevices && this.instantiateDevices();
    }
    instantiateDevices() {
        if (devices[this.id]) {
            const invalidDevices = [];
            for (const deviceId in devices[this.id]) {
                const device = devices[this.id][deviceId];
                const deviceType = getDeviceTypes(this.type)[device.type];
                if (!deviceType) {
                    console.error(`Warning: The device ${device.name} (${device.id}) in the room ${this.name} (${this.id}) has an invalid type. This was probably caused by deactivating the plugin that provided this device type. The device will be deleted.`);
                    log.e(`Device type type ${device.type} for device ${device.id} in room ${this.id} not found. This was probably caused by deactivating the plugin that registered this device type. Device will be deleted.`);
                    invalidDevices.push(device.id);
                    continue;
                }
                this.devices[deviceId] = new deviceType(device, this);
            }
            if (invalidDevices.length) {
                for (const id of invalidDevices) {
                    delete devices[this.id][id];
                }
                saveDevices();
            }
        }
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            Log.i(this.constructor.name, 'Room', this.id, 'Initializing');
            for (const deviceId in this.devices) {
                yield this.devices[deviceId].init();
            }
            this.initialized = true;
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            Log.i(this.constructor.name, 'Room', this.id, 'Shutting down');
            for (const deviceId in this.devices) {
                yield this.devices[deviceId].dispose();
            }
            this.initialized = false;
        });
    }
    disable(reason) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Room', this.id, 'Disabled:', reason);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings) {
        return undefined;
    }
}
