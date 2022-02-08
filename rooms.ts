import { HMApi } from "./api.js";

const rooms: { [key: string]: HMApi.Room } = {};

export function getRooms(): typeof rooms {
    return rooms;
}