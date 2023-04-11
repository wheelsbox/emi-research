export interface IQueryParams {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: {
        [key: string]: any;
    };
}

export interface ILoanInput {
    emi: number;
    tenure: number;
    interest: number;
}

export interface ICar {
    model: string;
    brand: string;
    variant: string;
    emiPrice: number;
    price: number;
}
