import React from 'react';
import { CommunityRoutes } from '../../communityRouter';

/**
 * FSE `content-body` block: the routed community content (feed, members,
 * groups, profiles…) with the view's own sidebars hidden. Unlike the
 * `content-outlet` (a full 3-column view), this is meant to sit in your own
 * center column alongside the standalone Left/Right sidebar blocks — so you
 * build a custom columned layout where navigation swaps just the center.
 *
 * The wrapper class hides the pages' built-in sidebars (see app.scss).
 */
const ContentBody = () => (
    <div className="zencom-fse-content-only">
        <CommunityRoutes />
    </div>
);

export default ContentBody;
