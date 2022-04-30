import SerialPort from "serialport";

export function getSerialPorts(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        SerialPort.list().then(ports=>{
            resolve(ports.map(({path})=> path));
        }).catch(reject);
    });
}

export const ports: { [key: string]: SerialPort } = {};

export function initSerialPort(path: string, baud= 9600) {
    if(ports[path]) {
        return ports[path];
    }
    const port= new SerialPort(path, { baudRate: baud, autoOpen: true });
    
    ports[path]= port;
    return port;
}
