import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";
import { getRoom, getRooms, NonAbstractClass, roomControllerInstances } from "./rooms.js";
import fs from "fs";
import { Log } from "./log.js";
import { checkType, HMApi_Types } from "./api_checkType.js";
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
    static interactions: Record<string, HMApi.T.DeviceInteraction.Type> = {};
    /** 
     * (Optional) the ID of the interaction to show on the device itself in addition to the context menu.  
     * When not set (or set to ""), an On/Off label will be shown. 
     * 
     * A `TwoButtonNumber` can be used in conjunction with one other interaction. To do this, separate the interactions with a plus sign (+).  
     * In this case, the `TwoButtonNumber` interaction must appear first.
     */
    static defaultInteraction?: string;
    /** Default interaction(s) when `hasMainToggle==true` and `mainToggleState==false` */
    static defaultInteractionWhenOff?: string;

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
            case 'setTwoButtonNumberValue':
                this.interactionStates[interactionId] = {
                    value: action.value,
                };
                break;
            case 'toggleToggleButton':
                this.interactionStates[interactionId] = {
                    on: action.value,
                };
                break;
            case 'setUIColorInputValue':
                this.interactionStates[interactionId] = {
                    color: action.color,
                };
                break;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings: Record<string, string|number|boolean>): void | undefined | string | Promise<void | undefined | string> {
        return undefined;
    }
}

export let devices: Record<string, Record<string, HMApi.T.Device>> = { };

if (!(() => {
    const corruptError = "Warning: The file containing information about the devices is corrupt. All devices have been lost.";

    if (!fs.existsSync('../data/devices.json')) {
        log.w("data/devices.json doesn't exist. Creating it...");
        return false;
    }

    const json = fs.readFileSync('../data/devices.json', 'utf8');
    if (!json) {
        log.e("data/devices.json exists but is empty. This was probably caused by a crash while saving the file. Recreating it...");
        console.error(corruptError);
    }

    let parsed: typeof devices;
    try {
        parsed = JSON.parse(json);
    } catch (e) {
        console.error(corruptError);
        log.e("data/devices.json contains malformed JSON. Recreating it...");
        log.e(e);
        return false;
    }

    // Check format
    if (!((typeof parsed === 'object') && !(parsed instanceof Array))) {
        log.e("data/devices.json is corrupt: the type is not an object. Recreating it...");
        console.error(corruptError);
        return false;
    }

    const invalidObjects: string[] = [];
    let shouldSave = false;
    for (const [key, object] of Object.entries(parsed)) {
        if (!((typeof object === 'object') && !(object instanceof Array))) {
            log.e(`data/devices.json -> ${key} is corrupt: the type is not an object. Recreating it...`);
            console.error(`Warning: Part of the file containing information about the devices in room ${key} is invalid. All devices in the room have been lost.`);
            invalidObjects.push(key);
        } else {
            const invalidDevices: string[] = [];
            for (const [id, device] of Object.entries(object)) {
                let err: ReturnType<typeof checkType>|string = checkType(device, HMApi_Types.objects.Device);
                if (id !== device.id) {
                    err = 'device.id is not equal to its key.';
                }
                if (err) {
                    console.error(`Warning: Part of the file containing information about the device ${device.name} (${id}) in the room ${key} is corrupt. The device will be deleted.`);
                    log.e(`data/devices.json -> room ${key} -> device ${id} is invalid:`, err);
                    invalidDevices.push(id);
                    shouldSave = true;
                }
            }
            for (const id of invalidDevices) {
                delete object[id];
            }
        }
    }
    for (const id of invalidObjects) {
        delete parsed[id];
    }

    devices = parsed;
    return !(invalidObjects.length || shouldSave);
})()) {
    saveDevices();
}

export function saveDevices() {
    fs.writeFile('../data/devices.json', JSON.stringify(devices), ()=>undefined);
    log.d("Saving devices");
}

export let favoriteDevices: [string, string][] = [ ];

if (!(() => {
    const corruptError = "Warning: The file containing information about the favorite devices is corrupt. The list has been cleared.";
    if (!fs.existsSync('../data/favorite-devices.json')) {
        log.w("data/favorite-devices.json does not exist. Creating it...");
        return false;
    } 
    const json = fs.readFileSync('../data/favorite-devices.json', 'utf8');
    if (!json) {
        console.error(corruptError);
    }
    let parsed: typeof favoriteDevices;
    try {
        parsed = JSON.parse(json);
    } catch (e) {
        console.error(corruptError);
        log.e("data/favorite-devices.json contains malformed JSON. Recreating it...");
        log.e(e);
        return false;
    }
    const invalidFavDevices: [string, string][] = [];
    for (const [roomId, deviceId] of parsed) {
        if ((!getRooms()[roomId]) || (!devices[roomId]?.[deviceId])) {
            invalidFavDevices.push([roomId, deviceId]);
            console.error("Warning: One of the items in the list of favorite devices doesn't exist. It will be removed.");
            log.e(`data/favorite-devices.json contains the device ${roomId}/${deviceId}, but this device doesn't exist.`);
        }
    }
    favoriteDevices = parsed.filter(([roomId1, deviceId1]) => !invalidFavDevices.some(([roomId2, deviceId2]) => (roomId1 === roomId2 && deviceId1 === deviceId2)));
    return true;
})()) {
    saveFavoriteDevices();
}

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
    const {mainToggleState, icon, iconText, iconColor, activeColor, interactionStates} = await instance.getCurrentState();
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
        type: (({id, super_name, sub_name, icon, interactions, defaultInteraction, defaultInteractionWhenOff, forRoomController}: DeviceTypeClass)=> ({
            id, name: super_name, sub_name, icon, interactions, forRoomController,
            defaultInteraction: (deviceType.hasMainToggle && !mainToggleState) ? defaultInteractionWhenOff : defaultInteraction
        }))(deviceType),
        icon,
        iconText,
        iconColor,
        hasMainToggle: deviceType.hasMainToggle,
        mainToggleState,
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
        case 'setTwoButtonNumberValue':
        case 'setSliderValue': {
            interaction = interaction as HMApi.T.DeviceInteraction.Type.Slider | HMApi.T.DeviceInteraction.Type.TwoButtonNumber;
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
        case 'setUIColorInputValue': {
            interaction = interaction as HMApi.T.DeviceInteraction.Type.UIColorInput;
            if (interaction.allowed !== undefined && !interaction.allowed.includes(action.color)) {
                return 'value_out_of_range';
            }
            break;
        }
    }

    return device.sendInteractionAction(interactionId, action);
}