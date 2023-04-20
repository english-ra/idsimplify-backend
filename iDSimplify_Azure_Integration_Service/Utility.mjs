import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

export function buildResponse(statusCode, body) {
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


export const accessControl = async (event, tenancy, permissions) => {

    const userID = event.requestContext.authorizer.principalId;
    const tenancyID = event.queryStringParameters['tenancy-id'];
    const organisationID = event.queryStringParameters['organisation-id'];

    // Check the user exists
    const user = tenancy.users[userID];
    if (user === null || user === undefined) { return buildResponse(500, 'User does not exist'); }

    // Check the users status
    if (user.permissions.status != 'member') { return buildResponse(401, 'You do not have permissions for this organisation'); }

    // Check the user has organisation permissions
    const organisation = user.permissions.organisation[organisationID];
    if (organisation === null || organisation === undefined) { return buildResponse(401, 'You do not have permissions for this organisation'); }

    // Check the user has the correct permissions
    if (!permissions.some((p) => { return organisation.includes(p); })) { return buildResponse(401, 'You do not have permissions for this organisation'); }

    return 'accessGranted';
};


export const getAzureCredentials = (event, tenancy) => {

    const userID = event.requestContext.authorizer.principalId;
    const tenancyID = event.queryStringParameters['tenancy-id'];
    const organisationID = event.queryStringParameters['organisation-id'];
    
    const organisation = tenancy.organisations[organisationID];
    const integrations = organisation.integrations;
    const integrationIDs = Object.keys(integrations);

    for (var i = 0; i < integrationIDs.length; i++) {
        const integration = integrations[integrationIDs[i]];
        if (integration.type === 'Microsoft Azure AD') { return integration.credentials; }
    }

    return undefined;
};


export const UTIL_getTenancy = async (tenancyID) => {
    const db = new DynamoDBClient({ region: 'eu-west-2' });
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