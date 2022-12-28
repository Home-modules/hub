import { HMApi } from "../api/api.js";
import { SettingsFieldDef } from "../plugins.js";
import { RoomControllerInstance } from "../rooms/RoomControllerInstance.js";
import { Log } from "../log.js";


export abstract class DeviceInstance {
    static id: `${string}:${string}`;
    static super_name: string;
    static sub_name: string;
    static icon: HMApi.T.IconName;
    /** The room controller with which the device is compatible with. If it ends with `:*` (like `test:*`), the device is considered compatible with all subtypes. If it is `*`, the device is considered compatible with all room controller types. */
    static forRoomController: `${string}:*` | `${string}:${string}` | '*';
    /** A list of fields for the device in the edit page */
    static settingsFields: SettingsFieldDef[];
    /** Whether the devices have a main toggle */
    static hasMainToggle = false;
    /** Whether the device can be clicked in the app */
    static clickable = true;
    /** The interactions for the device */
    static interactions: Record<string, HMApi.T.DeviceInteraction.Type> = {};
    /**
     * (Optional) the ID of the interaction to show on the device itself in addition to the context menu.
     * When not set (or set to ""), an On/Off label will be shown.
     *
     * A `TwoButtonNumber` can be used in conjunction with one other interaction. To do this, separate the interactions with a plus sign (+).
     * In this case, the `TwoButtonNumber` interaction must appear first.
     */
    static defaultInteraction?: string;
    /** Default interaction(s) when `hasMainToggle==true` and `mainToggleState==false` */
    static defaultInteractionWhenOff?: string;

    /** Device ID */
    id: string;
    /** Device name */
    name: string;
    /** Device type ID */
    type: string;
    settings: Record<string, string | number | boolean>;
    roomId: string;

    disabled: false | string = false;
    initialized = false;

    /** An icon to set that overrides the default icon. */
    icon?: HMApi.T.IconName;
    /** A big text to show instead of the icon. It should be very short so it can fit in the icon area. */
    iconText?: string;
    /** Icon color override. Ignored if `mainToggleState` is true. */
    iconColor?: HMApi.T.UIColor;
    /** The main toggle state. When true, the device will be shown as active. */
    mainToggleState = false;
    /** Active highlight color override */
    activeColor?: HMApi.T.UIColor;
    /** Interaction states */
    interactionStates: Record<string, HMApi.T.DeviceInteraction.State | undefined> = {};

    #roomController: RoomControllerInstance;

    constructor(public properties: HMApi.T.Device, roomController: RoomControllerInstance) {
        this.id = properties.id;
        this.name = properties.name;
        this.type = properties.type;
        this.settings = properties.params;
        this.#roomController = roomController;
        this.roomId = roomController.id;
    }

    async init() {
        Log.i(this.constructor.name, 'Device', this.id, 'Initializing');
        this.initialized = true;
    }

    async dispose() {
        Log.i(this.constructor.name, 'Device', this.id, 'Shutting down');
        this.initialized = false;
    }

    get roomController() {
        return this.#roomController;
    }

    disable(reason: string) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Device', this.id, 'Disabled:', reason);
    }

    async getCurrentState() {
        return {
            icon: this.icon,
            iconText: this.iconText,
            iconColor: this.iconColor,
            mainToggleState: this.mainToggleState,
            activeColor: this.activeColor,
            interactionStates: this.interactionStates,
        };
    }

    async toggleMainToggle() {
        this.mainToggleState = !this.mainToggleState;
        Log.e(this.constructor.name, 'Device', this.id, 'turned', this.mainToggleState ? 'on' : 'off');
    }

    async sendInteractionAction(interactionId: string, action: HMApi.T.DeviceInteraction.Action) {
        switch (action.type) {
            case 'setSliderValue':
            case 'setTwoButtonNumberValue':
                this.interactionStates[interactionId] = {
                    value: action.value,
                };
                break;
            case 'toggleToggleButton':
                this.interactionStates[interactionId] = {
                    on: action.value,
                };
                break;
            case 'setUIColorInputValue':
                this.interactionStates[interactionId] = {
                    color: action.color,
                };
                break;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings: Record<string, string | number | boolean>): void | undefined | string | Promise<void | undefined | string> {
        return undefined;
    }
}
