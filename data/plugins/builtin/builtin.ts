import { HMApi, PluginApi, SettingsFieldDef } from "../../../src/plugins.js";
import arduinoBoards from "./arduino-boards.js";

export default function (api: PluginApi) {
    const logArduinoSerial = new api.Log("ArduinoSerialController");
    const logLightStandard = new api.Log("LightStandardDevice");

    enum arduinoCommands {
        pinMode= 0,
        digitalWrite= 1,
        digitalRead= 2,
        analogWrite= 3,
        analogRead= 4
    }

    class ArduinoSerialController extends (api.RoomControllerInstance) {
        static id: `${string}:${string}` = "arduino:serial";
        static super_name = "Arduino";
        static sub_name = "Serial";
        static settingsFields: SettingsFieldDef[] = [
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
        ];


        serialPort: InstanceType<typeof api.SerialPort>;

        constructor(properties: HMApi.Room) {
            super(properties);

            this.serialPort = new api.SerialPort({
                path: properties.controllerType.settings.port as string,
                baudRate: properties.controllerType.settings.baudrate as number,
                autoOpen: false,
            });
        }

        async init() {
            this.serialPort.on('close', ()=> {
                logArduinoSerial.w('Serial port closed', this.initialized);
                if(this.initialized) {
                    this.disable("Serial port closed");
                }
            });
            await new Promise<void>((resolve)=> {
                this.serialPort.open((error) => {
                    logArduinoSerial.i('Opened serial port', this.serialPort.path);
                    if(error) {
                        this.disable(error.message);
                    }
                    resolve();
                });
            });
            return super.init();
        }

        async dispose(): Promise<void> {
            await super.dispose();
            if(this.serialPort.isOpen) {
                this.serialPort.close();
            }
            this.serialPort.destroy();
        }

        static async validateSettings(settings: Record<string, string | number | boolean>): Promise<string | void> {
            const port = settings["port"] as string;
            const ports = (await api.SerialPort.list()).map(p=>p.path);
            if(!ports.includes(port)) {
                return "Port does not exist / is disconnected";
            }
        }
    }

    api.registerRoomController(ArduinoSerialController);

    class LightStandardDevice extends (api.DeviceInstance) {
        static id: `${string}:${string}` = "light:standard";
        static super_name = "Light";
        static sub_name = "Standard";
        static icon: HMApi.IconName = "Lightbulb";
        static forRoomController: `${string}:${string}` | `${string}:*` = "arduino:*";
        static settingsFields: SettingsFieldDef[] = [
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
        ];


        constructor(properties: HMApi.Device, roomId: string) {
            super(properties, roomId);
        }

        get roomController() {
            const c = super.roomController;
            if(c instanceof ArduinoSerialController) {
                return c;
            } else {
                throw new Error("Room controller is not an ArduinoSerialController"); // This error will crash hub. The reason for doing this is that things have gone too wrong for other means of error handling to be used.
            }
        }

        async init() {
            super.init();

            const port = this.roomController.settings.port as string;
            const pin = this.settings.pin as number;
            const serial = this.roomController.serialPort;
            if(serial.isOpen) {
                await new Promise<void>((resolve) => {
                    logLightStandard.i('Initializing pin', pin, port);
                    serial.write([arduinoCommands.pinMode, pin, 1], error=> {
                        if(error) {
                            this.disable(error.message);
                        }
                        resolve();
                    });
                });
            } else {
                this.disable(`Port ${port} is closed. Please restart the room controller.`);
            }
        }
    }

    api.registerDeviceType(LightStandardDevice);
}