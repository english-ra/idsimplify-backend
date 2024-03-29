// Package imports
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, BatchWriteCommand, UpdateCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
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
        case event.httpMethod === 'POST' && event.resource === '/tenancies/{tenancy-id}/users':
            response = createUserRequest(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/tenancies/{tenancy-id}/users':
            response = getUsers(event);
            break;
        case event.httpMethod === 'DELETE' && event.resource === '/tenancies/{tenancy-id}/users/{user-id}':
            response = deleteUser(event);
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
        case event.httpMethod === 'DELETE' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}':
            response = deleteOrganisation(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/users':
            response = getOrganisationUsers(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/users':
            response = addOrganisationUsers(event);
            break;
        case event.httpMethod === 'DELETE' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/users/{user-id}':
            response = deleteOrganisationUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/integrations':
            response = getOrganisationIntegrations(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/integrations':
            response = createOrganisationIntegration(event);
            break;
        case event.httpMethod === 'DELETE' && event.resource === '/tenancies/{tenancy-id}/organisations/{organisation-id}/integrations/{integration-id}':
            response = deleteOrganisationIntegration(event);
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

    // Build the item
    const currentDate = Date.now().toString();

    const tenancy = {
        id: crypto.randomUUID().toString(),
        name: requestBody.name,
        created: currentDate,
        lastModified: currentDate,
        createdById: requestingUserID,
        organisations: {},
        users: {
            [requestingUserID]: {
                permissions: {
                    status: 'member',
                    tenancy: ['iD-P-1'],
                    organisation: {}
                }
            }
        }
    };

    const tenancyForUser = {
        name: tenancy.name,
        permissions: ['iD-P-1']
    };

    // Build the DB request
    const tenancyDbRequest = {
        Put: {
            TableName: process.env.TENANCY_DB,
            Item: tenancy,
            ConditionExpression: "id <> :idValue",
            ExpressionAttributeValues: {
                ":idValue": tenancy.id
            }
        }
    };

    const userDbRequest = {
        Update: {
            TableName: process.env.USER_DB,
            Key: {
                'id': requestingUserID
            },
            UpdateExpression: `SET tenancies.#tenancyId = :tenancy`,
            ExpressionAttributeNames: {
                '#tenancyId': tenancy.id
            },
            ExpressionAttributeValues: {
                ':tenancy': tenancyForUser
            },
            ReturnValues: 'UPDATED_NEW'
        }
    }

    // Query the DB
    try {
        // Save data to the DB
        const response = await db.send(new TransactWriteCommand({
            TransactItems: [
                tenancyDbRequest,
                userDbRequest
            ]
        }));

        // Get the user from Auth0
        const user = await UTIL_getUserFromAuth0ByID(requestingUserID);

        await UTIL_sendEmail({
            to: user.email,
            subject: `You have successfully created ${tenancy.name}`,
            content: [
                {
                    "type": "text/plain",
                    "value": `You can now access organisation center for this tenancy and begin to configure it. Please go to https://idsimplify.co.uk/oc/${tenancy.id}`
                }
            ]
        });

        // Send back response
        return buildResponse(200, 'Successful tenancy creation');
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
    const tenancyID = event.pathParameters['tenancy-id'];
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Create the organisation object
    const organisationID = crypto.randomUUID().toString();
    const organisation = {
        name: requestBody.name,
        integrations: {}
    };

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancyID
        },
        UpdateExpression: 'SET organisations.#organisationID = :organisation, #users.#userID.#permissions.organisation.#organisationID = :organisationPermission',
        ExpressionAttributeNames: {
            '#users': 'users',
            '#organisationID': organisationID,
            '#userID': requestingUserID,
            '#permissions': 'permissions'
        },
        ExpressionAttributeValues: {
            ':organisation': organisation,
            ':organisationPermission': ['iD-P-10000']
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Get the user from Auth0
        const user = await UTIL_getUserFromAuth0ByID(requestingUserID);

        await UTIL_sendEmail({
            to: user.email,
            subject: `You have successfully created ${organisation.name}`,
            content: [
                {
                    "type": "text/plain",
                    "value": `You can now access organisation center for this tenancy and begin to configure it. Please go to https://idsimplify.co.uk/oc/${tenancyID}/organisations/${organisationID}`
                }
            ]
        });

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

    // Check that the user is a member of the tenancy
    const user = tenancy.users[requestingUserID] || null;
    if (user === null || user === undefined) { return buildResponse(401, 'You are not authorised to perform this action.'); }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    const rawOrganisations = tenancy.organisations;
    const organisationIDs = Object.keys(rawOrganisations);

    // Extract the organisations from the tenancy
    var organisations = [];
    for (var i = 0; i < organisationIDs.length; i++) {
        organisations.push({
            id: organisationIDs[i],
            name: tenancy.organisations[organisationIDs[i]].name
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
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Extract the organisation from the tenancy
    const organisationID = event.pathParameters['organisation-id'];
    const organisation = tenancy.organisations[organisationID];

    // Ensure the organisation exists
    if (organisation === null || organisation === undefined) { return buildResponse(500, 'Organisation does not exist') }

    // Create the response
    const response = {
        id: organisationID,
        name: organisation.name
    };

    return buildResponse(200, response);
};


const deleteOrganisation = async (event) => {

    const tenancyID = event.pathParameters['tenancy-id'];
    const organisationID = event.pathParameters['organisation-id'];

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Find all the users who have permissions for this organisation
    const userIDs = Object.keys(tenancy.users);
    const users = tenancy.users;
    var updateExpression = '';
    var expressionAttributeNames = {};
    var index = 0;
    for (var id of userIDs) {
        if (users[id].permissions.organisation[organisationID] != undefined) {
            // This user has permissions for this organisation

            // Add this user to the remove update expression
            updateExpression += `, #users.#user${index}.#permissions.organisation.#organisationID`;

            // Add the required attribute names
            expressionAttributeNames[`#user${index}`] = id;
        }
        index += 1;
    }

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancyID
        },
        UpdateExpression: `REMOVE organisations.#organisationID${updateExpression}`,
        ExpressionAttributeNames: {
            '#users': 'users',
            '#organisationID': organisationID,
            '#permissions': 'permissions',
            ...expressionAttributeNames
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Get the user from Auth0
        const user = await UTIL_getUserFromAuth0ByID(requestingUserID);

        await UTIL_sendEmail({
            to: user.email,
            subject: `You have successfully deleted an organisation`,
            content: [
                {
                    "type": "text/plain",
                    "value": 'This confirm that the organisation has now been deleted.'
                }
            ]
        });

        // Send back response
        return buildResponse(200, 'Organisation deleted successfully');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to delete organisation');
    }
};


const getOrganisationIntegrations = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Extract the organisation from the tenancy
    const organisationID = event.pathParameters['organisation-id'];
    const organisation = tenancy.organisations[organisationID];

    // Ensure the organisation exists
    if (organisation === null || organisation === undefined) { return buildResponse(500, 'Organisation does not exist') }

    const rawIntegrations = organisation.integrations;
    const integrationIDs = Object.keys(rawIntegrations);

    // Create the response
    const integrations = [];
    for (var i = 0; i < integrationIDs.length; i++) {
        integrations.push({
            id: integrationIDs[i],
            name: rawIntegrations[integrationIDs[i]].name,
            type: rawIntegrations[integrationIDs[i]].type
        });
    };

    return buildResponse(200, integrations);
};


const createUserRequest = async (event) => {

    const tenancyID = event.pathParameters['tenancy-id'];
    const requestBody = JSON.parse(event.body);

    // Validate the request data

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Check that the requested user has an account
    const requestedUser = await UTIL_getUserFromAuth0ByEmail(requestBody.email);
    if (requestedUser === null || requestedUser === undefined) { return buildResponse(500, 'User with this email address does not exist'); }

    // Check that the user isn't already added to the tenancy
    if (tenancy.users[requestedUser.user_id] || null != null) { return buildResponse(500, 'User is already a member of this tenancy') }

    // Create the user object
    const user = {
        permissions: {
            status: 'pending',
            tenancy: [],
            organisation: {}
        }
    };

    // Create the request object
    const request = {
        sent: Date.now().toString(),
        invitedBy: requestingUserID
    }

    // Query the DB
    try {
        // Save data to the DB
        const response = await db.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Update: {
                        TableName: process.env.TENANCY_DB,
                        Key: {
                            'id': tenancyID
                        },
                        UpdateExpression: `SET #users.#userID = :user`,
                        ExpressionAttributeNames: {
                            '#users': 'users',
                            '#userID': requestedUser.user_id
                        },
                        ExpressionAttributeValues: {
                            ':user': user
                        },
                        ReturnValues: 'UPDATED_NEW'
                    }
                },
                {
                    Update: {
                        TableName: process.env.USER_DB,
                        Key: {
                            'id': requestedUser.user_id
                        },
                        UpdateExpression: `SET tenancyInvitations.#tenancyId = :request`,
                        ExpressionAttributeNames: {
                            '#tenancyId': tenancy.id
                        },
                        ExpressionAttributeValues: {
                            ':request': request
                        },
                        ReturnValues: 'UPDATED_NEW'
                    }
                }
            ]
        }));

        // Successful save - Build the response
        const responseBody = {
            Operation: 'SAVE',
            Message: 'Tenancy created successfully',
            Item: response
        };

        await UTIL_sendEmail({
            to: requestedUser.email,
            subject: `You have been invited to join ${tenancy.name}`,
            content: [
                {
                    "type": "text/plain",
                    "value": "To respond to this request, please sign in to your account and go to profile."
                }
            ]
        });

        // Send back response
        return buildResponse(200, 'Request successfully sent');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to create tenancy');
    }
};


const getUsers = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    const userIDs = Object.keys(tenancy.users);

    const users = [];

    try {
        for (var i = 0; i < userIDs.length; i++) {
            const user = await UTIL_getUserFromAuth0ByID(userIDs[i]);
            if (user != null) {
                users.push({
                    id: user.user_id,
                    email: user.email,
                    name: user.name,
                    nickname: user.nickname,
                    status: tenancy.users[userIDs[i]].permissions.status
                });
            }
        }
        return buildResponse(200, users);
    }
    catch (error) {
        console.log(error);
        return buildResponse(500, 'Problem')
    }
};


const deleteUser = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancyID = event.pathParameters['tenancy-id'];
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    const userID = decodeURIComponent(event.pathParameters['user-id']);

    // Confirm that there will still be an admin user in the tenancy
    const userIDs = Object.keys(tenancy.users);
    var adminUsers = 0;
    for (var id of userIDs) {
        if (id === userID) { continue; }
        const s = tenancy.users[id].permissions.status || '';
        const p = tenancy.users[id].permissions.tenancy || [];
        if (s === 'member' && p.includes('iD-P-1')) { adminUsers += 1; }
    }
    if (adminUsers < 1) { return buildResponse(500, 'Unable to remove user. There must be at least one admin user remaining in the tenancy with the permission: iD-P-1'); }

    // Find out whether the using wanting deleting is pending or not
    const status = tenancy.users[userID].permissions.status || '';
    var dbRequest;
    if (status === 'member') {
        dbRequest = {
            TransactItems: [
                {
                    Update: {
                        TableName: process.env.TENANCY_DB,
                        Key: {
                            'id': tenancyID
                        },
                        UpdateExpression: `REMOVE #users.#userID`,
                        ExpressionAttributeNames: {
                            '#users': 'users',
                            '#userID': userID
                        },
                        ReturnValues: 'UPDATED_NEW'
                    }
                },
                {
                    Update: {
                        TableName: process.env.USER_DB,
                        Key: {
                            'id': userID
                        },
                        UpdateExpression: `REMOVE #tenancies.#tenancyId`,
                        ExpressionAttributeNames: {
                            '#tenancies': 'tenancies',
                            '#tenancyId': tenancyID
                        },
                        ReturnValues: 'UPDATED_NEW'
                    }
                }
            ]
        }
    } else if (status === 'pending') {
        dbRequest = {
            TransactItems: [
                {
                    Update: {
                        TableName: process.env.TENANCY_DB,
                        Key: {
                            'id': tenancyID
                        },
                        UpdateExpression: `REMOVE #users.#userID`,
                        ExpressionAttributeNames: {
                            '#users': 'users',
                            '#userID': userID
                        },
                        ReturnValues: 'UPDATED_NEW'
                    }
                },
                {
                    Update: {
                        TableName: process.env.USER_DB,
                        Key: {
                            'id': userID
                        },
                        UpdateExpression: `REMOVE #tenancyInvitations.#tenancyId`,
                        ExpressionAttributeNames: {
                            '#tenancyInvitations': 'tenancyInvitations',
                            '#tenancyId': tenancyID
                        },
                        ReturnValues: 'UPDATED_NEW'
                    }
                }
            ]
        }
    }

    // Query the DB
    try {
        const response = await db.send(new TransactWriteCommand(dbRequest));

        // Send back response
        return buildResponse(200, 'User successfully removed from tenancy');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to remove user from tenancy');
    }
};


const getOrganisationUsers = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Extract the users from the tenancy
    const users = tenancy.users;
    const organisationID = event.pathParameters['organisation-id'];
    const organisationUsers = [];
    for (var userID in users) {
        const user = users[userID];
        const organisation = user.permissions.organisation[organisationID];
        if (organisation != undefined) {

            // Get the users details from Auth0
            const auth0User = await UTIL_getUserFromAuth0ByID(userID);

            organisationUsers.push({
                id: userID,
                name: auth0User.name,
                email: auth0User.email,
                permissions: organisation
            });
        }
    }

    return buildResponse(200, organisationUsers);
};


const addOrganisationUsers = async (event) => {

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(event.pathParameters['tenancy-id']);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    const tenancyID = event.pathParameters['tenancy-id'];
    const organisationID = event.pathParameters['organisation-id'];
    const requestBody = JSON.parse(event.body);

    // Check whether the user exists
    const user = tenancy.users[requestBody.id];
    if (user === null || user === undefined) { return buildResponse(400, 'User does not exist'); }

    // Check the user isn't already added
    if (user.permissions.organisation[organisationID] != undefined) { return buildResponse(400, 'User is already added to organisation'); }

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancyID
        },
        UpdateExpression: 'SET #users.#userID.#permissions.#organisation.#organisationID = :organisationPermissions',
        ExpressionAttributeNames: {
            '#users': 'users',
            '#userID': requestBody.id,
            '#permissions': 'permissions',
            '#organisation': 'organisation',
            '#organisationID': organisationID
        },
        ExpressionAttributeValues: {
            ':organisationPermissions': requestBody.permissions
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Send back response
        return buildResponse(200, 'User added successfully');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to add user');
    }
};


const createOrganisationIntegration = async (event) => {

    const tenancyID = event.pathParameters['tenancy-id'];
    const organisationID = event.pathParameters['organisation-id'];
    const requestBody = JSON.parse(event.body);

    // Validate the request data

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Create the integration object
    const integrationID = crypto.randomUUID().toString();
    const integration = {
        name: requestBody.name,
        type: 'Microsoft Azure AD',
        credentials: {
            tenantId: requestBody.tenantID,
            clientID: requestBody.clientID,
            clientSecret: requestBody.clientSecret
        }
    };

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancyID
        },
        UpdateExpression: 'SET organisations.#organisationID.#integrations.#integrationID = :integration',
        ExpressionAttributeNames: {
            '#organisationID': organisationID,
            '#integrations': 'integrations',
            '#integrationID': integrationID
        },
        ExpressionAttributeValues: {
            ':integration': integration
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Send back response
        return buildResponse(200, 'Integration linked successfully');
    }
    catch (error) {
        // An error occurred in saving to the DB
        console.log('Error', error.stack);

        // Send back response
        return buildResponse(500, 'Unable to link integration');
    }
};


const deleteOrganisationIntegration = async (event) => {

    const tenancyID = event.pathParameters['tenancy-id'];
    const organisationID = event.pathParameters['organisation-id'];
    const integrationID = event.pathParameters['integration-id'];

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancyID
        },
        UpdateExpression: 'REMOVE organisations.#organisationID.#integrations.#integrationID',
        ExpressionAttributeNames: {
            '#organisationID': organisationID,
            '#integrations': 'integrations',
            '#integrationID': integrationID
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Send back response
        return buildResponse(200, 'Integration deleted successfully');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to delete integration');
    }
};


const deleteOrganisationUser = async (event) => {

    const tenancyID = event.pathParameters['tenancy-id'];
    const organisationID = event.pathParameters['organisation-id'];
    const userID = decodeURIComponent(event.pathParameters['user-id']);

    // Get the requesting users ID
    const requestingUserID = event.requestContext.authorizer.principalId;
    if (requestingUserID === null || requestingUserID === undefined) { return buildResponse(400, 'User not defined'); }

    // Get the tenancy
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null || tenancy === undefined) { return buildResponse(500, 'Unable to get tenancy') }

    // Access Control - Check that the user has the correct permissions to perform this request
    const userStatus = tenancy.users[requestingUserID].permissions.status || '';
    const userTenancyPermissions = tenancy.users[requestingUserID].permissions.tenancy || [];
    if (!userTenancyPermissions.includes('iD-P-1') && userStatus === 'member') { return buildResponse(401, 'You are not authorised to perform this action.') }

    // Create the update request
    const dbRequest = {
        TableName: process.env.TENANCY_DB,
        Key: {
            'id': tenancyID
        },
        UpdateExpression: 'REMOVE #users.#userID.#permissions.#organisation.#organisationID',
        ExpressionAttributeNames: {
            '#users': 'users',
            '#userID': userID,
            '#permissions': 'permissions',
            '#organisation': 'organisation',
            '#organisationID': organisationID
        },
        ReturnValues: 'UPDATED_NEW'
    }

    try {
        // Save data to the DB
        const response = await db.send(new UpdateCommand(dbRequest));

        // Send back response
        return buildResponse(200, 'User deleted successfully');
    }
    catch (err) {
        // An error occurred in saving to the DB
        console.log('Error', err.stack);

        // Send back response
        return buildResponse(500, 'Unable to delete user');
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


const UTIL_getUserFromAuth0ByEmail = async (email) => {

    var user = null;

    const searchParams = new URLSearchParams({
        email: email
    });

    try {
        const accessToken = await UTIL_getAuth0ManagementAPIAccessToken();

        const response = await fetch(`https://idsimplify.uk.auth0.com/api/v2/users-by-email?${searchParams}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const responseData = await response.json();
        user = responseData.find((user) => { return user.email === email }) || null;
    }
    catch (error) {
        console.log(error);
    }
    return user;
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


const UTIL_sendEmail = async (email) => {
    try {
        var headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Authorization", `Bearer ${process.env.SENDGRID_API_KEY}`);

        const body = {
            "personalizations": [
                {
                    "to": [
                        {
                            "email": email.to
                        }
                    ]
                }
            ],
            "from": {
                "email": "donotreply@idsimplify.co.uk"
            },
            "subject": email.subject,
            "content": email.content
        };

        var requestOptions = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', requestOptions);
    }
    catch (error) {
        console.log(error);
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