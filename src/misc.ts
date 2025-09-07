export const authorRegex = /^\s*([^<(]*?)\s*([<(]([^>)]*?)[>)])?\s*([<(]([^>)]*?)[>)])*\s*$/; // From package author-regex, couldn't use the package because of the lack of TS typings.

export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const dataPath = "./data";
export const httpsKeyPath = `${dataPath}/key.pem`;
export const httpsCertPath = `${dataPath}/cert.pem`;
export const usersFilePath = `${dataPath}/users.json`;
export const settingsFilePath = `${dataPath}/settings.json`;
export const pluginsFilePath = `${dataPath}/plugins.json`;
export const logFilePath = `${dataPath}/log.log`;
export const roomsFilePath = `${dataPath}/rooms.json`;
export const devicesFilePath = `${dataPath}/devices.json`;
export const favoriteDevicesFilePath = `${dataPath}/favorite-devices.json`;
export const automationFilePath = `${dataPath}/automation-routines.json`;