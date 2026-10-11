import React, { useContext, useEffect, useRef, useState } from 'react';
import { Button, Skeleton, SkeletonCircle, Text } from '@chakra-ui/react';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { baseURL, site_url, capitalizeName } from '@Utils/helper';
import { __, sprintf } from '@wordpress/i18n';
import { IoMdNotificationsOutline } from 'react-icons/io';
import {
    LuAtSign, LuBell, LuBellOff, LuCheckCheck, LuFileText, LuHeadphones, LuHeart,
    LuMessageCircle, LuMessagesSquare, LuUsers, LuWrench,
} from 'react-icons/lu';
import { useFetchData } from '@Hooks/useFetchData';
import { Link } from 'react-router-dom';
import { generatePath } from './helper';
import ZenComTooltip from '@Components/ZenComTooltip';
import { useDispatch, useSelector } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { fetchAllNotifications, markNotificationAsRead } from '@Redux/slices/userNotificationSlice/userNotificationSlice';
import SocketContext from '@Context/SocketContext';
import { API, namespace } from '@Utils/helper';
import { useStyles } from '../../utils/chakra';
import './styles.scss';

const FILTERS = [
    { key: 'all', label: __('All', 'zencommunity') },
    { key: 'unread', label: __('Unread', 'zencommunity') },
    { key: 'read', label: __('Read', 'zencommunity') },
];

// Small badge on the avatar saying what kind of notification it is.
const EVENT_BADGES = [
    { types: ['feed_liked', 'comment_liked'], icon: LuHeart, tone: 'rose' },
    { types: ['feed_comment', 'comment_reply'], icon: LuMessageCircle, tone: 'blue' },
    { types: ['mentioned_in_feed', 'mentioned_in_comment'], icon: LuAtSign, tone: 'violet' },
    { types: ['feed_posted'], icon: LuFileText, tone: 'indigo' },
    { types: ['user_added_in_group', 'user_role_changed_in_group', 'group_join_request'], icon: LuUsers, tone: 'green' },
    { types: ['ticket_conversation_created', 'ticket_assigned', 'ticket_closed', 'ticket_reopened'], icon: LuHeadphones, tone: 'amber' },
    { types: ['eng_issue_assigned'], icon: LuWrench, tone: 'slate' },
    { types: ['livechat_feedback_submitted'], icon: LuMessagesSquare, tone: 'cyan' },
];
const badgeFor = (type) => EVENT_BADGES.find((b) => b.types.includes(type)) || { icon: LuBell, tone: 'blue' };

const EMPTY_STATES = {
    all: { title: __('No notifications yet', 'zencommunity'), text: __("When something happens in your community, you'll see it here.", 'zencommunity') },
    unread: { title: __("You're all caught up", 'zencommunity'), text: __('There are no unread notifications.', 'zencommunity') },
    read: { title: __('Nothing read yet', 'zencommunity'), text: __('Notifications you have read will show up here.', 'zencommunity') },
};

const toLocal = (date) => moment.utc(date, 'YYYY-MM-DD HH:mm:ss').local();

const timeLabel = (date) => {
    const m = toLocal(date);
    return moment().diff(m, 'days') >= 7 ? m.format('MMM D, YYYY') : m.fromNow();
};

// Bold the quoted parts of a message (e.g. a Space name: added on "COURSE").
const highlightQuoted = (message = '') =>
    String(message).split(/("[^"]+")/g).map((part, i) =>
        /^"[^"]+"$/.test(part) ? <strong key={i}>{part.slice(1, -1)}</strong> : part
    );

const NotificationItem = ({ item, onOpen, onToggleRead }) => {
    const user = item?.meta?.user || item?.from_user;
    const name = capitalizeName(`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '');
    const avatarUrl = user?.avatar_url ? site_url + '/' + user.avatar_url : '';
    const unread = item?.is_read !== '1';
    const badge = badgeFor(item?.event_type);
    const BadgeIcon = badge.icon;

    return (
        <li className={`zc-notif-item${unread ? ' is-unread' : ''}`}>
            <Link to={baseURL(generatePath(item?.meta, item?.event_type))} onClick={() => onOpen(item)} className="zc-notif-item__link">
                <span className="zc-notif-item__avatar">
                    <ZenComAvatar variant="simple" boxSize="40px" userName={name} src={avatarUrl} showHoverCard={false} />
                    <span className={`zc-notif-item__badge is-${badge.tone}`}><BadgeIcon /></span>
                </span>
                <span className="zc-notif-item__body">
                        <span className="zc-notif-item__top">
                        <span className="zc-notif-item__name">{name || __('Notification', 'zencommunity')}</span>
                        <span className="zc-notif-item__time">{timeLabel(item?.created_at)}</span>
                    </span>
                    <span className="zc-notif-item__text">{highlightQuoted(item?.message)}</span>
                </span>
            </Link>
            <ZenComTooltip position="left" variant="black" content={unread ? __('Mark as read', 'zencommunity') : __('Mark as unread', 'zencommunity')}>
                <button
                    type="button"
                    className="zc-notif-item__dot"
                    aria-label={unread ? __('Mark as read', 'zencommunity') : __('Mark as unread', 'zencommunity')}
                    onClick={() => onToggleRead(item)}
                />
            </ZenComTooltip>
        </li>
    );
};

const UserNotification = () => {
    const [open, isOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const { is_new_notifications_available } = useSelector(state => state.ticker);
    // `filter` lives in Redux, not local state: this component mounts more than
    // once at a time (the classic Header and the FSE Notifications block both
    // render it), and all instances share one `userNotifications` slice. A local
    // filter meant each instance's own background poll could re-fetch with its
    // own stale default and silently overwrite the shared records/filter while
    // that instance's own tab UI never moved — Read stayed highlighted there,
    // but the list flipped to All underneath it.
    const { records: notifications, unread, filter } = useSelector(state => state.userNotifications);
    const filterRef = useRef(filter);
    filterRef.current = filter;
    const dispatch = useDispatch();
    const notificationContainerRef = useRef(null);
    const buttonRef = useRef(null);
    const { isConnected } = useContext(SocketContext);
    const { commonBtn } = useStyles();

    const fetchNotifications = async () => dispatch(fetchAllNotifications({ filter: filterRef.current }));

    const { loading } = useFetchData({
        handler: fetchNotifications,
        timer: 30000,
        isSocketActive: isConnected,
    });

    const changeFilter = async (next) => {
        if (next === filter) return;
        setSwitching(true);
        await dispatch(fetchAllNotifications({ filter: next }));
        setSwitching(false);
    };

    useEffect(() => {
        if (is_new_notifications_available) {
            const before = unread;
            fetchNotifications().then(res => {
                const newCount = (Number(res?.payload?.unread) || 0) - (Number(before) || 0);
                if (newCount > 0) {
                    dispatch(showNotification({
                        message: sprintf(__('%d new notifications!', 'zencommunity'), newCount),
                        isShow: true,
                        type: 'info',
                    }));
                }
            });
        }
    }, [is_new_notifications_available]);

    // The panel is anchored to the bell, so on narrow phones it's pinned with
    // `position: fixed` under the button instead (see the styles below).
    const [mobileFixedTop, setMobileFixedTop] = useState(null);

    useEffect(() => {
        if (!open) {
            setMobileFixedTop(null);
            return;
        }
        const updatePosition = () => {
            if (window.innerWidth <= 768 && buttonRef.current) {
                setMobileFixedTop(buttonRef.current.getBoundingClientRect().bottom + 8);
            } else {
                setMobileFixedTop(null);
            }
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [open]);

    useEffect(() => {
        const handleClick = (e) => {
            if (
                notificationContainerRef.current &&
                !notificationContainerRef.current.contains(e.target) &&
                !buttonRef.current.contains(e.target)
            ) {
                isOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handlerMarkAllAsRead = async () => {
        await API.post(`${namespace}/member/notifications`, { is_read: 1, notification_id: 0 });
        fetchNotifications();
    };

    const openItem = (item) => {
        if (item?.is_read !== '1') {
            dispatch(markNotificationAsRead({ notification_id: parseInt(item?.id), is_read: 1 }));
        }
        isOpen(false);
    };

    const toggleRead = async (item) => {
        await dispatch(markNotificationAsRead({ notification_id: parseInt(item?.id), is_read: item?.is_read === '1' ? 0 : 1 }));
        // Under Unread/Read the item no longer belongs to the list.
        if (filterRef.current !== 'all') fetchNotifications();
    };

    // "Today" and "Earlier" sections.
    const today = (notifications || []).filter((n) => toLocal(n?.created_at).isSame(moment(), 'day'));
    const earlier = (notifications || []).filter((n) => !toLocal(n?.created_at).isSame(moment(), 'day'));
    const showSkeleton = (loading && !notifications?.length) || switching;
    const empty = EMPTY_STATES[filter];

    return (
        <div className="zc-notif">
            <Button
                onClick={() => isOpen(!open)}
                ref={buttonRef}
                {...commonBtn}
                bg="transparent"
                padding="0px"
                aria-label={__('Notifications', 'zencommunity')}
            >
                <IoMdNotificationsOutline size={20} />
                {Number(unread) > 0 && (
                    <Text
                        as="span"
                        position="absolute" top="-0px" right="-0px"
                        bg="red.500" color="white"
                        borderRadius="4px"
                        padding="1px 4px"
                        fontSize="10px"
                        lineHeight="14px"
                        display="flex" alignItems="center" justifyContent="center"
                    >
                        {unread}
                    </Text>
                )}
            </Button>

            {open && (
                <div
                    ref={notificationContainerRef}
                    className={`zc-notif-panel zencom-animate-slide-down${mobileFixedTop !== null ? ' is-fixed' : ''}`}
                    style={mobileFixedTop !== null ? { top: `${mobileFixedTop}px` } : undefined}
                    role="dialog"
                    aria-label={__('Notifications', 'zencommunity')}
                >
                    <div className="zc-notif-panel__head">
                        <div className="zc-notif-panel__title">
                            {__('Notifications', 'zencommunity')}
                            {Number(unread) > 0 && <span className="zc-notif-panel__count">{unread}</span>}
                        </div>
                        <button
                            type="button"
                            className="zc-notif-panel__mark"
                            onClick={handlerMarkAllAsRead}
                            disabled={!Number(unread)}
                        >
                            <LuCheckCheck />
                            {__('Mark all as read', 'zencommunity')}
                        </button>
                    </div>

                    <div className="zc-notif-tabs" role="tablist">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                role="tab"
                                aria-selected={filter === f.key}
                                className={`zc-notif-tabs__item${filter === f.key ? ' is-active' : ''}`}
                                onClick={() => changeFilter(f.key)}
                            >
                                {f.label}
                                {f.key === 'unread' && Number(unread) > 0 && <span className="zc-notif-tabs__count">{unread}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="zc-notif-panel__list">
                        {showSkeleton ? (
                            <div className="zc-notif-skeleton">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div className="zc-notif-skeleton__row" key={i}>
                                        <SkeletonCircle size="10" />
                                        <div className="zc-notif-skeleton__lines">
                                            <Skeleton height="12px" width="85%" />
                                            <Skeleton height="10px" width="35%" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : notifications?.length > 0 ? (
                            <div className="zencom-animate-fade">
                                {[
                                    { key: 'today', label: __('Today', 'zencommunity'), items: today },
                                    { key: 'earlier', label: __('Earlier', 'zencommunity'), items: earlier },
                                ].filter((g) => g.items.length).map((group) => (
                                    <section key={group.key} className="zc-notif-group">
                                        <h4 className="zc-notif-group__label">{group.label}</h4>
                                        <ul className="zc-notif-group__list">
                                            {group.items.map((item) => (
                                                <NotificationItem key={item.id} item={item} onOpen={openItem} onToggleRead={toggleRead} />
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div className="zc-notif-empty zencom-animate-fade">
                                <span className="zc-notif-empty__icon">{filter === 'unread' ? <LuCheckCheck /> : <LuBellOff />}</span>
                                <strong>{empty.title}</strong>
                                <span>{empty.text}</span>
                            </div>
                        )}
                    </div>

                    <div className="zc-notif-panel__foot">
                        <Link to="/notifications" onClick={() => isOpen(false)}>
                            {__('View all notifications', 'zencommunity')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserNotification;
