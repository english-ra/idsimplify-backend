import { getAzureAccessToken } from './AzureUtility.mjs';
import { buildResponse, accessControl, getAzureCredentials, UTIL_getTenancy } from './Utility.mjs';

export const getDomains = async (event) => {

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