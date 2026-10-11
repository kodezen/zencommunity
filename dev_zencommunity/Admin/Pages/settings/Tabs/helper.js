import { __ } from '@wordpress/i18n';
import { FiGift } from 'react-icons/fi';
import { LuBug, LuCircleDot } from 'react-icons/lu';
import { RiRefund2Fill } from 'react-icons/ri';
import { FaFacebook, FaSquareThreads, FaXTwitter} from 'react-icons/fa6';
import { FaGithubSquare, FaInstagramSquare, FaLinkedin, FaRegFlag, FaRegQuestionCircle } from 'react-icons/fa';

export const allMember = [
    {
        label: __('Guest', 'zencommunity'),
        value: "guest"
    },
    {
        label: __('Logged', 'zencommunity'),
        value: "logged"
    },
    {
        label: __('Admin', 'zencommunity'),
        value: "admin-mod"
    },
]

export const userProfile = [
    {
        label: __('Everyone', 'zencommunity'),
        value: "Everyone"
    },
    {
        label: __('High', 'zencommunity'),
        value: "high"
    },
]

export const userGroup = [
    {
        label: __('Everyone', 'zencommunity'),
        value: "Everyone"
    },
    {
        label: __('High', 'zencommunity'),
        value: "high"
    },
]

export const items = [
    { label: __("Optional", 'zencommunity'), value: "optional" },
    { label: __("Required", 'zencommunity'), value: "required" },
    { label: __("Disabled", 'zencommunity'), value: "disabled" },
];

export const socialLinks = [
    { label: __("Facebook", 'zencommunity'), value: 'facebook', icon: <FaFacebook /> },
    { label: __("Linkedin", 'zencommunity'), value: 'linkedin', icon: <FaLinkedin /> },
    { label: __("Instagram", 'zencommunity'), value: 'instagram', icon: <FaInstagramSquare /> },
    { label: __("X", 'zencommunity'), value: 'x', icon: <FaXTwitter/> },
    // { label: __("Thread", 'zencommunity'), value: 'Thread', icon: <FaSquareThreads /> },
    // { label: __("Github", 'zencommunity'), value: 'Github', icon: <FaGithubSquare /> },
];

export const ticketPriority = [
    { label: __("Urgent", 'zencommunity'), value: 'Urgent', icon: <FaRegFlag /> },
    { label: __("High", 'zencommunity'), value: 'High', icon: <FaRegFlag /> },
    { label: __("Normal", 'zencommunity'), value: 'Normal', icon: <FaRegFlag /> },
    { label: __("Low", 'zencommunity'), value: 'Low', icon: <FaRegFlag /> },
];

export const ticketTypes = [
    { label: __("Ask question", 'zencommunity'), value: 'Ask question', icon: <FaRegQuestionCircle /> },
    { label: __("Feature request", 'zencommunity'), value: 'Feature request', icon: <FiGift /> },
    { label: __("Bug report", 'zencommunity'), value: 'Bug report', icon: <LuBug /> },
    { label: __("Refund", 'zencommunity'), value: 'Refund', icon: <RiRefund2Fill /> },
    { label: __("Other", 'zencommunity'), value: 'Other', icon: <LuCircleDot /> },
];
