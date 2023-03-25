// Package imports
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';

// Module imports
import { validateJSONWSchema } from './JSONValidator.mjs';
import schemas from "./schemas.mjs";

// Environment variables
const TENANCY_TABLE = process.env.TENANCY_DB_TABLE;
const REGION = process.env.REGION;


const db = new DynamoDBClient({ region: REGION });

// Lambda handler function
export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'POST' && event.path === '/tenancy':
            response = createTenancy(JSON.parse(event.body), event.requestContext);
            break;
        default:
            response = buildResponse(404, '404 Not Found in Lambda');
    }

    return response;
};







const createTenancy = async (requestBody, requestContext) => {

    // Validate that the data is formatted correctly
    const isDataValid = validateJSONWSchema(requestBody, schemas['tenancy']);
    if (!isDataValid) { return buildResponse(400, 'Incorrect Data'); }

    console.log(requestContext);

    // Get the users ID and validate
    const userID = requestContext.authorizer.principalId;
    if (userID === null || userID === undefined) { return buildResponse(400, 'User not defined'); }

    // Generate a PK
    const tenancyId = crypto.randomUUID().toString();

    // Build the item
    const tenancyData = {
        tenancyId: tenancyId,
        name: requestBody.name,
        creationDetails: {
            createdBy: userID
        }
    };

    // Build the DB request
    const dbParams = {
        TableName: TENANCY_TABLE,
        Item: tenancyData,
        ConditionExpression: "tenancyId <> :tenancyIdValue",
        ExpressionAttributeValues: {
            ":tenancyIdValue": tenancyId
        }
    };

    try {
        // Save data to the DB
        const data = await db.send(new PutCommand(dbParams));

        // Successful save - Build the response
        const responseBody = {
            Operation: 'SAVE',
            Message: 'Tenancy created successfully',
            Item: tenancyData
        };

        // Send back response
        return buildResponse(200, responseBody);
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to create tenancy');
    }
};





function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
        },
        body: JSON.stringify(body)
    }
}