import crypto from 'crypto';
import fs from 'fs';

const loginTokens: { [username: string]: string[] } = {};

let users: { [username: string]: string } = {
    admin: crypto.createHash('sha256').update('admin').digest('hex')
};

if(fs.existsSync('./users.json')) {
    users= JSON.parse(fs.readFileSync('./users.json', {encoding: 'utf-8'}));
} else saveUsers();

function saveUsers() {
    fs.writeFile('./users.json', JSON.stringify(users), ()=>undefined);
}

/**
 * Logs in a user.
 * @param username The username of the user
 * @param password The password of the user
 * @returns An auth token for the user
 */
export function loginUser(username: string, password: string): string {
    if(!users[username]) {
        throw new Error('USER_NOT_FOUND');
    }
    if(users[username] !== crypto.createHash('sha256').update(password).digest('hex')) {
        throw new Error('PASSWORD_INCORRECT');
    }
    const tk= crypto.randomBytes(32).toString('hex');
    loginTokens[username]= loginTokens[username] || [];
    loginTokens[username].push(tk);
    return username + ':' + tk;
}

/**
 * Checks if an auth token is valid.
 * @param token The auth token
 * @returns The username of the user or null if the token is invalid
 */
export function checkAuthToken(token: string): string|null {
    const [username, tk] = token.split(':');
    return loginTokens[username]?.includes(tk) ? username : null;
}

/**
 * Logs out a user
 * @param token The auth token
 * @returns True if the token is valid and the user was successfully logged out
 */
export function logOutSession(token: string): boolean {
    const [username, tk] = token.split(':');
    if(loginTokens[username]?.includes(tk)) {
        loginTokens[username]= loginTokens[username].filter(t => t !== tk);
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
    if(loginTokens[username]) {
        const n= loginTokens[username].length - 1;
        loginTokens[username]= loginTokens[username].filter(t => t === tk);
        return n;
    }
    return 0;
}

export function getSessionsCount(token: string): number {
    const [username] = token.split(':');
    return loginTokens[username]?.length || 0;
}

/**
 * Changes the password of a user
 * @param username The username of the user
 * @param oldP The old password, used to verify the user
 * @param newP The new password
 * @returns True if oldP is valid and password was changed
 */
export function changePassword(username: string, oldP: string, newP: string): boolean {
    if(users[username] !== crypto.createHash('sha256').update(oldP).digest('hex')) {
        return false;
    }
    users[username]= crypto.createHash('sha256').update(newP).digest('hex');
    saveUsers();
    return true;
}
