import fs from 'fs';
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
        await import(pluginPath);
        log.d("Plugin loaded");
    }
    log.i('Registered plugins');
    for(const deviceType of deviceTypesToRegister) {
        registerDeviceType(deviceType);
    }
    log.i('Registered device types');
}

function queueDeviceTypeRegistration(def: DeviceTypeClass) {
    deviceTypesToRegister.push(def);
}

export {
    HMApi,
    Log,
    RoomControllerInstance,
    DeviceInstance,
    registerRoomController,
    queueDeviceTypeRegistration as registerDeviceType
};

// Similar to an array of HMApi.SettingsField, but SettingsFieldSelect.options when isLazy=true requires a function to be called to get the options
export type SettingsFieldDef = (
    Exclude<HMApi.T.SettingsField, HMApi.T.SettingsField.TypeSelect | HMApi.T.SettingsField.TypeHorizontalWrapper | HMApi.T.SettingsField.TypeContainer> | // Exclude HMApi.SettingsFieldSelect and add the modified version
    SettingsFieldSelectDef |
    (Omit<HMApi.T.SettingsField.TypeHorizontalWrapper, 'columns'> & {
        columns: (Omit<HMApi.T.SettingsField.HorizontalWrapperColumn, 'fields'> & {
            fields: SettingsFieldDef[]
        })[]
    }) |
    (Omit<HMApi.T.SettingsField.TypeContainer, 'children'> & {
        children:  SettingsFieldDef[]
    })
);

export type SettingsFieldSelectDef = (
    Omit<HMApi.T.SettingsField.TypeSelect, 'options'> & { // Replace `options` field with the modified version
        options: (
            (HMApi.T.SettingsField.SelectOption|HMApi.T.SettingsField.SelectOptionGroup)[] | (HMApi.T.SettingsField.SelectLazyOptions & { // Use original types, but add a property to SettingsFieldSelectLazyOptions
                callback(): 
                    (HMApi.T.SettingsField.SelectOption|HMApi.T.SettingsField.SelectOptionGroup)[] |
                    {error: true, text: string} |
                    Promise<
                        (HMApi.T.SettingsField.SelectOption|HMApi.T.SettingsField.SelectOptionGroup)[] |
                        {error: true, text: string}
                    >
            })
        )
    }
)

export type x = SettingsFieldSelectDef extends HMApi.T.SettingsField.TypeSelect ? true : false;