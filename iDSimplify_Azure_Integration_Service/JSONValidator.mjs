import Ajv from "ajv";

const ajv = new Ajv();

export const validateJSONWSchema = (data, schema) => {
    const validate = ajv.compile(schema);
    const isDataValid = validate(data);
    return isDataValid;
};