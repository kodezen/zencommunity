import { community_path } from '../utils/helper';

/**
 * Compute the router basename for FSE islands, mirroring the SPA's app.js logic.
 * Internal <Link>/useParams then resolve against the community base path
 * (e.g. "/community"), matching how the standalone SPA behaves.
 */
export const fseBasename = () => {
    const pathSegments = window.location.pathname.split('/');
    const cleanPath = (community_path || '').startsWith('/')
        ? community_path.slice(1)
        : community_path;

    if (!cleanPath) return '';

    const workspaceIndex = pathSegments.findIndex((segment) => segment === cleanPath);

    return workspaceIndex !== -1
        ? '/' + pathSegments.slice(1, workspaceIndex + 1).join('/')
        : '';
};
