import { HMApi } from "../api/api.js";
import { SettingsFieldDef } from "../plugins.js";
import { devices, getDeviceTypes } from "../devices/devices.js";
import { saveDevices } from "../devices/devicesFile.js";
import { DeviceInstance } from "../devices/DeviceInstance.js";
import { Log } from "../log.js";
import { getRoomState, log } from "./rooms.js";
import { sendUpdate } from "../api-server/websocket.js";


export abstract class RoomControllerInstance {
    static id: `${string}:${string}`;
    static super_name: string;
    static sub_name: string;
    /** A list of fields for the room controller in the room edit page */
    static settingsFields: SettingsFieldDef[];

    id: string;
    name: string;
    icon: HMApi.T.Room['icon'];
    type: string;
    settings: Record<string, string | number | boolean>;

    disabled: false | string = false;
    initialized = false;
    devices: Record<string, DeviceInstance> = {};

    constructor(properties: HMApi.T.Room, instantiateDevices = true) {
        this.id = properties.id;
        this.name = properties.name;
        this.icon = properties.icon;
        this.type = properties.controllerType.type;
        this.settings = properties.controllerType.settings;

        instantiateDevices && this.instantiateDevices();
    }

    instantiateDevices() {
        if (devices[this.id]) {
            const invalidDevices: string[] = [];
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

    async init() {
        Log.i(this.constructor.name, 'Room', this.id, 'Initializing');
        for (const deviceId in this.devices) {
            await this.devices[deviceId].init();
        }
        this.initialized = true;
    }

    async dispose() {
        Log.i(this.constructor.name, 'Room', this.id, 'Shutting down');
        for (const deviceId in this.devices) {
            await this.devices[deviceId].dispose();
        }
        this.initialized = false;
    }

    disable(reason: string) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Room', this.id, 'Disabled:', reason);
        sendUpdate({
            type: "rooms.roomStateChanged",
            state: getRoomState(this)
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings: Record<string, string | number | boolean>): void | undefined | string | Promise<void | undefined | string> {
        return undefined;
    }
}

export type NonAbstractClass<T extends abstract new (...args: any) => any> = Omit<T, 'prototype'> & (new (...args: ConstructorParameters<T>) => InstanceType<T>);
