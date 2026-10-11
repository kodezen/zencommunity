import { useAuth } from '../Context/AuthContext';
import { API, namespace } from './helper';

export const ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    USER: 'user',
};


const RequireRole = ({ role, children }) => {
    const { user } = useAuth();
    if (user?.role === role) {
        return children;
    }
    return null;
};
export default RequireRole;

export const RequireAnyRole = ({ roles, children }) => {
    const { user } = useAuth();
    return roles.includes(user?.role) ? children : null;
};

// Global ZenCommunity member roles (zenc_user_role user meta), distinct from
// the ROLES/AuthContext concept above. Mirrors RoleManager::ROLE_* in PHP.
export const ROLE_SUPPORT_AGENT = 'support_agent';
export const ROLE_DEVELOPER = 'developer';
export const STAFF_ROLES = [ROLE_SUPPORT_AGENT, ROLE_DEVELOPER];

// `members?role=` only matches a single role (server does a LIKE on one
// value), so assignee dropdowns that need both support_agent and developer
// members issue one request per role and merge/dedupe the results here.
export const fetchMembersByRoles = async (roles = STAFF_ROLES) => {
    const lists = await Promise.all(
        roles.map((role) =>
            API.get(`${namespace}/members?role=${role}`)
                .then(({ data }) => data?.records || [])
                .catch(() => [])
        )
    );
    const byId = new Map();
    lists.flat().forEach((member) => byId.set(member.id, member));
    return Array.from(byId.values());
};

