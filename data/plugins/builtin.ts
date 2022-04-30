import { PluginApi } from "../../src/plugins.js";
import { getSerialPorts } from "../../src/serialio.js";

export default function (api: PluginApi) {
    api.registerRoomController({
        id: "arduino:serial",
        name: "Arduino",
        sub_name: "Serial",
        onInit: ()=> console.log("Arduino serial controller initialized"),
        onBeforeShutdown: ()=> console.log("Arduino serial controller shutting down"),
        onValidateSettings: ()=> undefined,
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
                    callback: () => {
                        return new Promise((resolve, reject) => {
                            getSerialPorts().then(ports => {
                                resolve(ports.map(port => ({
                                    value: port,
                                    label: port
                                })));
                            }).catch(reject);
                        });
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
        onValidateSettings: ()=>console.log('validate light:standard settings'),
        onInit: ()=> console.log('init light:standard'),
        onBeforeShutdown: ()=> console.log('shut down light:standard'),
    });
}