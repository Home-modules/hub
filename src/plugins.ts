import { HMApi } from './api/api.js';
import { DeviceTypeClass, registerDeviceType } from './devices/devices.js';
import { DeviceInstance } from "./devices/DeviceInstance.js";
import { Log } from './log.js';
import { registerRoomController } from './rooms/rooms.js';
import { RoomControllerInstance } from "./rooms/RoomControllerInstance.js";
import { checkType, HMApi_Types } from './api/api_checkType.js';
import hubVersion from './version.js';
import { authorRegex } from './misc.js';
import { shutdownHandler } from './async-cleanup.js';
import semver from 'semver';
import fs from 'fs';

const log = new Log('plugins');

const pluginsRoot = '../node_modules';

let activatedPlugins: string[] = [ ];
export async function initPlugins() {
    if (!(() => {
        const corruptError = "Warning: The file containing information about the list of activated plugins is corrupt. All plugins have been deactivated.";
        if (!fs.existsSync('../data/plugins.json'))  {
            log.w("data/plugins.json doesn't exist. Creating it...");
            return false;
        }
        const json = fs.readFileSync('../data/plugins.json', 'utf8');
        if (!json) {
            console.error(corruptError);
            log.e("data/plugins.json exists but is empty. This was probably caused by a crash while saving the file. Recreating it...");
            return false;
        }
        try {
            activatedPlugins = JSON.parse(json);
        } catch (e) {
            console.error(corruptError);
            log.e("data/plugins.json contains malformed JSON. Recreating it...");
            log.e(e);
            return false;
        }
        if (!(activatedPlugins instanceof Array)) {
            console.error(corruptError);
            log.e("data/plugins.json is corrupt: the type is not an array. Recreating it...");
            return false;
        }
        return true;
    })()) {
        savePlugins([]);
    }
    await registerPlugins();
}

async function savePlugins(plugins: string[]) {
    return fs.promises.writeFile('../data/plugins.json', JSON.stringify(activatedPlugins = plugins));
}

const deviceTypesToRegister: DeviceTypeClass[] = [];

async function registerPlugins() {
    log.i('Loading plugins:', activatedPlugins.join(', '));
    for (const name of activatedPlugins) {
        try {
            await import('hmp-' + name);
        } catch (err) {
            log.e(`Error loading plugin ${name}:`, err);
            console.error(`Warning: Plugin ${name} could not be loaded.`);
            await shutdownHandler('error');
        }
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

export type PluginInfo = {
    name: string,
    version: string,
    title: string,
    description?: string,
    tags?: string[],
    main?: string,
    author?: string | {
        name: string,
        url?: string
    },
    homepage: string,
    compatibleWithHub: string
}

/** Returns plugin info, or undefined if the plugin is invalid */
export async function getPluginInfo(id: string, isFullyInstalled = true): Promise<undefined | HMApi.T.Plugin> {
    const pluginDir = `${pluginsRoot}/hmp-${id}`;
    
    const infoJSON = await fs.promises.readFile(`${pluginDir}/package.json`, 'utf-8').catch(() => null);
    if (!infoJSON) {
        log.e("Invalid plugin: plugin", id, "does not have a package.json file");
        return;
    }

    let info: PluginInfo;
    try {
        info = JSON.parse(infoJSON);
    } catch (error) {
        log.e("Invalid plugin: could not parse", `${pluginDir}/package.json`, error);
        return;
    }

    const error = checkType(info, HMApi_Types.objects.PluginInfoFile);
    if (error) {
        log.e("Invalid plugin:", `${pluginDir}/package.json`, "is invalid:", error);
        return;
    }

    if (info.name !== 'hmp-'+id) {
        log.e("Invalid plugin:", `the 'name' field in ${pluginDir}/package.json is incorrect`);
        return;
    }

    const compatible = semver.satisfies(hubVersion, info.compatibleWithHub);

    info.main ||= id + '.js';

    if (!info.main.endsWith('.js')) {
        log.e("Invalid plugin: main file for", id, "is not a JS file. If the plugin is in TypeScript, you have to compile it and set `main` to point to a js file.");
        return;
    }

    const mainFileTs = info.main.slice(0, -3) + '.ts';
    const jsFileExists = await fs.promises.stat(`${pluginDir}/${info.main}`).catch(() => null);
    const tsFileExists = jsFileExists ? false : await fs.promises.stat(`${pluginDir}/${mainFileTs}`).catch(() => null);

    if (!(isFullyInstalled ? jsFileExists : (jsFileExists || tsFileExists))) {
        log.e("Invalid plugin: plugin", id, `entry point file (${pluginDir}/${info.main}) not found.`);
        return;
    }

    let author: string | undefined = undefined,
        authorWebsite: string | undefined = undefined;
    if (typeof info.author === 'string') {
        const regexRes = authorRegex.exec(info.author);
        if (regexRes) {
            author = regexRes[1]; authorWebsite = regexRes[3];
        }
    } else {
        author = info.author?.name;
        authorWebsite = info.author?.url;
    }

    return {
        id,
        name: info.title,
        version: info.version,
        description: info.description,
        author,
        authorWebsite,
        homepage: info.homepage,
        activated: activatedPlugins.includes(id),
        compatible,
        tags: info.tags?.length ? info.tags : undefined
    };
}

export async function getInstalledPlugins() {
    return Object.keys(JSON.parse(await fs.promises.readFile('../package.json', 'utf-8')).dependencies).filter(p => p.startsWith('hmp-')).map(p => p.slice(4 /** 'hmp-'.length */));
}

export async function getInstalledPluginsInfo() {
    log.i(`Scanning for plugins in ${pluginsRoot}`);
    const plugins = await getInstalledPlugins();

    return (await Promise.all(plugins.map(async (name): Promise<HMApi.T.Plugin | undefined> => {
        log.i("Plugin found:", name);

        return getPluginInfo(name);
    }))).filter(Boolean) as HMApi.T.Plugin[];
}

export async function togglePluginIsActivated(id: string, newActivatedState: boolean, shouldRestart = true) {
    if (activatedPlugins.includes(id) == newActivatedState) return;
    await savePlugins(newActivatedState ? [...activatedPlugins, id] : activatedPlugins.filter(plugin => plugin !== id));
    shouldRestart && shutdownHandler('restart');
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
    Exclude<HMApi.T.SettingsField, HMApi.T.SettingsField.TypeSelect | HMApi.T.SettingsField.TypeContainer> | // Exclude HMApi.SettingsFieldSelect and add the modified version
    SettingsFieldSelectDef |
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
