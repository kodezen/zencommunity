import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { __ } from '@wordpress/i18n';
import { useMenuHelpers } from '@Hooks/useMenuHelpers';

/**
 * Standalone community navigation block. Renders the configured menu (top or
 * primary) as links; active state + client-side routing work via the island's
 * router and the shared-navigation runtime, so it drives the Content Outlet.
 */
const Navigation = ({ menuKey = 'top_menu', orientation = 'horizontal' }) => {
    const menuItems = useSelector((state) => state.menus);
    const { currentPath, renderIcon, getRouteFromMenuItem, isMenuItems } = useMenuHelpers(
        menuItems,
        menuKey,
        []
    );

    if (!menuItems || !menuItems[menuKey] || menuItems[menuKey] === false) return null;

    const isVertical = orientation === 'vertical';
    const style = {
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: isVertical ? 'stretch' : 'center',
        gap: isVertical ? '4px' : '8px',
        flexWrap: 'wrap',
    };

    return (
        <nav className={`zencom-fse-nav zencom-fse-nav--${orientation}`} style={style}>
            {isMenuItems
                .filter((item) => item.status === true)
                .map((item) => {
                    const routePath = getRouteFromMenuItem(item);
                    const isActive = currentPath === routePath;
                    return (
                        <Link
                            key={item.id}
                            to={routePath}
                            className={`zencom-menu zencom-menu--${isActive ? 'active' : 'inactive'}`}
                        >
                            {renderIcon(item?.icon)}
                            <span className="zencom-menu__label">{__(item?.label, 'zencommunity')}</span>
                        </Link>
                    );
                })}
        </nav>
    );
};

export default Navigation;
