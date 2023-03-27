export const getAzureAccessToken = async (tenantID, clientID, clientSecret) => {
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

    return azureAccessToken;
};