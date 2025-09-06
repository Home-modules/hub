import type { HMApi } from "../plugins.ts";
import { loadRoutinesFile } from "./routinesFile.ts";

export let routines = {
    routines: {} as Record<number, HMApi.T.Automation.Routine>,
    order: [] as number[],
    enabled: {} as Record<number, boolean>,
    lastId: 0,
};

loadRoutinesFile();

export function setRoutines(r: typeof routines) {
    routines = r;
}