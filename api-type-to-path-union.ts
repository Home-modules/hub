/* eslint-disable @typescript-eslint/no-explicit-any */

// This TypeScript code is very complex and hard to understand. I tried my best to explain it and make it more readable.

type RemoveSymbol<T> = T extends symbol ? never : T;
// This removes symbol from a union.
// It iterates over T and replaces symbol with never.
// Never is automatically removed from the union by TypeScript.

type ObjectPaths<T, P extends string, K extends keyof T= keyof T> = 
    K extends K ? 
        Paths<T[K], `${P}${RemoveSymbol<K>}.`> :
        never;
// This one gets the sub-paths in an object
// For example if T is { a: { b: any, c: any } } it will return "a.b" | "a.c"
// The third parameter and `K extends K` is used to iterate over the keys of T and call Path each time instead of calling Path with the union.
// `${P}${RemoveSymbol<K>}.` prepends the path with the parent path (P) and the key(s) of T.

type ObjectKeys<T extends Record<string, any>, P extends string=""> = `${P}${RemoveSymbol<keyof T>}`;
// It is like `keyof T` but prepends the path with the parent path (P)

type OnlyNumbers<T> = T extends number|`${number}` ? T : never;
// This removes all non-numbers from a union.

type Paths_Array<T extends any[], P extends string=""> = 
    T extends (infer E)[] ?
        `${P}${OnlyNumbers<RemoveSymbol<keyof T>>}` | 
        Paths<E, `${P}${number}.`>
    : never;
// This one gets the sub-paths in an array
// It returns the parent path (P) prepended with number (for example Paths_Array<[1, 2, 3], "a."> returns "a.0" | "a.1" | "a.2")
// It also adds the sub-paths of the elements of the array. (Paths<E, `${P}${number}.`>, where E is the type of the element of the array. Example: "a.${number}.b")

type IsTuple<T> = T extends [any, ...any[]] ? true : false;
// This one checks if T is a tuple
// I don't know how it works because Copilot wrote this.

type Paths_Object<T extends Record<string, any>, P extends string=""> =
    ObjectKeys<T, P> | ObjectPaths<T, P>;
// This one gets the sub-paths in an object
// There is not much to say about this one because it just merges ObjectKeys and ObjectPaths.

export type Paths<T, P extends string="">= 
    T extends any[] ? (                       // If it is array/tuple
        IsTuple<T> extends false ?     
            Paths_Array<T, P> :               // If it is array
            Paths_Array<T, P> | `${P}length`  // If it is tuple
    ) :
    T extends Record<string, any> ?           // If it is object
        Paths_Object<T, P> :
    never;
