import { HMApi } from "./api/api.js";
import { SettingsFieldDef } from "./plugins.js";

type SettingsFieldWithoutContainer = Exclude<SettingsFieldDef, HMApi.T.SettingsField.TypeContainer>;

export default function getFlatFields(fields: SettingsFieldDef[]): SettingsFieldWithoutContainer[] {
    const result: SettingsFieldWithoutContainer[] = [];

    for(const field of fields) {
        if(field.type === 'container') {
            getFlatFields(field.children).forEach(f => result.push(f));
        }
        else {
            result.push(field);
        }
    }

    return result;
}