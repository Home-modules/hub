import type { HMApi } from '../api/api.ts';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { logoutWSConnection, WSConnections } from './websocket.ts';
import { usersFilePath } from '../misc.ts';

const logins: { [username: string]: {
    /** The authentication token */
    token: string,
    /** The time when the last request was made. If a week has passed, the login expires. */
    lastRequest: Date,
    /** Device information */
    device: string,
    /** The number of requests made using this token in the last second */
    flood: number,
    /** The time the user logged in */
    loginTime: Date,
    /** The IP from which the login was last used */
    ip: string,
}[] } = {};

export type User = {
    password_hash: string
}

export let users: { [username: string]: User } = { }

if(fs.existsSync(usersFilePath)) {
    users= JSON.parse(fs.readFileSync(usersFilePath, {encoding: 'utf-8'}));
} else saveUsers();

function saveUsers() {
    fs.writeFile(usersFilePath, JSON.stringify(users), ()=>undefined);
}

export async function createUser(username: string, password: string) {
    users[username] = {
        password_hash: await Bun.password.hash(password)
    };
    saveUsers()
}

/**
 * Logs in a user.
 * @param username The username of the user
 * @param password The password of the user
 * @param device The device information
 * @param ip The IP address of the user
 * @returns An auth token for the user
 */
export async function loginUser(username: string|undefined, password: string, device: string, ip: string): Promise<string> {
    username = Object.keys(users).find(u=> u.toLowerCase() === username?.toLowerCase());
    if(!(username && users[username])) {
        throw new Error('USER_NOT_FOUND');
    }
    if(!await Bun.password.verify(password, users[username].password_hash)) {
        throw new Error('PASSWORD_INCORRECT');
    }
    const tk= crypto.randomBytes(32).toString('hex');
    logins[username]= logins[username] || [];
    logins[username].push({
        token: tk,
        device,
        lastRequest: new Date(),
        flood: 0,
        loginTime: new Date(),
        ip
    });
    return `${username}:${tk}`;
}

/**
 * Checks if an auth token is valid.
 * @param token The auth token
 * @returns The username of the user or null if the token is invalid
 * @throws `FLOOD` if the user has made over 10 requests in the last second
 */
export function checkAuthToken(token: string): string | null {
    const now = new Date();

    const [username, tk] = token.split(':');
    const login = logins[username]?.find(t => t.token === tk);
    if(!login) {
        return null;
    }
    if(login.lastRequest.getTime() + 1000 * 60 * 60 * 24 * 7 < now.getTime()) { // Drop the token after a week of disuse
        logins[username] = logins[username].filter(t => t !== login);
        logoutWSConnection(token);
        return null;
    }
    
    return username;
}

export function incrementRateLimit(token: string, times = 1, throwIfExceeded = true) {
    const now = new Date();

    const [username, tk] = token.split(':');
    const login = logins[username]?.find(t => t.token === tk);
    if(!login) {
        return;
    }

    if (login.lastRequest.getTime() + 1000 < now.getTime()) {
        login.flood = 0; // Sometimes the flood value will get stuck without coming down, even though no requests are made.
    }
    login.lastRequest= now;
    login.flood += times;
    if(login.flood > 10 && throwIfExceeded) {
        throw 'FLOOD';
    }
    setTimeout(()=>{
        // Find the token again, because it may have moved in the array, or been removed
        const login = logins[username]?.find(t => t.token === tk);
        if(login) {
            login.flood = Math.max(login.flood - times, 0);
        }
    }, 1000);
}

/**
 * Logs out a user
 * @param token The auth token
 * @returns True if the token is valid and the user was successfully logged out
 */
export function logOutSession(token: string): boolean {
    const [username, tk] = token.split(':');
    logoutWSConnection(token);
    if(logins[username]?.some(t => t.token === tk)) {
        logins[username]= logins[username].filter(t => t.token !== tk);
        return true;
    }
    return false;
}

/**
 * Logs out all sessions of a user except the active one
 * @param token The auth token
 * @returns The number of sessions that were logged out
 */
export function logOutOtherSessions(token: string): number {
    const [username, tk] = token.split(':');
    if(logins[username]) {
        const n = logins[username].length - 1;
        logins[username].filter(l => l.token !== tk).forEach(l => logoutWSConnection(username+':'+l.token));
        logins[username]= logins[username].filter(l => l.token === tk);
        return n;
    }
    return 0;
}

export function getSessionsCount(token: string): number {
    const [username] = token.split(':');
    return logins[username]?.length || 0;
}

/**
 * Changes the password of a user
 * @param username The username of the user
 * @param oldP The old password, used to verify the user
 * @param newP The new password
 * @returns True if oldP is valid and password was changed
 */
export async function changePassword(token: string, oldP: string, newP: string) {
    const [username] = token.split(':');

    if(!await Bun.password.verify(oldP, users[username].password_hash)) {
        throw 'PASSWORD_INCORRECT';
    }

    users[username].password_hash = await Bun.password.hash(newP);
    saveUsers();
}

/**
 * Changes the user's username
 * @param username The username of the user
 * @param newUsername New username for the user
 * @returns A new token with changed username, or false if the username is already taken
 */
export function changeUsername(token: string, newUsername: string): string|false {
    const [username, tk] = token.split(':');
    if((!users[username]) || usernameExists(token, newUsername)) {
        return false;
    }

    logins[username].filter(l => l.token !== tk).forEach(l => logoutWSConnection(username + ':' + l.token));
    WSConnections.filter(c => c.data === token).forEach(c => c.data = `${newUsername}:${tk}`);
    users[newUsername]= users[username];
    delete users[username];
    saveUsers();
    logins[newUsername]= [logins[username].find(t => t.token === tk)!];
    delete logins[username];
    return `${newUsername}:${tk}`;
}

/**
 * Checks if a username is taken.
 * 
 * The case variations of another user's username are all considered taken, while for one's own username, case variations are considered free.
 * @param token The toke of the user who performed the request
 * @param username The username to be checked
 * @returns False if the username is free, true if the username is taken
 */
export function usernameExists(token: string, username: string): boolean {
    const [requester] = token.split(':');
    if(requester.toLowerCase() === username.toLowerCase()) {
        return !!users[username];
    } else {
        return Object.keys(users).some(u=> u.toLowerCase() == username?.toLowerCase());
    }
}

export function getSessions(token: string): HMApi.T.Session[] {
    const [username, tk] = token.split(':');
    return logins[username]?.map(t => ({
        id: crypto.createHash('sha256').update(t.token).digest('hex'),
        device: t.device,
        lastUsedTime: t.lastRequest.getTime(),
        loginTime: t.loginTime.getTime(),
        ip: t.ip,
        isCurrent: t.token === tk
    })).sort((a,b) => {
        if(a.isCurrent) return -1;
        if(b.isCurrent) return 1;
        return a.lastUsedTime - b.lastUsedTime;
    }) || [];
}

export function terminateSession(token: string, sessionId: string) {
    const [username] = token.split(':');

    for(const login of logins[username]) {
        const id = crypto.createHash('sha256').update(login.token).digest('hex');
        if(id === sessionId) {
            logins[username] = logins[username].filter(t => t.token !== login.token);
            logoutWSConnection(username+':'+login.token);
            return;
        }
    }
    throw 'SESSION_NOT_FOUND';
}

