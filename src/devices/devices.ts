import { HMApi } from "../api/api.js";
import { getRoom, getRooms, roomControllerInstances } from "../rooms/rooms.js";
import { NonAbstractClass } from "../rooms/RoomControllerInstance.js";
import { Log } from "../log.js";
import { HMApi_Types } from "../api/api_checkType.js";
import { DeviceInstance } from "./DeviceInstance.js";
import { loadDevicesFile } from "./devicesFile.js";
import { loadFavoriteDevices, saveFavoriteDevices } from "./favoriteDevices.js";

export const log = new Log("devices");

export let devices: Record<string, Record<string, HMApi.T.Device>> = { };
export let favoriteDevices: [string, string][] = [];
export function setDevices(Devices: typeof devices) { devices = Devices; }
export function setFavoriteDevices(favorites: typeof favoriteDevices) { favoriteDevices = favorites; }

loadDevicesFile();
loadFavoriteDevices();

export const liveSliderStreams: Record<number, { device: DeviceInstance, interactionId: string; }> = {};

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
    room.devices[id] = new (getDeviceTypes(room.type)[device.type])(devices[roomId][id], roomControllerInstances[roomId]);
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

export function startLiveSlider(device: DeviceInstance, interactionId: string): number {
    const id = Math.floor(Math.random() * (2 ** 50));
    liveSliderStreams[id] = { device, interactionId };
    return id;
}
export function endLiveSlider(id: number): boolean {
    const exists = id in liveSliderStreams;
    delete liveSliderStreams[id];
    return exists;
}