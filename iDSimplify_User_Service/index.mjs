import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import validateJSONWScheme from './JSONValidator.mjs';
import schemas from './schemas.mjs';

const db = new DynamoDBClient({ region: 'eu-west-2' });

export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'POST' && event.path === '/users':
            response = createUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/users/{id}/tenancies':
            response = getUsersTenancies(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/users/{id}/tenancies/invitations':
            response = getTenancyInvitations(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/users/{id}/tenancies/{tenancy-id}/organisations':
            response = getUsersTenacyOrganisations(event);
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
        tenancies: {},
        tenancyInvitations: {}
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
        const response = await db.send(new PutCommand(dbRequest));

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
        Key: { 'id': userID }
    };

    try {
        // Query the DB
        const response = await db.send(new GetCommand(dbRequest));

        // Prepare the data
        const responseData = [];

        const tenancies = response.Item.tenancies;
        const tenancyIDs = Object.keys(tenancies);
        for (let i = 0; i < tenancyIDs.length; i++) {
            responseData.push({
                id: tenancyIDs[i],
                name: tenancies[tenancyIDs[i]].name,
                permissions: tenancies[tenancyIDs[i]].permissions
            });
        }

        return buildResponse(200, responseData);
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to get users tenancies');
    }
};


const getUsersTenacyOrganisations = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Get the user from the tenancy and validate
    const user = tenancy.users[requestingUserID];
    if (user === null || user === undefined) { return buildResponse(403, 'User is not a member of this tenancy') };

    const rawOrganisations = user.organisationPermissions;
    const organisationIDs = Object.keys(rawOrganisations);

    // Get the users organisations
    const organisations = [];
    for (var i = 0; i < organisationIDs.length; i++) {
        const organisation = tenancy.organisations[organisationIDs[i]] || null;

        // Validate the organisation
        if (organisation === null || organisation === undefined) { break }

        organisations.push({
            id: organisationIDs[i],
            name: organisation.name
        });
    };

    return buildResponse(200, organisations);
};


const getTenancyInvitations = async (event) => {

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
        Key: { 'id': userID }
    };

    try {
        // Query the DB
        const response = await db.send(new GetCommand(dbRequest));

        // Prepare the data
        const responseData = [];

        const tenancyInvitations = response.Item.tenancyInvitations;
        const tenancyIDs = Object.keys(tenancyInvitations);

        for (let i = 0; i < tenancyIDs.length; i++) {

            const tenancy = await UTIL_getTenancy(tenancyIDs[i]);
            const invitingUser = await UTIL_getUserFromAuth0ByID(tenancyInvitations[tenancyIDs[i]].invitedBy);

            responseData.push({
                id: tenancyIDs[i],
                name: tenancy.name,
                sent: tenancyInvitations[tenancyIDs[i]].sent,
                invitedBy: {
                    id: tenancyInvitations[tenancyIDs[i]].invitedBy,
                    name: invitingUser.name,
                    email: invitingUser.email
                }
            });
        }

        return buildResponse(200, responseData);
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to get users tenancies');
    }
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


const UTIL_getAuth0ManagementAPIAccessToken = async () => {

    // Get the access token for the API
    var accessToken = undefined;

    try {
        var headers = new Headers();
        headers.append("Content-Type", "application/json");

        const body = {
            client_id: process.env.AUTH0_MANAGEMENT_API_CLIENT_ID,
            client_secret: process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
            audience: process.env.AUTH0_MANAGEMENT_API_AUDIENCE,
            grant_type: 'client_credentials'
        };

        var requestOptions = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };

        const response = await fetch('https://idsimplify.uk.auth0.com/oauth/token', requestOptions);

        const responseData = await response.json();
        accessToken = responseData.access_token;
    }
    catch (error) {
        console.log(error);
    }

    return accessToken;
};


const UTIL_getUserFromAuth0ByID = async (id) => {

    var user = null;

    try {
        const accessToken = await UTIL_getAuth0ManagementAPIAccessToken();

        const response = await fetch(`https://idsimplify.uk.auth0.com/api/v2/users/${id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        user = await response.json();
    }
    catch (error) {
        console.log(error);
    }
    return user;
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