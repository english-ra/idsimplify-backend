// Package imports
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, BatchWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';

// Module imports
import { validateJSONWSchema } from './JSONValidator.mjs';
import schemas from "./schemas.mjs";


const db = new DynamoDBClient({ region: process.env.REGION });

// Lambda handler function
export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'POST' && event.resource === '/tenancies':
            response = createTenancy(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/tenancies/{tenancy-id}/organisations':
            response = createOrganisation(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/tenancies/{tenancy-id}/organisations':
            response = getOrganisations(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}':
            response = getOrganisation(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/integrations':
            response = getOrganisationIntegrations(event);
            break;
        default:
            response = buildResponse(404, '404 Not Found in Lambda');
    }

    return response;
};







const createTenancy = async (event) => {

    const requestBody = JSON.parse(event.body);
    const requestContext = event.requestContext;

    // Validate that the data is formatted correctly
    const isDataValid = validateJSONWSchema(requestBody, schemas['tenancy']);
    if (!isDataValid) { return buildResponse(400, 'Incorrect Data'); }

    // Get the requesting users ID
    const requestingUserID = requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the users data
    var userData;
    try {
        // Query the DB
        const response = await db.send(new GetCommand({ TableName: process.env.USER_DB, Key: { 'id': requestingUserID } }));
        userData = response.Item;
    }
    catch (err) {
        // An error occurred whilst querying the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to get the users data');
    }

    // Build the item
    const currentDate = Date.now().toString();

    const tenancy = {
        id: crypto.randomUUID().toString(),
        name: requestBody.name,
        created: currentDate,
        lastModified: currentDate,
        createdById: requestingUserID,
        organisations: [],
        users: [
            {
                id: requestingUserID,
                tenancyPermissions: ['iD-P-1'],
                organisationPermissions: []
            }
        ]
    };

    const tenancyForUser = {
        id: tenancy.id,
        name: tenancy.name,
        permissions: ['iD-P-1']
    };

    const updatedUser = { ...userData };
    updatedUser.tenancies.push(tenancyForUser);

    // Build the DB request
    const tenancyDbRequest = {
        // TableName: process.env.TENANCY_DB,
        Item: tenancy,
        ConditionExpression: "id <> :idValue",
        ExpressionAttributeValues: {
            ":idValue": tenancy.id
        }
    };

    const userDbRequest = {
        // TableName: process.env.USER_DB,
        Item: updatedUser
    }

    // Query the DB
    try {
        // Save data to the DB
        // const response = await db.send(new PutCommand(dbRequest));

        const response = await db.send(new BatchWriteCommand({
            RequestItems: {
                [process.env.TENANCY_DB]: [{ PutRequest: { ...tenancyDbRequest } }],
                [process.env.USER_DB]: [{ PutRequest: { ...userDbRequest } }]
            }
        }));

        // Successful save - Build the response
        const responseBody = {
            Operation: 'SAVE',
            Message: 'Tenancy created successfully',
            Item: response
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


const createOrganisation = async (event) => {

    const requestBody = JSON.parse(event.body);

    // Validate the request data

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    console.log(tenancy);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userPermissions = tenancy.users.find((user) => { return user.id === requestingUserID }).tenancyPermissions || [];
    if (!userPermissions.includes('iD-P-1')) { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Create the organisation object
    const organisation = {
        id: crypto.randomUUID().toString(),
        name: requestBody.name,
        integrations: []
    };

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancy.id
        },
        UpdateExpression: `set organisations = list_append(organisations, :value)`,
        ExpressionAttributeValues: {
            ':value': [organisation]
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Send back response
        return buildResponse(200, 'Organisation created successfully');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to create organisation');
    }
};


const getOrganisations = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userPermissions = tenancy.users.find((user) => { return user.id === requestingUserID }).tenancyPermissions || [];
    if (!userPermissions.includes('iD-P-1')) { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Extract the organisations from the tenancy
    var organisations = [];
    for (var i = 0; i < tenancy.organisations.length; i++) {
        organisations.push({
            id: tenancy.organisations[i].id,
            name: tenancy.organisations[i].name
        });
    }

    return buildResponse(200, organisations);
};


const getOrganisation = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userPermissions = tenancy.users.find((user) => { return user.id === requestingUserID }).tenancyPermissions || [];
    if (!userPermissions.includes('iD-P-1')) { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Extract the organisation from the tenancy
    const organisationID = event.pathParameters['organisation-id'];
    const organisation = tenancy.organisations.find((organisation) => { return organisation.id === organisationID });

    // Ensure the organisation exists
    if (organisation === null || organisation === undefined) { return buildResponse(500, 'Organisation does not exist') }

    // Create the response
    const response = {
        id: organisation.id,
        name: organisation.name
    };

    return buildResponse(200, response);
};


const getOrganisationIntegrations = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userPermissions = tenancy.users.find((user) => { return user.id === requestingUserID }).tenancyPermissions || [];
    if (!userPermissions.includes('iD-P-1')) { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Extract the organisation from the tenancy
    const organisationID = event.pathParameters['organisation-id'];
    const organisation = tenancy.organisations.find((organisation) => { return organisation.id === organisationID });

    // Ensure the organisation exists
    if (organisation === null || organisation === undefined) { return buildResponse(500, 'Organisation does not exist') }

    // Create the response
    const integrations = [];
    for (var i = 0; i < organisation.integrations.length; i++) {
        integrations.push({
            id: organisation.integrations[i].id,
            name: organisation.integrations[i].name,
            type: organisation.integrations[i].type
        });
    };

    return buildResponse(200, integrations);
};







const UTIL_getTenancy = async (tenancyID) => {
    try {
        // Query the DB
        const response = await db.send(new GetCommand({ TableName: process.env.TENANCY_DB, Key: { 'id': tenancyID } }));
        return response.Item;
    }
    catch (err) {
        // An error occurred whilst querying the DB
        console.log('Error', err.stack);

        // Send back response
        return null;
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