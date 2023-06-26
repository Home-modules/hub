import fs from 'fs';
import { Log } from './log.js';

const log = new Log('settings');

export type Settings = {
    /**
     * The port on which to host the API and web app (if available)
     * @default 80 for HTTP, 443 for HTTPS
     */
    port?: number;
    /**
     * Whether to use HTTP even if certificate was found
     * @default false
     */
    forceHTTP?: boolean;
    /**
     * How many times a device or room can restart automatically if it encounters an error.
     * 0 disables automatic restarts.
     * @default 5
     */
    autoRestartMaxTries?: number;
    /**
     * The amount of time to wait before restarting a failed device or room each time, in seconds
     * @default 5
     */
    autoRestartDelay?: number
};

export let settings: Settings;

export function saveSettings() {
    return fs.promises.writeFile("../data/settings.json", JSON.stringify(settings));
}

if (!(() => {
    if (!fs.existsSync("../data/settings.json")) {
        log.i("settings.json does not exist and will be created.");
        return false;
    }
    const file = fs.readFileSync("../data/settings.json", "utf-8");
    if (file == "") {
        log.e("settings.json is empty. This was probably caused by a crash.");
        return false;
    }
    try {
        settings = JSON.parse(file);
    } catch (e) {
        log.e("settings.json has invalid JSON.");
        log.e(e);
        return false;
    }

    return true;
})()) {
    settings = {};
    saveSettings();
    log.i("Using default settings");
    console.log("The settings file is corrupt. Using default settings. Check logs for details.");
}

export function getSetting<T extends (keyof Settings)>(id: T, def: Settings[T]): Exclude<Settings[T], undefined> {
    let res = settings[id];
    if (res === undefined) res = def;
    return res as Exclude<Settings[T], undefined>; // dumb TS
}