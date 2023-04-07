import { getAzureAccessToken } from './AzureUtility.mjs';

export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'GET' && event.resource === '/integrations/users':
            response = getUsers(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/users/{id}':
            response = getUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/users/{id}/groups':
            response = getUserGroups(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/integrations/users/{id}/resetpassword':
            response = resetPassword(event);
            break;
        case event.httpMethod === 'PATCH' && event.resource === '/integrations/users/{id}/enable':
            response = enableUser(event);
            break;
        case event.httpMethod === 'PATCH' && event.resource === '/integrations/users/{id}/disable':
            response = disableUser(event);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }

    return response;
};


const getUsers = async (requestBody, requestContext) => {

    // TODO: Confirm that the user is authorised for this

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
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


const getUser = async (event) => {

    // TODO: Confirm that the user is authorised for this

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
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


const getUserGroups = async (event) => {

    // TODO: Confirm that the user is authorised for this

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
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


const resetPassword = async (event) => {

    // TODO: Confirm that the requesting user is authorised to perform this action

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
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


const enableUser = async (event) => {

    // TODO: Confirm that the requesting user is authorised to perform this action

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Query the Azure Graph API
    try {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${azureAccessToken}`);
        headers.append("Content-Type", "application/json");

        const body = JSON.stringify({
            accountEnabled: true
        });

        console.log(body);

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


const disableUser = async (event) => {

    // TODO: Confirm that the requesting user is authorised to perform this action

    // Get the id of the user being queried
    const pathParameters = event.pathParameters;
    const queriedUserID = pathParameters.id;

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Query the Azure Graph API
    try {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${azureAccessToken}`);
        headers.append("Content-Type", "application/json");

        const body = JSON.stringify({
            accountEnabled: false
        });

        console.log(body);

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


const createUser = (event) => {

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