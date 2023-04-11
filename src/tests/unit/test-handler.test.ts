import { lambdaHandler } from '../../app';

import { ILoanInput, IQueryParams, ICar } from './types';
import { calculateLoanAmount } from '../../app';

describe('calculateLoanAmount', () => {
    it('should calculate the loan amount correctly', () => {
        const input: ILoanInput = { emi: 30000, tenure: 24, interest: 12 };
        const expectedOutput = 637302;
        expect(calculateLoanAmount(input)).toBe(expectedOutput);
    });
});

describe('lambdaHandler', () => {
    test('should return cars in response', async () => {
        const event = {
            queryStringParameters: {
                emi: '10000',
                tenure: '60',
                interest: '12',
            },
        };
        const response = await lambdaHandler(event);

        expect(response.statusCode).toBe(200);
        expect(response.body).toBeDefined();

        const parsedBody = JSON.parse(response.body);
        expect(parsedBody.cars).toBeDefined();
        expect(Array.isArray(parsedBody.cars)).toBe(true);
    });

    test('should return 400 for invalid input', async () => {
        const event = {
            queryStringParameters: {
                emi: 'invalid',
                tenure: '60',
                interest: '12',
            },
        };
        const response = await lambdaHandler(event);

        expect(response.statusCode).toBe(400);
        expect(response.body).toBeDefined();

        const parsedBody = JSON.parse(response.body);
        expect(parsedBody.message).toBe('Invalid input');
    });
});
