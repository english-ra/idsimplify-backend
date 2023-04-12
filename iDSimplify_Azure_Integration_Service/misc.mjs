import { getAzureAccessToken } from './AzureUtility.mjs';
import { buildResponse } from './Utility.mjs';

export const getDomains = async (event) => {

    // TODO: Confirm that the user is authorised for this

    // Get the relevant integration details
    const tenantID = '58cf20ee-3772-4478-9af3-d1972f80609c';
    const clientID = 'b2d3f318-1ae0-4a2b-b62e-e33d8f9cd8d8';
    const clientSecret = 'EUQ8Q~07deBRW1HGFv9E1BNA3oDxdcmDpft5Sbek';

    // Get the access token for the Graph API and confirm it's valid
    var azureAccessToken = await getAzureAccessToken(tenantID, clientID, clientSecret);
    if (azureAccessToken === undefined || azureAccessToken === null) { return buildResponse(401, 'Unable to authenticate with Azure'); }

    // Get the users from Azure
    var domainsData = null;
    try {
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${azureAccessToken}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/domains', requestOptions);

        domainsData = await response.json();
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }

    return buildResponse(200, domainsData);
};