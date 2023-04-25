import { getAzureAccessToken } from './AzureUtility.mjs';
import { buildResponse, accessControl, getAzureCredentials, UTIL_getTenancy } from './Utility.mjs';
import { validateJSONWSchema } from './JSONValidator.mjs';
import schemas from "./schemas.mjs";


export const getGroups = async (event) => {

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

    // Get the groups from Azure
    var groupData = null;
    try {
        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${azureAccessToken}`);

        var requestOptions = {
            method: 'GET',
            headers: myHeaders
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/groups', requestOptions);

        groupData = await response.json();
    }
    catch (e) {
        console.log(e);
        return buildResponse(400, 'Failed to query Azure');
    }

    return buildResponse(200, groupData);
};


export const createGroup = async (event) => {

    const tenancyID = event.queryStringParameters['tenancy-id'];
    const body = JSON.parse(event.body);

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

    const requestBody = {
        description: body.description,
        displayName: body.displayName,
        groupTypes: [
            "Unified"
        ],
        mailEnabled: true,
        mailNickname: body.mailNickname,
        securityEnabled: false
    };

    // Create the group in Azure
    try {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${azureAccessToken}`);
        headers.append("Content-Type", "application/json");

        var requestOptions = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/groups', requestOptions);

        if (response.status === 201) { return buildResponse(200, 'Group created successfully') }
        else {
            const data = await response.json();
            console.log(data);
            throw new Error(data);
        }
    }
    catch (error) {
        console.log(error);
        return buildResponse(400, error);
    }
};