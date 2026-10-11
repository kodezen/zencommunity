import React from 'react';
import { CommunityRoutes } from '../../communityRouter';

/**
 * FSE `content-outlet` block: renders the routed community content (feed,
 * members, groups, profiles, …) based on the current URL. Placed alongside the
 * header/sidebar chrome blocks, it swaps views as you navigate — while those
 * chrome blocks stay put. Every island shares one history (sharedHistory.js via
 * IslandProviders), so a nav click in any island updates this outlet too.
 *
 * Uses the Router provided by IslandProviders (not self-contained).
 */
const ContentOutlet = () => <CommunityRoutes />;

export default ContentOutlet;
