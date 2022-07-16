import { ReadlineParser } from "serialport";
import { HMApi, PluginApi, SettingsFieldDef } from "../../../src/plugins.js";
import arduinoBoards from "./arduino-boards.js";

export default function (api: PluginApi) {
    const logArduinoSerial = new api.Log("ArduinoSerialController");
    const logLightStandard = new api.Log("LightStandardDevice");

    enum ArduinoCommands {
        pinMode= 0,
        digitalWrite= 1,
        digitalRead= 2,
        analogWrite= 3,
        analogRead= 4,
        DHT11 = 50,
        DHT21 = 51,
        DHT22 = 52,
    }

    enum PinMode {
        INPUT= 0,
        OUTPUT= 1,
        INPUT_PULLUP= 2
    }

    enum PinState {
        LOW= 0,
        HIGH= 1
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
        dataListeners: Record<number, (data: Buffer) => void> = {};

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
                        resolve();
                    } else {
                        this.serialPort.on('data', (data: Buffer)=> {
                            logArduinoSerial.i('Received data', Array(data.values()));
                            if(data[0] === 0) {
                                resolve();
                            }
                        });
                    }
                });
            });
            const parser = this.serialPort.pipe(new ReadlineParser({ 
                encoding: 'hex',
                delimiter: '0d0a' // \r\n
            }));
            parser.on('data', (data: string)=> {
                const buffer = Buffer.from(data, 'hex');
                const command = buffer[0];
                const rest = buffer.slice(1);
                this.dataListeners[command](rest);
            });
            return super.init();
        }

        async dispose(): Promise<void> {
            await super.dispose();
            if(this.serialPort.isOpen) {
                await new Promise<void>((resolve)=> {
                    this.serialPort.close(()=> resolve());
                });
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

        /**
         * Sends a command to the Arduino board.
         * @param command The command to send
         * @param pin The pin to use
         * @param value The parameter for the command
         */
        async sendCommand(command: ArduinoCommands, pin: number, value?: number) {
            const port = this.settings.port as string;
            const serial = this.serialPort;
            logArduinoSerial.i('Sending command to', serial.path, command, pin, value);
            if(serial.isOpen) {
                await new Promise<void>((resolve) => {
                    serial.write((
                        value === undefined ?
                            [command, pin] :
                            [command, pin, value]
                    ), error=> {
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

        lastCommandId = 1;

        /**
         * Sends a command and wait for the response from the Arduino board.
         * @param command The command to send
         * @param pin The pin to use
         */
        async sendCommandWithResponse(command: ArduinoCommands, pin: number) {
            const commandId = ((this.lastCommandId++) % 246) + 10; // 10-255
            this.sendCommand(command, pin, commandId);
            return new Promise<Buffer>((resolve) => {
                this.dataListeners[commandId] = (data: Buffer) => {
                    resolve(data);
                    delete this.dataListeners[commandId];
                };
            });
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
        static hasMainToggle = true;


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
            await super.init();
            await this.roomController.sendCommand(ArduinoCommands.pinMode, this.settings.pin as number, PinMode.OUTPUT);
            await this.roomController.sendCommand(ArduinoCommands.digitalWrite, this.settings.pin as number, this.computePinState(this.mainToggleState));
        }

        async toggleMainToggle(): Promise<void> {
            await super.toggleMainToggle();
            await this.roomController.sendCommand(ArduinoCommands.digitalWrite, this.settings.pin as number, this.computePinState(this.mainToggleState));
        }

        computePinState(state: boolean): PinState {
            return this.settings.invert ? (
                state ? PinState.LOW : PinState.HIGH
            ) : (
                state ? PinState.HIGH : PinState.LOW
            );
        }
    }

    api.registerDeviceType(LightStandardDevice);

    class ThermometerDHTDevice extends (api.DeviceInstance) {
        static id: `${string}:${string}` = "thermometer:dht";
        static super_name = "Thermometer";
        static sub_name = "DHT";
        static icon: HMApi.IconName = "TemperatureHalf";
        static forRoomController: `${string}:${string}` | `${string}:*` = "arduino:*";
        static settingsFields: SettingsFieldDef[] = [
            {
                id: 'pin',
                type: 'number',
                label: 'Pin',
                description: 'The Arduino pin on which the DHT device is connected to',
                min: 0,
                max: 255,
                required: true
            },
            {
                id: 'type',
                type: 'radio',
                label: 'DHT type',
                direction: 'h',
                required: true,
                options: {
                    "11": { label: "DHT11" },
                    "21": { label: "DHT21" },
                    "22": { label: "DHT22" },
                }
            },
            {
                id: 'unit',
                type: 'radio',
                label: 'Temperature unit',
                direction: 'h',
                required: true,
                options: {
                    "c": { label: "Celsius" },
                    "f": { label: "Fahrenheit" },
                    "k": { label: "Kelvin" },
                }
            },
            {
                type: 'horizontal_wrapper',
                columns: [
                    {
                        fields: [
                            {
                                id: 'cold_threshold',
                                type: 'number',
                                label: 'Cold threshold',
                                description: 'The temperature below which the temperature reading will turn blue, in Celsius',
                                min: -273.15,
                                max: 1000,
                                default: 20
                            }
                        ]
                    },
                    {
                        fields: [
                            {
                                id: 'warm_threshold',
                                type: 'number',
                                label: 'Warm threshold',
                                description: 'The temperature above which the temperature reading will turn orange, in Celsius',
                                min: -273.15,
                                max: 1000,
                                default: 30
                            },
                        ]
                    },
                    {
                        fields: [
                            {
                                id: 'hot_threshold',
                                type: 'number',
                                label: 'Hot threshold',
                                description: 'The temperature above which the temperature reading will turn red, in Celsius',
                                min: -273.15,
                                max: 1000,
                                default: 40
                            }
                        ]
                    }
                ]
            }
        ];
        static hasMainToggle = false;
        static clickable = false;

        static validateSettings(settings: Record<string, string | number | boolean>) {
            if(settings.cold_threshold > settings.warm_threshold) {
                return "Cold threshold must be below warm threshold";
            }
            if(settings.warm_threshold > settings.hot_threshold) {
                return "Warm threshold must be below hot threshold";
            }
        }

        get roomController() {
            const c = super.roomController;
            if(c instanceof ArduinoSerialController) {
                return c;
            } else {
                throw new Error("Room controller is not an ArduinoSerialController"); // This error will crash hub. The reason for doing this is that things have gone too wrong for other means of error handling to be used.
            }
        }

        async getCurrentState(): Promise<{ icon: HMApi.IconName | undefined; iconText: string | undefined; iconColor: HMApi.UIColor | undefined; mainToggleState: boolean; statusText: string; activeColor: HMApi.UIColor | undefined; }> {
            const commandCode = {
                "11": ArduinoCommands.DHT11,
                "21": ArduinoCommands.DHT21,
                "22": ArduinoCommands.DHT22,
            }[this.settings.type as '11' | '21' | '22'];
            const data = await this.roomController.sendCommandWithResponse(commandCode, this.settings.pin as number);
            let temperature = data.readFloatLE(0);
            const humidity = data.readFloatLE(4);
            if(temperature === -999 && humidity === -999) {
                this.disable("DHT sensor is not connected or wrong type is specified in settings");
            }
            this.iconColor = 
                temperature < this.settings.cold_threshold ? 'blue' : 
                    temperature < this.settings.warm_threshold ? undefined :
                        temperature < this.settings.hot_threshold ? 'orange' :
                            'red';
            const temperatureUnit = this.settings.unit as 'c' | 'f' | 'k';
            if(temperatureUnit === 'f') {
                temperature = (temperature * 9 / 5) + 32;
            }
            if(temperatureUnit === 'k') {
                temperature += 273.15;
            }

            this.iconText = `${temperature.toFixed(1)}${temperatureUnit==='k'?'':'°'}${temperatureUnit.toUpperCase()}`;
            this.statusText = `Humidity: ${humidity.toFixed(1)}%`;

            return super.getCurrentState();
        }
    }

    api.registerDeviceType(ThermometerDHTDevice);
}