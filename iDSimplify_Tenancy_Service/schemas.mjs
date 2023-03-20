const schemas = {
    'tenancy': {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "tenancyId": {
                "description": "The PK of the tenancy",
                "type": "string"
            },
            "name": {
                "title": "Tenancy name",
                "description": "The name of the tenancy",
                "type": "string",
                "minLength": 6,
                "maxLength": 127
            }
        },
        "additionalProperties": false,
        "required": [
            // "tenancyId",
            "name"
        ]
    }
};

export default schemas;