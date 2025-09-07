import { Log } from '../log.ts';
import { checkAuthToken, incrementRateLimit } from './auth.ts';
import type { HMApi } from '../plugins.ts';
import { liveSliderStreams } from '../devices/devices.ts';

const log = new Log('websocket');

type WSServer = Bun.ServerWebSocket<string | undefined>;

export const WSConnections: WSServer[] = [];

export const WebSocketServer: Bun.WebSocketHandler<string | undefined> = {
    open(ws) {
        log.i("New WS connection");
        WSConnections.push(ws);
    },
    close(ws) {
        log.i("Closed WS connection with token", ws.data);
        WSConnections.splice(WSConnections.indexOf(ws), 1);
    },
    message(ws, e) {
        const message = e.toString();
        log.i("Message from WS:", message);

        if (message.startsWith('AUTH ')) {
            const token = message.toString().slice(5);
            log.i("Trying to auth with token", token);
            if (checkAuthToken(token)) {
                incrementRateLimit(token, 1, false);
                ws.data = token;
                ws.send("AUTH_OK");
                log.i("Authorized with token", token);
            } else {
                log.w("WS auth failed: Token invalid");
                ws.send("TOKEN_INVALID");
            }
        }
        else {
            if (!ws.data)
                return; // Ignore non-authorized users

            if (message.startsWith("SLIDER_VALUE ")) {
                const [_, id, value] = message.split(' ');
                const stream = liveSliderStreams[parseInt(id)];
                stream?.device.sendInteractionAction(stream.interactionId, {
                    type: "setSliderValue",
                    value: parseFloat(value)
                });
            }
        }
    },
}

// export function createWSServer(httpServer: https.Server | http.Server) {
//     log.d("Creating WebSocket server");
//     const server = new WebSocketServer({
//         server: httpServer
//     });
//     server.on('connection', ws => {
//         ws.on('message', e => {
//         });
//         ws.on('close', () => {
//             log.i("Closed WS connection with token", connectionObj.token);
//             WSConnections.splice(WSConnections.indexOf(connectionObj), 1);
//         });
//     });
// }

export function logoutWSConnection(token: string) {
    log.i("Logging out WS connections with token", token);
    WSConnections.filter(c => c.data === token).forEach(c => {
        c.data = undefined;
        c.send("LOGGED_OUT");
    });
}

export function sendUpdate(update: HMApi.Update, username = '*') {
    log.i("Sending update to ", username);
    log.i(update);
    const recipients = username === '*' ?
            WSConnections.filter(c => c.data) :
            WSConnections.filter(c => c.data && c.data.split(':')[0] === username);
    log.d("Recipients:", recipients.map(r => r.data));
    recipients.forEach(c => c.send("UPDATE " + JSON.stringify(update)));
}