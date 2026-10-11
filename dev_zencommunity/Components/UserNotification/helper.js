const routeMap = {
    feed: [
        "feed_posted", "feed_liked", "comment_liked", "feed_comment",
        "comment_reply", "mentioned_in_feed", "mentioned_in_comment"
    ],
    group: [
        "user_added_in_group", "user_role_changed_in_group", "group_join_request"
    ],
    ticket: [
        "ticket_conversation_created", "ticket_assigned", "ticket_closed", "ticket_reopened"
    ],
    engineering: [
        "eng_issue_assigned"
    ],
    live_chat: [
        "livechat_feedback_submitted"
    ]
};

export const generatePath = (metaData, type) => {
    if (routeMap.feed.includes(type)) return `/feed/${metaData?.route?.feed?.id}`;
    if (routeMap.group.includes(type)) return `/group/${metaData?.group?.id}`;
    if (routeMap.ticket.includes(type)) return `/ticket/${metaData?.ticket?.id ?? metaData?.route?.conversation?.ticket_id}`;
    if (routeMap.engineering.includes(type)) return `/engineering?issue=${metaData?.eng_issue?.id}`;
    if (routeMap.live_chat.includes(type)) return `/live-chat?chat_id=${metaData?.route?.live_chat?.id}`;
    return "/";
};
