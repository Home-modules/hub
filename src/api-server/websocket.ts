import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import https from 'https';
import { Log } from '../log.js';
import { checkAuthToken, incrementRateLimit } from './auth.js';
import { HMApi } from '../plugins.js';

const log = new Log('websocket');

type WSConnectionObj = {
    token: string | null;
    connection: WebSocket;
};
export let WSConnections: WSConnectionObj[] = [];

export function createWSServer(httpServer: https.Server | http.Server) {
    log.d("Creating WebSocket server");
    const server = new WebSocketServer({
        server: httpServer
    });
    server.on('connection', ws => {
        log.i("New WS connection");
        const connectionObj: WSConnectionObj = { token: null, connection: ws };
        WSConnections.push(connectionObj);
        ws.on('message', message => {
            log.i("Message from WS:", message.toString());
            if (message.toString().startsWith('auth ')) {
                const token = message.toString().slice(5);
                log.i("Trying to auth with token", token);
                if (checkAuthToken(token)) {
                    incrementRateLimit(token);
                    connectionObj.token = token;
                    ws.send("AUTH_OK");
                    log.i("Authorized with token", token);
                } else {
                    log.w("WS auth failed: Token invalid");
                    ws.send("TOKEN_INVALID");
                }
            }
        });
        ws.on('close', () => {
            log.i("Closed WS connection with token", connectionObj.token);
            WSConnections.splice(WSConnections.indexOf(connectionObj), 1);
        });
    });
}

export function logoutWSConnection(token: string) {
    log.i("Logging out WS connections with token", token);
    WSConnections.filter(c => c.token === token).forEach(c => {
        c.token = null;
        c.connection.send("LOGGED_OUT");
    });
}

export function sendUpdate(update: HMApi.Update, username = '*') {
    log.i("Sending update to ", username);
    log.i(update);
    const recipients = (username === '*' ? WSConnections.filter(c => c.token) : WSConnections.filter(c => c.token && c.token.split(':')[0] === username));
    log.d("Recipients:", recipients.map(r => r.token));
    recipients.forEach(c => c.connection.send("UPDATE " + JSON.stringify(update)));
}