import { PluginApi } from "../../../src/plugins.js";
import arduinoBoards from "./arduino-boards.js";

export default function (api: PluginApi) {
    const openSerialPorts: Record<string, InstanceType<typeof api.SerialPort>> = {};

    enum arduinoCommands {
        pinMode= 0,
        digitalWrite= 1,
        digitalRead= 2,
        analogWrite= 3,
        analogRead= 4
    }

    api.registerRoomController({
        id: "arduino:serial",
        name: "Arduino",
        sub_name: "Serial",
        onInit: (room)=> {
            openSerialPorts[room.id] = new api.SerialPort(room.controllerType.settings.port as string, {
                baudRate: room.controllerType.settings.baudrate as number,
                autoOpen: false
            });
            return new Promise((resolve, reject)=> {
                openSerialPorts[room.id].open((error) => {
                    console.log('done opening');
                    if(error) reject(error); else resolve();
                });
            });
        },
        onBeforeShutdown: (room)=> {
            openSerialPorts[room.id].close();
            delete openSerialPorts[room.id];
        },
        onValidateSettings: async (values)=> {
            const port = values["port"] as string;
            const ports = (await api.SerialPort.list()).map(p=>p.path);
            if(!ports.includes(port)) {
                return "Port does not exist / is disconnected";
            }
        },
        settingsFields: [
            {
                id: "port",
                type: 'select',
                label: "Serial port",
                required: true,
                allowCustomValue: true,
                checkCustomValue: true,
                options: {
                    isLazy: true,
                    loadOn: "render",
                    refreshOnOpen: true,
                    fallbackTexts: {
                        whenLoading: "Scanning...",
                        whenEmpty: "No serial ports found",
                        whenError: "Could not scan for serial ports",
                    },
                    showRefreshButton: [true, {
                        whenEmpty: "Refresh ports",
                        whenNormal: "Refresh ports",
                        whenLoading: "Scanning"
                    }],
                    callback: async() => {
                        const ports = await api.SerialPort.list();
                        return ports.map(port => ({
                            value: port.path,
                            label: port.path,
                            subtext: arduinoBoards[port.vendorId+'-'+port.productId]
                        }));
                    },
                }
            },
            {
                id: "baudrate",
                type: 'number',
                label: "Baud rate",
                required: true,
                default: 9600,
                min: 300,
                max: 115200,
                min_error: "Baud rate too low, performance will be affected",
                max_error: "Baud rate too high, reliability will be affected",
                postfix: "bps",
                placeholder: "9600",
                scrollable: false
            }
        ]
    });
    api.registerDeviceType({
        id: 'light:standard',
        name: "Light",
        sub_name: "Standard",
        icon: "Lightbulb",
        forRoomController: 'arduino:*',
        settingsFields: [
            {
                id: 'pin',
                type: 'number',
                label: 'Pin',
                default: 13,
                description: 'The Arduino pin on which the light is connected to',
                min: 0,
                max: 255,
                required: true
            },
            {
                id: 'invert',
                type: 'checkbox',
                label: 'Invert control pin',
                default: false,
                description: 'Currently pin will be LOW when off and HIGH when on',
                description_on_true: 'Currently pin will be HIGH when off and LOW when on',
            }
        ],
        onValidateSettings: ()=>undefined,
        onInit: (device, room)=> {
            const port = room.controllerType.settings.port as string;
            const pin = device.params.pin as number;
            const serial = openSerialPorts[room.id];
            console.log('init light');
            if(serial?.isOpen) {
                return new Promise((resolve, reject) => {
                    serial.write([arduinoCommands.pinMode, pin, 1], (error, bytesWritten)=> {
                        if(error) {
                            reject(error);
                        // } else if (bytesWritten!==3) {
                        //     reject(`The number of bytes written to ${port} was ${bytesWritten}, expected 3`);
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                throw new Error(`Port ${port} is closed`);
            }
        },
        onBeforeShutdown: ()=> {
            //
        },
    });
}