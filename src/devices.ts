import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";
import { getRoom, getRooms, NonAbstractClass, roomControllerInstances } from "./rooms.js";
import fs from "fs";
import { Log } from "./log.js";
import { HMApi_Types } from "./api_checkType.js";
const log = new Log("devices");

export abstract class DeviceInstance {
    static id: `${string}:${string}`;
    static super_name: string;
    static sub_name: string;
    static icon: HMApi.T.IconName;
    /** The room controller with which the device is compatible with. If it ends with `:*` (like `test:*`), the device is considered compatible with all subtypes. If it is `*`, the device is considered compatible with all room controller types. */
    static forRoomController: `${string}:*`|`${string}:${string}`|'*';
    /** A list of fields for the device in the edit page */
    static settingsFields: SettingsFieldDef[];
    /** Whether the devices have a main toggle */
    static hasMainToggle = false;
    /** Whether the device can be clicked in the app */
    static clickable = true;
    /** The interactions for the device */
    static interactions: Record<string, HMApi.T.DeviceInteraction.Type> = { };

    /** Device ID */
    id: string;
    /** Device name */
    name: string;
    /** Device type ID */
    type: string;
    settings: Record<string, string|number|boolean>;
    roomId: string;

    disabled: false|string = false;
    initialized = false;

    /** An icon to set that overrides the default icon. */
    icon?: HMApi.T.IconName;
    /** A big text to show instead of the icon. It should be very short so it can fit in the icon area. */
    iconText?: string;
    /** Icon color override. Ignored if `mainToggleState` is true. */
    iconColor?: HMApi.T.UIColor;
    /** The main toggle state. When true, the device will be shown as active. */
    mainToggleState = false;
    /** The status text to show for the device. If it is not provided and `hasMainToggle` is true, 'ON' or 'OFF' will be used as a fallback. */
    statusText?: string;
    /** Active highlight color override */
    activeColor?: HMApi.T.UIColor;
    /** Interaction states */
    interactionStates: Record<string, HMApi.T.DeviceInteraction.State | undefined> = {};

    constructor(public properties: HMApi.T.Device, roomId: string) {
        this.id = properties.id;
        this.name = properties.name;
        this.type = properties.type;
        this.settings = properties.params;
        this.roomId = roomId;
    }

    async init() {
        Log.i(this.constructor.name, 'Device', this.id, 'Initializing');
        this.initialized = true;
    }

    async dispose() {
        Log.i(this.constructor.name, 'Device', this.id, 'Shutting down');
        this.initialized = false;
    }

    get roomController() {
        return roomControllerInstances[this.roomId];
    }

    disable(reason: string) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Device', this.id, 'Disabled:', reason);
    }

    async getCurrentState() {
        return {
            icon: this.icon,
            iconText: this.iconText,
            iconColor: this.iconColor,
            mainToggleState: this.mainToggleState,
            statusText: this.statusText || ((this.constructor as DeviceTypeClass).hasMainToggle ? (this.mainToggleState ? 'ON' : 'OFF') : ' '),
            activeColor: this.activeColor,
            interactionStates: this.interactionStates,
        };
    }

    async toggleMainToggle() {
        this.mainToggleState = !this.mainToggleState;
        Log.e(this.constructor.name, 'Device', this.id, 'turned', this.mainToggleState ? 'on' : 'off');
    }

    async sendInteractionAction(interactionId: string, action: HMApi.T.DeviceInteraction.Action) {
        switch (action.type) {
            case 'setSliderValue':
                this.interactionStates[interactionId] = {
                    value: action.value,
                };
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings: Record<string, string|number|boolean>): void | undefined | string | Promise<void | undefined | string> {
        return undefined;
    }
}

export let devices: Record<string, Record<string, HMApi.T.Device>> = { };

if(fs.existsSync('../data/devices.json')) {
    devices= JSON.parse(fs.readFileSync('../data/devices.json', 'utf8'));
} else saveDevices();

export function saveDevices() {
    fs.writeFile('../data/devices.json', JSON.stringify(devices), ()=>undefined);
    log.d("Saving devices");
}

export let favoriteDevices: [string, string][] = [ ];

if(fs.existsSync('../data/favorite-devices.json')) {
    favoriteDevices= JSON.parse(fs.readFileSync('../data/favorite-devices.json', 'utf8'));
} else saveFavoriteDevices();

export function saveFavoriteDevices() {
    fs.writeFile('../data/favorite-devices.json', JSON.stringify(favoriteDevices), ()=>undefined);
    log.d("Saving favorite devices");
}

export function setFavoriteDevices(devices: [string, string][]) {
    favoriteDevices = devices;
    saveFavoriteDevices();
}

export function getDevices(roomId: string): Record<string, HMApi.T.Device> | undefined {
    if(getRoom(roomId)) { // Check if room exists
        return devices[roomId] || {};
    }
}

export const registeredDeviceTypes: Record<string, Record<string, DeviceTypeClass>>= {}; // For each controller, there are different devices.

export function registerDeviceType(def: DeviceTypeClass) {
    log.d("Registering device type", def.id);
    registeredDeviceTypes[def.forRoomController] ||= {};
    registeredDeviceTypes[def.forRoomController][def.id] = def;
}

export type DeviceTypeClass =  NonAbstractClass<typeof DeviceInstance>

export function getDeviceTypes(controllerType: string) {
    const [superType] = controllerType.split(":");
    return {...registeredDeviceTypes[controllerType], ...registeredDeviceTypes[superType + ":*"], ...registeredDeviceTypes['*']};
}

export async function addDevice(roomId: string, device: HMApi.T.Device): Promise<true | "room_not_found" | "device_exists"|string> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    devices[roomId] ||= {};
    const { id } = device;
    if (devices[roomId][id]) {
        return 'device_exists';
    }

    const deviceType= getDeviceTypes((getRoom(roomId) as HMApi.T.Room).controllerType.type)[device.type];

    const err = await deviceType.validateSettings(device.params);
    if(err) return err;

    devices[roomId][id] = device;
    roomControllerInstances[roomId].devices[id] = new deviceType(device, roomId);
    saveDevices();
    await roomControllerInstances[roomId].devices[id].init();
    return true;
}

export async function editDevice(roomId: string, device: HMApi.T.Device): Promise<true | "room_not_found" | "device_not_found" | string> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists

    const { id } = device;
    const oldDevice = devices[roomId]?.[id];
    if (!oldDevice) {
        return 'device_not_found';
    }

    const deviceType= getDeviceTypes((getRoom(roomId) as HMApi.T.Room).controllerType.type)[device.type];

    const err = await deviceType.validateSettings(device.params);
    if(err) return err;

    roomControllerInstances[roomId].devices[id].dispose();
    devices[roomId][id] = device;
    roomControllerInstances[roomId].devices[id] = new deviceType(device, roomId);
    saveDevices();
    await roomControllerInstances[roomId].devices[id].init();
    return true;
}

export async function deleteDevice(roomId: string, deviceId: string): Promise<true | "room_not_found" | "device_not_found"> {
    if(!getRoom(roomId)) return 'room_not_found'; // Check if room exists
    if(!devices[roomId]?.[deviceId]) return 'device_not_found';

    roomControllerInstances[roomId].devices[deviceId].dispose();
    delete roomControllerInstances[roomId].devices[deviceId];
    delete devices[roomId][deviceId];
    saveDevices();
    favoriteDevices = favoriteDevices.filter(([room, device]) => room !== roomId || device !== deviceId);
    saveFavoriteDevices();
    return true;
}

export function reorderDevices(roomId: string, ids: string[]): 'room_not_found'|'devices_not_equal'|true {
    if(!(roomId in devices)) {
        return 'room_not_found';
    }
    
    const oldIds= Object.keys(devices[roomId]);

    // Check if there are no added or removed devices
    const added = ids.filter(id => !oldIds.includes(id));
    const removed = oldIds.filter(id => !ids.includes(id));
    if(added.length || removed.length) {
        return 'devices_not_equal';
    }

    const newDevices: { [key: string]: HMApi.T.Device } = {};
    ids.forEach(id => {
        newDevices[id] = devices[roomId][id];
    });
    devices[roomId] = newDevices;
    saveDevices();

    const newInstances: { [key: string]: DeviceInstance } = {};
    ids.forEach(id => {
        newInstances[id] = roomControllerInstances[roomId].devices[id];
    });
    roomControllerInstances[roomId].devices = newInstances;

    return true;
}

export async function restartDevice(roomId: string, id: string): Promise<'room_not_found'|'device_not_found'|'room_disabled'|void> {
    if(!getRooms()[roomId]) {
        return 'room_not_found';
    }
    if(!devices[roomId]?.[id]) {
        return 'device_not_found';
    }
    const room = roomControllerInstances[roomId];
    if(room.disabled) {
        return 'room_disabled';
    }
    
    const device = room.devices[id];
    if(device) {
        await device.dispose();
        delete room.devices[id];
    }
    room.devices[id] = new (getDeviceTypes(room.type)[device.type])(devices[roomId][id], roomId);
    await room.devices[id].init();
}

export async function getDeviceStates(roomId: string): Promise<Record<string, HMApi.T.DeviceState>> {
    const controller = roomControllerInstances[roomId];
    const deviceTypes = getDeviceTypes(controller.type);
    const instanceEntries = Object.keys(getDevices(roomId)!).map(key=> [key, controller.devices[key]] as const);

    return Object.fromEntries(
        await Promise.all(
            instanceEntries.map(
                async([id, instance]) => ([id, await getDeviceState(instance, deviceTypes[instance.type])])
            )
        )
    );
}

export async function getDeviceState(instance: DeviceInstance, deviceType: DeviceTypeClass): Promise<HMApi.T.DeviceState> {
    const {mainToggleState, icon, iconText, iconColor, statusText, activeColor, interactionStates} = await instance.getCurrentState();
    return {
        ...(instance.disabled === false ? {
            disabled: false,
        } : {
            disabled: true,
            error: instance.disabled,
        }),
        id: instance.id,
        roomId: instance.roomId,
        isFavorite: favoriteDevices.some(([rId, dId]) => rId === instance.roomId && dId === instance.id),
        name: instance.name,
        type: (({id, super_name, sub_name, icon, interactions}: DeviceTypeClass)=> ({
            id, name: super_name, sub_name, icon, interactions
        }))(deviceType),
        icon,
        iconText,
        iconColor,
        hasMainToggle: deviceType.hasMainToggle,
        mainToggleState,
        statusText,
        activeColor,
        clickable: deviceType.clickable,
        interactions: interactionStates,
    };
}

export async function getFavoriteDeviceStates(): Promise<HMApi.T.DeviceState[]> {
    return Promise.all(favoriteDevices.map(async ([roomId, deviceId]) => {
        const roomController = roomControllerInstances[roomId];
        const device = roomController.devices[deviceId];
        const deviceType = getDeviceTypes(roomController.type)[device.type];
        if(roomController.disabled) return undefined;
        return getDeviceState(device, deviceType);
    })).then(states => states.filter(Boolean) as HMApi.T.DeviceState[]);
}

export function toggleDeviceIsFavorite(roomId: string, deviceId: string, isFavorite: boolean) {
    if(!(roomId in getRooms())) {
        return 'room_not_found';
    }
    if(!(deviceId in devices[roomId])) {
        return 'device_not_found';
    }

    if(isFavorite) {
        if(favoriteDevices.some(([rId, dId]) => rId === roomId && dId === deviceId)) return; // Check if device is already a favorite. If so, do nothing
        favoriteDevices.push([roomId, deviceId]);
    } else {
        favoriteDevices = favoriteDevices.filter(([r, d]) => !(r === roomId && d === deviceId));
    }
    saveFavoriteDevices();
}

export function sendDeviceInteractionAction(roomId: string, deviceId: string, interactionId: string, action: HMApi.T.DeviceInteraction.Action) {
    const roomController = roomControllerInstances[roomId];
    if(!roomController) return 'room_not_found';
    if (roomController.disabled) return 'room_disabled';
    
    const device = roomController.devices[deviceId];
    if (!device) return 'device_not_found';
    if (device.disabled) return 'device_disabled';

    let interaction = (device.constructor as DeviceTypeClass).interactions[interactionId];
    if (!interaction) return 'interaction_not_found';
    if (!HMApi_Types.objects.DeviceInteractionActionsPerInteraction[interaction.type].includes(action.type))  return 'invalid_action';
    
    switch (action.type) {
        case 'setSliderValue': {
            interaction = interaction as HMApi.T.DeviceInteraction.Type.Slider;
            // Check min and max and step
            if ((
                interaction.min !== undefined &&
                action.value < interaction.min
            ) || (
                interaction.max !== undefined &&
                action.value > interaction.max
            ) || (
                interaction.step !== undefined && 
                (action.value - (interaction.min === undefined ? 0 : interaction.min)) % interaction.step !== 0
            )) {
                return 'value_out_of_range';
            }
            break;
        }
        // case 'clickButton':
        //     interaction = interaction as HMApi.T.DeviceInteraction.Type.Button;
        //     break;
    }

    return device.sendInteractionAction(interactionId, action);
}