import { HMApi } from "./api.js";
import { SettingsFieldDef } from "./plugins.js";

type SettingsFieldWithoutContainer = Exclude<SettingsFieldDef, HMApi.SettingsFieldContainer | HMApi.SettingsFieldHorizontalWrapper>;

export default function getFlatFields(fields: SettingsFieldDef[]): SettingsFieldWithoutContainer[] {
    const result: SettingsFieldWithoutContainer[] = [];

    for(const field of fields) {
        if(field.type === 'horizontal_wrapper') {
            for(const col of field.columns) {
                getFlatFields(col.fields).forEach(f => result.push(f));
            }
        } 
        else if(field.type === 'container') {
            getFlatFields(field.children).forEach(f => result.push(f));
        }
        else {
            result.push(field);
        }
    }

    return result;
}