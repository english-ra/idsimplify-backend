import Ajv from "ajv";

const ajv = new Ajv();

const validateJSONWSchema = (data, schema) => {
    const validate = ajv.compile(schema);
    const isDataValid = validate(data);
    return isDataValid;
}

export default validateJSONWSchema;