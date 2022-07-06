import fs from 'fs';
import SerialPort from 'serialport';
import { HMApi } from './api.js';
import { DeviceInstance, DeviceTypeClass, registerDeviceType } from './devices.js';
import { Log } from './log.js';
import { registerRoomController, RoomControllerInstance } from './rooms.js';
const log = new Log('plugins');

export async function initPlugins() {
    if(fs.existsSync('../data/plugins.json')) {
        await registerPlugins(JSON.parse(fs.readFileSync('../data/plugins.json', 'utf8')));
    } else {
        savePlugins(['builtin']);
        await registerPlugins(['builtin']);
    }
}

function savePlugins(plugins: string[]) {
    fs.writeFile('../data/plugins.json', JSON.stringify(plugins), ()=>undefined);
}

const deviceTypesToRegister: DeviceTypeClass[] = [];

async function registerPlugins(plugins: string[]) {
    log.i('Plugins', plugins.join(', '));
    for(const name of plugins) {
        let pluginPath: string;
        if(fs.existsSync(`../data/plugins/${name}`)) {
            if(fs.existsSync(`../data/plugins/${name}/${name}.js`) || fs.existsSync(`../data/plugins/${name}/${name}.ts`)) {
                pluginPath = `../data/plugins/${name}/${name}.js`;
            } else {
                throw new Error(`Failed to load plugin '${name}': Plugin main file not found`);
            }
        } else {
            throw new Error(`Failed to load plugin '${name}': Plugin directory not found`);
        }
        log.d("Plugin found at", pluginPath);
        const plugin = await import(pluginPath);
        log.d("Plugin file loaded");
        if(!(typeof plugin == 'object')) {
            throw new Error(`Failed to load plugin '${name}': Importing plugin main file went wrong`);
        }
        if(!('default' in plugin && typeof plugin.default == 'function')) {
            throw new Error(`Failed to load plugin '${name}': Plugin main file has no default export or its default export is not a function`);
        }
        plugin.default(PluginApi);
        log.d("Plugin run");
    }
    log.i('Registered plugins');
    for(const deviceType of deviceTypesToRegister) {
        registerDeviceType(deviceType);
    }
    log.i('Registered device types');
}

const PluginApi= {
    /**
     * Registers a device type.  
     * **NOTE: Device types are not registered immediately, but after all plugins are loaded, because they depend on room controller types that may not be registered yet.**
     * @param def The device information.
     */
    registerDeviceType(def: DeviceTypeClass) {
        deviceTypesToRegister.push(def);
    },
    /**
     * Registers a room controller type.
     * @param def The room controller information.
     */
    registerRoomController,
    /**
     * The SerialPort class from the 'serialport' npm package
     */
    SerialPort,
    /**
     * The RoomControllerInstance class.
     */
    RoomControllerInstance,
    /**
     * The DeviceInstance class.
     */
    DeviceInstance,
    /**
     * A class for logging
     */
    Log,
};

export type PluginApi = typeof PluginApi;
export {HMApi};

// Similar to an array of HMApi.SettingsField, but SettingsFieldSelect.options when isLazy=true requires a function to be called to get the options
export type SettingsFieldDef = (
    Exclude<HMApi.SettingsField, HMApi.SettingsFieldSelect | HMApi.SettingsFieldHorizontalWrapper | HMApi.SettingsFieldContainer> | // Exclude HMApi.SettingsFieldSelect and add the modified version
    SettingsFieldSelectDef |
    (Omit<HMApi.SettingsFieldHorizontalWrapper, 'columns'> & {
        columns: (Omit<HMApi.SettingsFieldHorizontalWrapperColumn, 'fields'> & {
            fields: SettingsFieldDef[]
        })[]
    }) |
    (Omit<HMApi.SettingsFieldContainer, 'children'> & {
        children:  SettingsFieldDef[]
    })
);

export type SettingsFieldSelectDef = (
    Omit<HMApi.SettingsFieldSelect, 'options'> & { // Replace `options` field with the modified version
        options: (
            (HMApi.SettingsFieldSelectOption|HMApi.SettingsFieldSelectOptionGroup)[] | (HMApi.SettingsFieldSelectLazyOptions & { // Use original types, but add a property to SettingsFieldSelectLazyOptions
                callback(): 
                    (HMApi.SettingsFieldSelectOption|HMApi.SettingsFieldSelectOptionGroup)[] |
                    {error: true, text: string} |
                    Promise<
                        (HMApi.SettingsFieldSelectOption|HMApi.SettingsFieldSelectOptionGroup)[] |
                        {error: true, text: string}
                    >
            })
        )
    }
)

export type x = SettingsFieldSelectDef extends HMApi.SettingsFieldSelect ? true : false;