import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";
import { getRoom, getRoomControllerTypes } from "./rooms.js";



const devices: Record<string, Record<string, HMApi.Device>> = {
};

export function getDevices(roomId: string): Record<string, HMApi.Device> | undefined {
    if(getRoom(roomId)) {
        return devices[roomId] || {};
    }
}

export const registeredDeviceTypes: Record<string, Record<string, DeviceTypeDef>>= {}; // For each controller, there are different devices.

export function registerDeviceType(def: DeviceTypeDef) {
    if(def.forRoomController.split(':')[1]=='*') { // Add the device to all controllers of this supertype.
        const [forSupertype] = def.forRoomController.split(':');
        for(const controllerType of getRoomControllerTypes()) {
            if(controllerType.id.split(":")[0] === forSupertype) {
                registerDeviceType({...def, forRoomController: controllerType.id});
            }
        }
    }
}

export type DeviceTypeDef = {
    id: `${string}:${string}`,
    name: string,
    sub_name: string,
    /** The room controller with which the device is compatible with. If it ends with `:*` (like `test:*`), the device will be registered for all subtypes. */
    forRoomController: `${string}:*`|`${string}:${string}`,
    /** A list of fields for the device in the edit page */
    settingsFields: SettingsFieldDef[],
    /** Called when the rooms settings are saved to validate the room controller options. May return nothing/undefined when there are no errors or an object when there is an error. (object contents are error info, keys and values should be strings) */
    onValidateSettings(values: Record<string, string|number|boolean>): void | undefined | Record<string, string>,
    /** Called when the device starts/restarts (e.g. every time the hub starts and when the device is created) */
    onInit(device: HMApi.Device): void,
    onBeforeShutdown(device: HMApi.Device): void,
}
