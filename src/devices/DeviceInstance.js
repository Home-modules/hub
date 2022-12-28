var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DeviceInstance_roomController;
import { Log } from "../log.js";
export class DeviceInstance {
    constructor(properties, roomController) {
        this.properties = properties;
        this.disabled = false;
        this.initialized = false;
        /** The main toggle state. When true, the device will be shown as active. */
        this.mainToggleState = false;
        /** Interaction states */
        this.interactionStates = {};
        _DeviceInstance_roomController.set(this, void 0);
        this.id = properties.id;
        this.name = properties.name;
        this.type = properties.type;
        this.settings = properties.params;
        __classPrivateFieldSet(this, _DeviceInstance_roomController, roomController, "f");
        this.roomId = roomController.id;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            Log.i(this.constructor.name, 'Device', this.id, 'Initializing');
            this.initialized = true;
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            Log.i(this.constructor.name, 'Device', this.id, 'Shutting down');
            this.initialized = false;
        });
    }
    get roomController() {
        return __classPrivateFieldGet(this, _DeviceInstance_roomController, "f");
    }
    disable(reason) {
        this.disabled = reason;
        Log.e(this.constructor.name, 'Device', this.id, 'Disabled:', reason);
    }
    getCurrentState() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                icon: this.icon,
                iconText: this.iconText,
                iconColor: this.iconColor,
                mainToggleState: this.mainToggleState,
                activeColor: this.activeColor,
                interactionStates: this.interactionStates,
            };
        });
    }
    toggleMainToggle() {
        return __awaiter(this, void 0, void 0, function* () {
            this.mainToggleState = !this.mainToggleState;
            Log.e(this.constructor.name, 'Device', this.id, 'turned', this.mainToggleState ? 'on' : 'off');
        });
    }
    sendInteractionAction(interactionId, action) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static validateSettings(settings) {
        return undefined;
    }
}
_DeviceInstance_roomController = new WeakMap();
/** Whether the devices have a main toggle */
DeviceInstance.hasMainToggle = false;
/** Whether the device can be clicked in the app */
DeviceInstance.clickable = true;
/** The interactions for the device */
DeviceInstance.interactions = {};
