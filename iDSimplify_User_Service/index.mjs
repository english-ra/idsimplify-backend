import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import validateJSONWScheme from './JSONValidator.mjs';
import schemas from './schemas.mjs';

const ddbClient = new DynamoDBClient({ region: 'eu-west-2' });

// Environment variables
const USER_TABLE = process.env.USER_TABLE;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;

export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'POST' && event.path === '/user':
            response = createUser(JSON.parse(event.body), event.requestContext);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }

    return response;
};

const createUser = async (requestBody, requestContext) => {

    // Ensure this request is only coming from Auth0
    const clientID = requestContext.authorizer.principalId;
    if (clientID != `${AUTH0_CLIENT_ID}@clients`) { return buildResponse(401, 'Not Auth0'); }

    // Validate that the data is formatted correctly
    const isDataValid = validateJSONWScheme(requestBody, schemas['user']);
    if (!isDataValid) { return buildResponse(400, 'Incorrect Data'); }

    // Build the item
    const userItem = {
        userId: requestBody.userId,
        createdAt: requestBody.createdAt
    };

    // Build the DB request
    const dbRequest = {
        TableName: USER_TABLE,
        Item: userItem,
        ConditionExpression: "userId <> :userIdValue",
        ExpressionAttributeValues: {
            ":userIdValue": requestBody.userId
        }
    };

    try {
        // Save data to the DB
        const data = await ddbClient.send(new PutCommand(dbRequest));

        // Successful save - Build the response
        const responseBody = {
            Operation: 'SAVE',
            Message: 'User created successfully',
            Item: userItem
        };

        // Send back response
        return buildResponse(200, responseBody);
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to create user');
    }
};











async function getProduct(productId) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'productId': productId
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

async function getProducts() {
    const params = {
        TableName: dynamodbTableName
    }
    const allProducts = await scanDynamoRecords(params, []);
    const body = {
        products: allProducts
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

async function modifyProduct(productId, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'productId': productId
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'SUCCESS',
            UpdatedAttributes: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function deleteProduct(productId) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'productId': productId
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'SUCCESS',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}