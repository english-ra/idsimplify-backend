// This is not my own code, this has been taken from the Auth0 help article which instructs how to integrate Auth0 with Amazon's API Gateway
// https://auth0.com/docs/customize/integrations/aws/aws-api-gateway-custom-authorizers
// https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer

const lib = require('./lib');
let data;

// Lambda function index.handler - thin wrapper around lib.authenticate
module.exports.handler = async (event, context, callback) => {
  try {
    data = await lib.authenticate(event);
  }
  catch (err) {
      console.log(err);
      return context.fail("Unauthorized");
  }
  return data;
};