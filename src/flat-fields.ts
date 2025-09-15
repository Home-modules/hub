import type { HMApi } from "./api/api.ts";
import type { SettingsFieldDef } from "./plugins.ts";

type SettingsFieldWithoutContainer = Exclude<SettingsFieldDef, HMApi.T.SettingsField.TypeContainer>;

export default function getFlatFields(fields: SettingsFieldDef[]): SettingsFieldWithoutContainer[] {
    const result: SettingsFieldWithoutContainer[] = [];

    for(const field of fields) {
        if(field.type === 'container')
            for(const child of getFlatFields(field.children))
                result.push(child)
        else
            result.push(field);
    }

    return result;
}