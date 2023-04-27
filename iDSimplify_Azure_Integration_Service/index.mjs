import { getDomains } from './misc.mjs';
import {
    getUsers,
    getUser,
    getUserGroups,
    resetPassword,
    enableUser,
    disableUser,
    createUser,
    deleteUser
} from './users.mjs';
import {
    getGroups,
    getGroup,
    createGroup,
    deleteGroup,
    getGroupMembers
} from './groups.mjs';
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
        case event.httpMethod === 'DELETE' && event.resource === '/integrations/users/{id}':
            response = deleteUser(event);
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
        case event.httpMethod === 'GET' && event.resource === '/integrations/groups':
            response = getGroups(event);
            break;
        case event.httpMethod === 'POST' && event.resource === '/integrations/groups':
            response = createGroup(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/groups/{id}':
            response = getGroup(event);
            break;
        case event.httpMethod === 'DELETE' && event.resource === '/integrations/groups/{id}':
            response = deleteGroup(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/groups/{id}/members':
            response = getGroupMembers(event);
            break;
        case event.httpMethod === 'GET' && event.resource === '/integrations/domains':
            response = getDomains(event);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }

    return response;
};