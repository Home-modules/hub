import { strictEqual, deepStrictEqual } from 'assert';
import { checkType } from './api_checkType.js';

export default function runTests() {
    const defaultError: ReturnType<typeof checkType>= {
        code: 400,
        message: "INVALID_PARAMETER",
        paramName: '' as any
    };
    const defaultRangeError: ReturnType<typeof checkType>= {
        code: 400,
        message: "PARAMETER_OUT_OF_RANGE",
        paramName: '' as any
    };

    strictEqual(checkType(
        0,
        {
            type: 'any',
        }
    ), null);

    strictEqual(checkType(
        99999999999999999999999999999999999999,
        {
            type: 'any',
        }
    ), null);

    strictEqual(checkType(
        '',
        {
            type: 'any',
        }
    ), null);

    strictEqual(checkType(
        'abc'.repeat(999999),
        {
            type: 'any',
        }
    ), null);

    strictEqual(checkType(
        0,
        {
            type: 'exactValue',
            value: 0,
        }
    ), null);

    deepStrictEqual(checkType(
        9,
        {
            type: 'exactValue',
            value: 0
        }
    ), defaultError);

    deepStrictEqual(checkType(
        undefined,
        {
            type: 'exactValue',
            value: null
        }
    ), defaultError);

    strictEqual(checkType(
        'string',
        {
            type: 'string',
            minLength: 1,
            maxLength: 10,
        }
    ), null);

    deepStrictEqual(checkType(
        undefined,
        {
            type: 'string',
        }
    ), defaultError);

    strictEqual(checkType(
        'string',
        {
            type: 'string',
            minLength: 6, // 'string' is 6 characters long
            maxLength: 6,
        }
    ), null);

    deepStrictEqual(checkType(
        'str',
        {
            type: 'string',
            minLength: 4
        }
    ), defaultRangeError);

    deepStrictEqual(checkType(
        'str',
        {
            type: 'string',
            maxLength: 2
        }
    ), defaultRangeError);

    strictEqual(checkType(
        5,
        {
            type: 'number',
            min: 0,
            max: 10,
        }
    ), null);

    deepStrictEqual(checkType(
        [],
        {
            type: 'number'
        }
    ), defaultError);

    deepStrictEqual(checkType(
        5,
        {
            type: 'number',
            min: 10
        }
    ), defaultRangeError);

    deepStrictEqual(checkType(
        5,
        {
            type: 'number',
            max: 4
        }
    ), defaultRangeError);

    strictEqual(checkType(
        true,
        {
            type: 'boolean'
        }
    ), null);

    strictEqual(checkType(
        false,
        {
            type: 'boolean'
        }
    ), null);

    deepStrictEqual(checkType(
        0,
        {
            type: 'boolean'
        }
    ), defaultError);

    strictEqual(checkType(
        {},
        {
            type: "object",
            properties: {}
        }
    ), null);

    deepStrictEqual(checkType(
        false,
        {
            type: "object",
            properties: {}
        }
    ), defaultError);

    deepStrictEqual(checkType(
        undefined,
        {
            type: "object",
            properties: {}
        }
    ), defaultError);

    strictEqual(checkType(
        {'5': 1},
        {
            type: 'object',
            properties: {
                '5': { type: 'number' }
            }
        }
    ), null);

    strictEqual(checkType(
        {'5': 'hello'},
        {
            type: 'object',
            properties: {
                '5': { type: 'exactValue', value: 'hello' }
            }
        }
    ), null);

    strictEqual(checkType(
        {'.': 'hello'},
        {
            type: 'object',
            properties: {
                '.': { type: 'exactValue', value: 'hello' }
            }
        }
    ), null);

    strictEqual(checkType(
        {'ooooooooooooooooooooooooooooooooooo': 'hello'},
        {
            type: 'object',
            properties: {
                'ooooooooooooooooooooooooooooooooooo': { type: 'exactValue', value: 'hello' }
            }
        }
    ), null);

    strictEqual(checkType(
        {'ooooooooooooooooooooooooooooooooooo': 'hello', 'g': ''},
        {
            type: 'object',
            properties: {
                'ooooooooooooooooooooooooooooooooooo': { type: 'exactValue', value: 'hello' }
            }
        }
    ), null);

    deepStrictEqual(checkType(
        {'oooooooooooooooooooooooooooooooooo': 'hello', 'g': ''}, // Has one less 'o'
        {
            type: 'object',
            properties: {
                'ooooooooooooooooooooooooooooooooooo': { type: 'exactValue', value: 'hello' },
                'g': { type: "string" }
            }
        }
    ), {
        code: 400,
        message: 'MISSING_PARAMETER',
        missingParameters: [ 'ooooooooooooooooooooooooooooooooooo' ]
    });

    strictEqual(checkType(
        {'one': 'hello', 'two': ''},
        {
            type: 'object',
            properties: {
                'one': { type: 'exactValue', value: 'hello', optional: false },
                'two': { type: 'string', optional: true }
            }
        }
    ), null);

    strictEqual(checkType(
        {'one': 'hello'},
        {
            type: 'object',
            properties: {
                'one': { type: 'exactValue', value: 'hello', optional: false },
                'two': { type: 'string', optional: true }
            }
        }
    ), null);

    deepStrictEqual(checkType(
        { },
        {
            type: 'object',
            properties: {
                'two': { type: 'string', optional: true },
                'one': { type: 'exactValue', value: 'hello', optional: false }
            }
        }
    ), {
        code: 400,
        message: 'MISSING_PARAMETER',
        missingParameters: [ 'one' ]
    });

    deepStrictEqual(checkType(
        { },
        {
            type: 'object',
            properties: {
                'two': { type: 'string', optional: true },
                'one': { type: 'exactValue', value: 'hello', optional: false }
            }
        }
    ), {
        code: 400,
        message: 'MISSING_PARAMETER',
        missingParameters: ['one']
    });

    strictEqual(checkType(
        [],
        {
            type: 'array',
            items: {
                type: 'boolean'
            }
        }
    ), null);

    strictEqual(checkType(
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,],
        {
            type: 'array',
            items: {
                type: 'number'
            }
        }
    ), null);

    deepStrictEqual(checkType(
        false,
        {
            type: 'array',
            items: {
                type: 'boolean'
            }
        }
    ), defaultError);
}
