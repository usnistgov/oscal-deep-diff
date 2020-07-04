import { ArrayChanged } from "./comparisons";

export class MemoizationCache {
    private cache: { [key: string]: [ArrayChanged, number]} = {};

    public get(oldPointer: string, newPointer: string): [ArrayChanged, number] | null {
        return this.cache[`${oldPointer}:${newPointer}`];
    }

    public set(oldPointer: string, newPointer: string, item: [ArrayChanged, number]) {
        const oldItem = this.cache[`${oldPointer}:${newPointer}`];
        this.cache[`${oldPointer}:${newPointer}`] = item;
        if (oldItem == null) {
            // in this implementation, on setting all sub-items have to be removed via looping through all cache items
            for (const key in this.cache) {
                const keySplit = key.split(":");
                if (keySplit[0].startsWith(`${oldPointer}/`) && keySplit[1].startsWith(`${newPointer}/`)) {
                    delete this.cache[key];
                }
            }
        }
    }
}
