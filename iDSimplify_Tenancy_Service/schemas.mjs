const schemas = {
    'tenancy': {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
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
            "name"
        ]
    }
};

export default schemas;