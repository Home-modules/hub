import SerialPort from "serialport";
import { HMApi } from "./api.js";

export function getSerialPorts(): Promise<HMApi.SerialPort[]> {
    return new Promise((resolve, reject) => {
        SerialPort.list().then(ports=>{
            resolve(ports.map(({path})=> ({path})));
        }).catch(reject);
    });
}