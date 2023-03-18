const schemas = {
    'user': {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "userId": {
                "description": "The PK of the user, as define by Auth0",
                "type": "string"
            },
            "email": {
                "title": "Email address",
                "description": "The email address of the user",
                "type": "string",
                "pattern": "^\\S+@\\S+\\.\\S+$",
                "minLength": 6,
                "maxLength": 127
            }
        },
        "additionalProperties": false,
        "required": [
            "userId",
            "email"
        ]
    }
};

export default schemas;