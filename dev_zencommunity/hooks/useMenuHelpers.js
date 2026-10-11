import { site_url } from "@Utils/helper";
import { useLocation } from "react-router-dom";
import { Icon } from "@chakra-ui/react";
import { linkTo } from "../../assets/staticIcons";

export const useMenuHelpers = (menuItems, menuKey, excludedHeaderMainItems = []) => {
    const location = useLocation();
    const normalizePath = (path) => path.replace(/\/+$/, "") || "/";
    const currentPath = normalizePath(location.pathname);

    const renderIcon = (iconData) => {
        if (!iconData?.src) {
            return <Icon as={linkTo} boxSize="20px" className="zen-com-nav__icon" color="var(--zencom-font-muted)" />;
        }
        if (iconData.type === "img") {
            const resolvedSrc = iconData.src.startsWith('http') ? iconData.src : site_url + iconData.src;
            return <img className="zen-com-nav__icon" src={resolvedSrc} alt="" />;
        }
        return <div className="zen-com-nav__icon" dangerouslySetInnerHTML={{ __html: iconData.src }} />;
    };

    const getRouteFromMenuItem = (item) => {
        if (item.route || item.path || item.url) {
            return item.route || item.path || item.url;
        }

        const label = (item.label ?? '').toLowerCase();
        switch (label) {
            case "feeds":
                return "/";
            case "groups":
                return "/groups";
            case "members":
                return "/members";
            case "live-chat":
                return "/live-chat";
            case "chat":
                return "/chat";
            case "ticket":
                return "/tickets";
            case "agent activity":
                return "/agent-activity";
            default:
                return label ? `/${label.replace(/\s+/g, "-")}` : "/";
        }
    };

    let topMenuItems = menuItems?.[menuKey]?.items || [];

    topMenuItems = topMenuItems.filter(item => item.label?.toLowerCase() !== "settings");

    const isMenuItems = excludedHeaderMainItems.length
        ? topMenuItems.filter((item) => !excludedHeaderMainItems.includes(item.id))
        : topMenuItems;

    const isChat = topMenuItems.filter(item => (item.id === 'menu_chat' || item.id === "menu_Livechat") && item.status === true);

    return {
        currentPath,
        renderIcon,
        getRouteFromMenuItem,
        topMenuItems,
        isMenuItems,
        isChat,
    };
};
