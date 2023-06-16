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