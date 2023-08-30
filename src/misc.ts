export const authorRegex = /^\s*([^<(]*?)\s*([<(]([^>)]*?)[>)])?\s*([<(]([^>)]*?)[>)])*\s*$/; // From package author-regex, couldn't use the package because of the lack of TS typings.

export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));