import { checkType } from './api_checkType.ts';
import { expect, test } from "bun:test";

const defaultError: ReturnType<typeof checkType> = {
    code: 400,
    message: "INVALID_PARAMETER",
    paramName: '' as any
};
const defaultRangeError: ReturnType<typeof checkType> = {
    code: 400,
    message: "PARAMETER_OUT_OF_RANGE",
    paramName: '' as any
};

test("checkType tests", () => {
    expect(checkType(0, { type: 'any' })).toBe(null);
    expect(checkType(99999999999999999999999999999999999999, { type: 'any' })).toBe(null);
    expect(checkType('', { type: 'any' })).toBe(null);
    expect(checkType('abc'.repeat(999999), { type: 'any' })).toBe(null);

    expect(checkType(0, { type: 'exactValue', value: 0 })).toBe(null);
    expect(checkType(9, { type: 'exactValue', value: 0 })).toEqual(defaultError);
    expect(checkType(undefined, { type: 'exactValue', value: null })).toEqual(defaultError);

    expect(checkType('string', { type: 'string', minLength: 1, maxLength: 10 })).toBe(null);
    expect(checkType(undefined, { type: 'string' })).toEqual(defaultError);
    expect(checkType('string', { type: 'string', minLength: 6, maxLength: 6 })).toBe(null);
    expect(checkType('str', { type: 'string', minLength: 4 })).toEqual(defaultRangeError);
    expect(checkType('str', { type: 'string', maxLength: 2 })).toEqual(defaultRangeError);

    expect(checkType(5, { type: 'number', min: 0, max: 10 })).toBe(null);
    expect(checkType([], { type: 'number' })).toEqual(defaultError);
    expect(checkType(5, { type: 'number', min: 10 })).toEqual(defaultRangeError);
    expect(checkType(5, { type: 'number', max: 4 })).toEqual(defaultRangeError);

    expect(checkType(true, { type: 'boolean' })).toBe(null);
    expect(checkType(false, { type: 'boolean' })).toBe(null);
    expect(checkType(0, { type: 'boolean' })).toEqual(defaultError);

    expect(checkType({}, { type: "object", properties: {} })).toBe(null);
    expect(checkType(false, { type: "object", properties: {} })).toEqual(defaultError);
    expect(checkType(undefined, { type: "object", properties: {} })).toEqual(defaultError);

    expect(checkType({ '5': 1 }, { type: 'object', properties: { '5': { type: 'number' } } })).toBe(null);
    expect(checkType({ '5': 'hello' }, { type: 'object', properties: { '5': { type: 'exactValue', value: 'hello' } } })).toBe(null);
    expect(checkType({ '.': 'hello' }, { type: 'object', properties: { '.': { type: 'exactValue', value: 'hello' } } })).toBe(null);
    expect(checkType({ 'ooooooooooooooooooooooooooooooooooo': 'hello' }, { type: 'object', properties: { 'ooooooooooooooooooooooooooooooooooo': { type: 'exactValue', value: 'hello' } } })).toBe(null);
    expect(checkType({ 'ooooooooooooooooooooooooooooooooooo': 'hello', 'g': '' }, { type: 'object', properties: { 'ooooooooooooooooooooooooooooooooooo': { type: 'exactValue', value: 'hello' } } })).toBe(null);

    expect(checkType({ 'oooooooooooooooooooooooooooooooooo': 'hello', 'g': '' }, { type: 'object', properties: { 'ooooooooooooooooooooooooooooooooooo': { type: 'exactValue', value: 'hello' }, 'g': { type: "string" } } })).toEqual({
        code: 400,
        message: 'MISSING_PARAMETER',
        missingParameters: ['ooooooooooooooooooooooooooooooooooo']
    });

    expect(checkType({ 'one': 'hello', 'two': '' }, { type: 'object', properties: { 'one': { type: 'exactValue', value: 'hello', optional: false }, 'two': { type: 'string', optional: true } } })).toBe(null);
    expect(checkType({ 'one': 'hello' }, { type: 'object', properties: { 'one': { type: 'exactValue', value: 'hello', optional: false }, 'two': { type: 'string', optional: true } } })).toBe(null);

    expect(checkType({}, { type: 'object', properties: { 'two': { type: 'string', optional: true }, 'one': { type: 'exactValue', value: 'hello', optional: false } } })).toEqual({
        code: 400,
        message: 'MISSING_PARAMETER',
        missingParameters: ['one']
    });

    expect(checkType([], { type: 'array', items: { type: 'boolean' } })).toBe(null);
    expect(checkType([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], { type: 'array', items: { type: 'number' } })).toBe(null);
    expect(checkType(false, { type: 'array', items: { type: 'boolean' } })).toEqual(defaultError);
});
