export const getButtonStatus = ({member_role, member_status, approval_required}) => {
    if (member_role === 'member' && member_status === 'active') return false;
    else if (member_role === 'member') return 'requested';
    return true;
}
