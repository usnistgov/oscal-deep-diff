import { ArrayChanged } from "./comparisons";

/**
 * This class is designed to cache the output of Comparator.tryMatch() for use
 * in Comparator.compareArrays().
 */
export class MemoizationCache {
    // Keys are stored internally as oldPointer:newPointer, and must be split
    // manually. When adding to the cache, sub-items (children) must be removed
    // to improve memory consumption.
    private cache: { [key: string]: [ArrayChanged, number]} = {};

    /**
     * Returns null if no item was found
     */
    public get(leftPointer: string, rightPointer: string): [ArrayChanged, number] | null {
        return this.cache[`${leftPointer}:${rightPointer}`];
    }

    /**
     * Sets the cache at a pointer pair.
     * 
     * NOTE: Has a side effect of removing any children of the given pointers
     * from the cache, since a recursive match should never reach any children
     * again. 
     */
    public set(leftPointer: string, rightPointer: string, item: [ArrayChanged, number]) {
        const oldItem = this.cache[`${leftPointer}:${rightPointer}`];
        this.cache[`${leftPointer}:${rightPointer}`] = item;
        if (oldItem == null) {
            // in this implementation, on setting all sub-items have to be removed via looping through all cache items
            for (const key in this.cache) {
                const keySplit = key.split(":");
                if (keySplit[0].startsWith(`${leftPointer}/`) && keySplit[1].startsWith(`${rightPointer}/`)) {
                    delete this.cache[key];
                }
            }
        }
    }
}
