import fs from 'fs';
import SerialPort from 'serialport';
import { HMApi } from './api.js';
import { DeviceTypeDef, registerDeviceType } from './devices.js';
import { registerRoomController } from './rooms.js';
import { getSerialPorts } from './serial-io.js';

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

const deviceTypesToRegister: DeviceTypeDef[] = [];

async function registerPlugins(plugins: string[]) {
    for(const path of plugins) {
        let pluginPath: string;
        if(fs.existsSync(`../data/plugins/${path}.js`) || fs.existsSync(`../data/plugins/${path}.ts`)) {
            pluginPath = `../data/plugins/${path}.js`;
        } else if(fs.existsSync(`../data/plugins/${path}/${path}.js`) || fs.existsSync(`../data/plugins/${path}/${path}.ts`)) {
            pluginPath = `../data/plugins/${path}/${path}.js`;
        } else {
            throw new Error(`Failed to load plugin '${path}': Plugin main file not found`);
        }
        const plugin = await import(pluginPath);
        if(!(typeof plugin == 'object')) {
            throw new Error(`Failed to load plugin '${path}': Importing plugin main file went wrong`);
        }
        if(!('default' in plugin && typeof plugin.default == 'function')) {
            throw new Error(`Failed to load plugin '${path}': Plugin main file has no default export or its default export is not a function`);
        }
        plugin.default(PluginApi);
    }
    for(const deviceType of deviceTypesToRegister) {
        registerDeviceType(deviceType);
    }
}

const PluginApi= {
    /**
     * Registers a device type.  
     * **NOTE: Device types are not registered immediately, but after all plugins are loaded, because they depend on room controller types that may not be registered yet.**
     * @param def The device information.
     */
    registerDeviceType(def: DeviceTypeDef) {
        deviceTypesToRegister.push(def);
    },
    /**
     * Registers a room controller type.
     * @param def The room controller information.
     */
    registerRoomController,
    /**
     * Scans the available serial ports on the hub.
     * @returns An array of serial port paths
     */
    getSerialPorts,
    /**
     * The SerialPort class from the 'serialport' npm package
     */
    SerialPort
};

export type PluginApi = typeof PluginApi;

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