import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: 'eu-west-2' });

export const handler = async(event) => {
    // let response;

    // switch (true) {
    //     case event.httpMethod === 'POST':
    //         response = createUser(JSON.parse(event.body));
    //         break;
    //     default:
    //         response = buildResponse(404, '404 Not Found');
    // }

    // return response;
    console.log(event.body);
    return buildResponse(200, 'Received');
};







const createNewTenant = async (requestBody) => {

    // Validate that the data is formatted correctly
    const isDataValid = validateJSONWScheme(requestBody, schemas['user']);
    if (!isDataValid) { return buildResponse(400, 'Incorrect Data'); }

    const params = {
        TableName: userTable,
        Item: requestBody
    };

    try {
        const data = await ddbClient.send(new PutCommand(params));
        const body = { Operation: 'SAVE', Message: 'SUCCESS', Item: requestBody };
        return buildResponse(200, body);
    } catch (err) {
        console.log('Error', err.stack);
    }
};





function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin" : "*"
        },
        body: JSON.stringify(body)
    }
}