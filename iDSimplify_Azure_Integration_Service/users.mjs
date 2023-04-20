import { getAzureAccessToken } from './AzureUtility.mjs';
import { buildResponse, accessControl, getAzureCredentials, UTIL_getTenancy } from './Utility.mjs';
import { validateJSONWSchema } from './JSONValidator.mjs';
import schemas from "./schemas.mjs";

export const getUsers = async (event) => {

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Get the users from Azure
    var userData = null;
    try {
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${azureAccessToken}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/users', requestOptions);

        userData = await response.json();
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }

    return buildResponse(200, userData);
};


export const createUser = async (event) => {

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Get the user for creations data
    const creationUserData = JSON.parse(event.body);

    // Validate the request data
    // const isDataValid = validateJSONWSchema(creationUserData, schemas['creationUser']);
    // if (!isDataValid) { return buildResponse(400, 'Incorrect data'); }

    // Query the Azure Graph API
    var responseData = null;
    try {
        var headers = new Headers();
        headers.append("Content-Type", "application/json");
        headers.append("Authorization", `Bearer ${azureAccessToken}`);

        var body = JSON.stringify({
            "accountEnabled": true,
            "givenName": creationUserData.givenName,
            "surname": creationUserData.surname,
            "displayName": creationUserData.displayName,
            "mailNickname": creationUserData.mailNickname,
            "userPrincipalName": creationUserData.userPrincipalName,
            "passwordProfile": {
                "forceChangePasswordNextSignIn": true,
                "password": creationUserData.password
            }
        });

        var requestOptions = {
            method: 'POST',
            headers: headers,
            body: body
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users`, requestOptions);

        // Check the request was successful
        if (response.status === 201) { return buildResponse(200, 'Successful, this can take a while to update.') }
        else { return buildResponse(400, 'Azure Error!') };
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }
};


export const getUser = async (event) => {

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Get the users from Azure
    var userData = null;
    try {
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${azureAccessToken}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        const fields = '$select=aboutMe,accountEnabled,displayName,givenName,id,jobTitle,mail,preferredName,surname,userPrincipalName';

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${queriedUserID}?${fields}`, requestOptions);

        userData = await response.json();
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }

    return buildResponse(200, userData);
};


export const getUserGroups = async (event) => {

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Get the users from Azure
    var userData = null;
    try {
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${azureAccessToken}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${queriedUserID}/memberOf`, requestOptions);

        userData = await response.json();
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }

    return buildResponse(200, userData);
};


export const resetPassword = async (event) => {

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Query the Azure Graph API
    var responseData = null;
    try {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${azureAccessToken}`);

        var requestOptions = {
            method: 'POST',
            headers: headers
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${queriedUserID}/authentication/methods/28c10230-6103-485e-b985-444c60001490/resetPassword`, requestOptions);
        responseData = await response.json();
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }

    return buildResponse(200, responseData);
};


export const enableUser = async (event) => {

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Query the Azure Graph API
    try {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${azureAccessToken}`);
        headers.append("Content-Type", "application/json");

        const body = JSON.stringify({
            accountEnabled: true
        });

        var requestOptions = {
            method: 'PATCH',
            body: body,
            headers: headers
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${queriedUserID}`, requestOptions);

        // Check the request was successful
        if (response.status === 204) { return buildResponse(200, 'Successful, this can take a while to update.') }
        else { return buildResponse(400, 'Azure Error!') };
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }
};


export const disableUser = async (event) => {

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    const tenancyID = event.queryStringParameters['tenancy-id'];

    // Check the tenancy exists
    const tenancy = await UTIL_getTenancy(tenancyID);
    if (tenancy === null) { return buildResponse(500, 'Tenancy does not exist'); }

    // Confirm that the user is authorised for this
    const isAuthorised = await accessControl(event, tenancy, ['iD-P-10000']);
    if (isAuthorised != 'accessGranted') { return isAuthorised; }

    // Get Azure credentials
    const credentials = getAzureCredentials(event, tenancy);
    if (credentials === undefined) { return buildResponse(500, 'Unable to get integration details'); }

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(credentials.tenantId, credentials.clientID, credentials.clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Query the Azure Graph API
    try {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${azureAccessToken}`);
        headers.append("Content-Type", "application/json");

        const body = JSON.stringify({
            accountEnabled: false
        });

        var requestOptions = {
            method: 'PATCH',
            body: body,
            headers: headers
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${queriedUserID}`, requestOptions);

        // Check the request was successful
        if (response.status === 204) { return buildResponse(200, 'Successful, this can take a while to update.') }
        else { return buildResponse(400, 'Azure Error!') };
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }
};