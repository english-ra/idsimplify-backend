export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'GET' && event.resource === '/integrations/users':
            response = getUsers(event);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }

    return response;
};


const getUsers = async (requestBody, requestContext) => {

    // TODO: Confirm that the user is authoised for this

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API
    var azureAccessToken = undefined;

    try {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("grant_type", "client_credentials");
        urlencoded.append("client_id", clientID);
        urlencoded.append("client_secret", clientSecret);
        urlencoded.append("scope", "https://graph.microsoft.com/.default");

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded
        };

        const response = await fetch(`https://login.microsoftonline.com/${tenantID}/oauth2/v2.0/token`, requestOptions);
        const responseData = await response.json();

        azureAccessToken = responseData.access_token;
    }
    catch (e) {
        console.log(e)
    }

    // Confirm the access token is valid
    if (azureAccessToken === undefined) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    console.log(azureAccessToken)

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
    }

    return buildResponse(200, userData);
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