import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import validateJSONWScheme from './JSONValidator.mjs';
import schemas from './schemas.mjs';

const ddbClient = new DynamoDBClient({ region: 'eu-west-2' });

export const handler = async (event) => {
    let response;

    console.log(event);

    switch (true) {
        case event.httpMethod === 'POST' && event.path === '/users':
            response = createUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/users/{id}/tenancies':
            response = getUsersTenancies(event);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }

    return response;
};


const createUser = async (event) => {

    const requestBody = JSON.parse(event.body);
    const requestContext = event.requestContext;

    // Ensure this request is only coming from Auth0
    const clientID = requestContext.authorizer.principalId;
    if (clientID != `${process.env.AUTH0_CLIENT_ID}@clients`) { return buildResponse(401, 'Not Auth0'); }

    // Validate that the data is formatted correctly
    const isDataValid = validateJSONWScheme(requestBody, schemas['user']);
    if (!isDataValid) { return buildResponse(400, 'Incorrect Data'); }

    // Build the item
    const user = {
        id: requestBody.userId,
        created: requestBody.createdAt,
        lastModified: requestBody.createdAt,
        tenancies: []
    };

    // Build the DB request
    const dbRequest = {
        TableName: process.env.USER_TABLE,
        Item: user,
        ConditionExpression: "id <> :idValue",
        ExpressionAttributeValues: {
            ":idValue": user.id
        }
    };

    try {
        // Save data to the DB
        const response = await ddbClient.send(new PutCommand(dbRequest));

        // Successful save - Build the response
        const responseBody = {
            Operation: 'SAVE',
            Message: 'User created successfully',
            Item: response
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


const getUsersTenancies = async (event) => {

    // Get the path parameters
    const pathParameters = event.pathParameters;

    // Check whether the user is authorised
    let userID;
    if (pathParameters.id === 'me') {
        // Get the users ID and validate
        userID = event.requestContext.authorizer.principalId;
        if (userID === null || userID === undefined) { return buildResponse(400, 'User not defined'); }
    } else {
        // The user is requesting another users data

        // Check whether their authorised to access this

        // Currently not authorised
        return buildResponse(401, 'You are not authorised to access this users data')
    }

    // Build the request
    const dbRequest = {
        TableName: process.env.USER_TABLE,
        Key: { 'userId': userID }
    };

    try {
        // Query the DB
        const response = await ddbClient.send(new GetCommand(dbRequest));

        // Prepare the data
        const tenancies = response.Item.tenancies;
        for (let i = 0; i < tenancies.length; i++) { delete tenancies[i]["organisations"]; }

        return buildResponse(200, tenancies);
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to get users tenancies');
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
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
        },
        body: JSON.stringify(body)
    }
}