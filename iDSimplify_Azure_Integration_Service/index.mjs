import { getDomains } from './misc.mjs';
import {
    getUsers,
    getUser,
    getUserGroups,
    resetPassword,
    enableUser,
    disableUser,
    createUser
} from './users.mjs';
import { buildResponse } from './Utility.mjs';

export const handler = async (event) => {
    let response;

    switch (true) {
        case event.httpMethod === 'GET' && event.resource === '/integrations/users':
            response = getUsers(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/integrations/users':
            response = createUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/users/{id}':
            response = getUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/users/{id}/groups':
            response = getUserGroups(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/integrations/users/{id}/resetpassword':
            response = resetPassword(event);
            break;
        case event.httpMethod === 'PATCH' && event.resource === '/integrations/users/{id}/enable':
            response = enableUser(event);
            break;
        case event.httpMethod === 'PATCH' && event.resource === '/integrations/users/{id}/disable':
            response = disableUser(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/domains':
            response = getDomains(event);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }

    return response;
};