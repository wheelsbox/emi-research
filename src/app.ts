import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';

import { IQueryParams, ILoanInput, ICar } from './types';

AWS.config.update({
    region: 'ap-south-1',
});

const docClient = new AWS.DynamoDB.DocumentClient();
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export function calculateLoanAmount(input: ILoanInput): number {
    const ratePerMonth = input.interest / 12 / 100; // Convert interest rate from annual percentage to monthly decimal
    const numerator = input.emi * (Math.pow(1 + ratePerMonth, input.tenure) - 1);
    const denominator = ratePerMonth * Math.pow(1 + ratePerMonth, input.tenure);
    const loanAmount = numerator / denominator;
    return Math.round(loanAmount);
}

function queryWithPromise(params: IQueryParams): Promise<any> {
    return new Promise((resolve, reject) => {
        docClient.query(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Items);
            }
        });
    });
}

function getCarsAroundPrice(price: number, cars: ICar[]): ICar[] {
    const lower = [];
    const higher = [];

    for (const car of cars) {
        if (car.price < price && lower.length < 10) {
            lower.push(car);
        } else if (car.price > price && higher.length < 10) {
            higher.push(car);
        }

        if (lower.length >= 10 && higher.length >= 10) {
            break;
        }
    }

    return lower.concat(higher);
}

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let response: APIGatewayProxyResult;
    const emi = Number(event.queryStringParameters?.emi);
    const tenure = Number(event.queryStringParameters?.tenure);
    const interest = Number(event.queryStringParameters?.interest);

    if (isNaN(emi) || isNaN(tenure) || isNaN(interest)) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid input',
            }),
        };
        return response;
    }

    const price: number = calculateLoanAmount({ emi, tenure, interest });
    const lowPrice: number = Math.floor(price / 50000) * 50000;
    const highPrice: number = Math.ceil(price / 50000) * 50000;

    const params1 = {
        TableName: 'CarsTable',
        KeyConditionExpression: 'emiPrice = :emiPriceValue',
        ExpressionAttributeValues: {
            ':emiPriceValue': lowPrice,
        },
    };

    const params2 = {
        TableName: 'CarsTable',
        KeyConditionExpression: 'emiPrice = :emiPriceValue',
        ExpressionAttributeValues: {
            ':emiPriceValue': highPrice,
        },
    };

    try {
        const cars1: ICar[] = await queryWithPromise(params1);
        const cars2: ICar[] = await queryWithPromise(params2);
        const cars: ICar[] = cars1.concat(cars2);
        const suggestedCars: ICar[] = getCarsAroundPrice(price, cars);

        response = {
            statusCode: 200,
            body: JSON.stringify({
                cars: suggestedCars,
            }),
        };
    } catch (err: unknown) {
        console.log(err);
        response = {
            statusCode: 500,
            body: JSON.stringify({
                message: err instanceof Error ? err.message : 'some errors happened',
            }),
        };
    }

    return response;
};
