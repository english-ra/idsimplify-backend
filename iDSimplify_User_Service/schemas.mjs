const schemas = {
    'user': {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "userId": {
                "description": "The PK of the user, as define by Auth0",
                "type": "string"
            },
            "createdAt": {
                "description": "The date in epoch time, that the user was created",
                "type": "string"
            }
        },
        "additionalProperties": false,
        "required": [
            "userId",
            "createdAt"
        ]
    }
};

export default schemas;