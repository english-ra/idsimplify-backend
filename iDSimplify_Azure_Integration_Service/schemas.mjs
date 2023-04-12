const schemas = {
    'creationUser': {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "givenName": {
                "title": "First name",
                "type": "string"
            },
            "surname": {
                "title": "First name",
                "type": "string"
            },
            "displayName": {
                "title": "First name",
                "type": "string"
            },
            "mailNickname": {
                "title": "First name",
                "type": "string"
            },
            "userPrincipalName": {
                "title": "",
                "type": "string"
            },
            "password": {
                "title": "Password",
                "type": "string"
            },
        },
        "additionalProperties": false,
        "required": [
            "givenName",
            "surname",
            "displayName",
            "mailNickname",
            "userPrincipalName",
            "password"
        ]
    }
};

export default schemas;