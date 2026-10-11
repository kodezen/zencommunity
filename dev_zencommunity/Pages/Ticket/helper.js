import { __, sprintf } from '@wordpress/i18n';
import { max_upload_size, max_image_upload_size } from '@Utils/helper';
import { FaBug, FaQuestionCircle, FaExchangeAlt } from 'react-icons/fa';
import { LuSend, LuTriangleAlert, LuCircleDashed, LuClock, LuCircleSlash, LuCircleCheck, LuPencil } from 'react-icons/lu';

export const normalize = (s) => String(s || '').trim().toLowerCase();

// Per-file upload limits, straight from the server (localized by
// includes/assets.php): WordPress's own upload limit for any file, and the
// plugin's image cap (Attachment::max_image_size_kb()). Each attachment is
// uploaded on its own, so these are checked per file before any upload starts.
export const MAX_FILE_SIZE = Number(max_upload_size) || 2 * 1024 * 1024;
export const MAX_IMAGE_SIZE = Math.min(Number(max_image_upload_size) || 2 * 1024 * 1024, MAX_FILE_SIZE);

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 || Number.isInteger(value) ? value : value.toFixed(1)} ${units[i]}`;
};

const isImageFile = (file) => String(file?.type || '').startsWith('image/');

/** Tooltip text for the attachment picker, using the live limits. */
export const attachmentLimitsHint = () =>
  MAX_IMAGE_SIZE === MAX_FILE_SIZE
    ? sprintf(
        __('Supports: images, pdf, docs, video, csv, zip, json. Up to %s per file.', 'zencommunity'),
        formatFileSize(MAX_FILE_SIZE)
      )
    : sprintf(
        __('Supports: images, pdf, docs, video, csv, zip, json. Images up to %1$s, other files up to %2$s each.', 'zencommunity'),
        formatFileSize(MAX_IMAGE_SIZE),
        formatFileSize(MAX_FILE_SIZE)
      );

/**
 * Merges newly-picked files into an already-staged list for a ticket
 * message/reply: sorted by filename (the OS file-picker's own multi-select
 * order isn't reliably alphabetical), and rejects the whole batch - keeping
 * what was already staged - if any new file is over its size limit.
 */
export const mergeAttachmentFiles = (existing, incoming) => {
  const tooBig = incoming.find((f) => (f?.size || 0) > (isImageFile(f) ? MAX_IMAGE_SIZE : MAX_FILE_SIZE));
  if (tooBig) {
    return {
      files: existing,
      error: sprintf(
        __('"%1$s" is %2$s, which is over the %3$s limit for this file type.', 'zencommunity'),
        tooBig.name,
        formatFileSize(tooBig.size),
        formatFileSize(isImageFile(tooBig) ? MAX_IMAGE_SIZE : MAX_FILE_SIZE)
      ),
    };
  }
  const combined = [...existing, ...incoming];
  combined.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  return { files: combined, error: null };
};

export const getPriorityChip = (priority) => {
  switch (normalize(priority)) {
    case 'urgent':
      return { color: '#C9372C', label: __('URGENT', 'zencommunity') };
    case 'high':
      return { color: '#EA580C', label: __('High', 'zencommunity') };
    case 'normal':
      return { color: '#2A3BEE', label: __('Normal', 'zencommunity') };
    case 'low':
      return { color: '#38414A', label: __('Low', 'zencommunity') };
    default:
      return { color: '#2A3BEE', label: __(priority || 'Normal', 'zencommunity') };
  }
};

export const prettyStatus = (s = '') =>
  String(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const getTypePill = (typeLabel) => {
  const t = normalize(typeLabel);
  if (t.includes('bug')) return { color: '#C9372C', bg: '#FFECEB', icon: <FaBug /> };
  if (t.includes('feature')) return { color: '#1F845A', bg: '#DCFFF1', icon: <FaExchangeAlt /> };
  if (t.includes('ask') || t.includes('question')) return { color: '#1123DE', bg: '#EBEDFF', icon: <FaQuestionCircle /> };
  if (t.includes('refund')) return { color: '#92310A', bg: '#FFEDD5', icon: null };
  return { color: '#454F59', bg: '#E0E4E8', icon: null };
};

export const statusOptions = [
    { label: __('All', 'zencommunity'), value: 'all' },
    { label: __('New', 'zencommunity'), value: 'new' },
    { label: __('Open', 'zencommunity'), value: 'open' },
    { label: __('In progress', 'zencommunity'), value: 'in-progress' },
    { label: __('Waiting', 'zencommunity'), value: 'waiting' },
    { label: __('Closed', 'zencommunity'), value: 'closed' },
    { label: __('Resolved', 'zencommunity'), value: 'resolved' },
    { label: __('Draft', 'zencommunity'), value: 'draft' },
];

export const getStatusColor = (status) => {
  switch (normalize(status)) {
    case 'open': return '#E2483D';
    case 'in-progress': return '#E2B203';
    case 'new': return '#2A3BEE';
    case 'closed': return '#454F59';
    case 'resolved': return '#22A06B';
    case 'waiting': return '#E2483D';
    default: return '#454F59';
  }
};

/**
 * A status badge reads as a state ("where is this ticket right now"), not a
 * category - rendering it as the same solid, white-on-color block used for
 * the type/priority tags made it look like just another tag. This pairs the
 * same status color with a soft tint of itself for the background and the
 * border, so the outline + icon + text carries the meaning instead of a
 * heavy fill.
 */
export const getStatusStyle = (status) => {
  const color = getStatusColor(status);
  return { color, bg: `${color}1A`, border: `${color}66` };
};

export const getStatusIcon = (status) => {
  switch (normalize(status)) {
    case 'new': return LuSend;
    case 'open': return LuTriangleAlert;
    case 'in-progress': return LuCircleDashed;
    case 'waiting': return LuClock;
    case 'closed': return LuCircleSlash;
    case 'resolved': return LuCircleCheck;
    case 'draft': return LuPencil;
    default: return LuCircleDashed;
  }
};

/**
 * Every ticket filter at its default, in the argument shape handleQueryParams
 * takes.
 */
export const defaultFilterParams = {
    qpage: 1,
    qperPage: 10,
    qsearch: "",
    qstatus: "open",
    qproduct: 0,
    qtypeLabel: 0,
    qpriority: 0,
    qtime: "",
    qsupportStaff: 0,
    // Sorting was left out, so a reset put every filter back but kept whatever
    // order was chosen — and with the sort field's own clear button gone, the
    // row could not be fully returned to how it started.
    qorderBy: "",
    qorder: "",
};

/**
 * Put the filter row back to its defaults.
 *
 * Shared by the row's own reset and the one inside Advance filters, so the two
 * cannot drift into meaning different things.
 *
 * The chosen view survives a reset: "Your assigned tickets" is still assigned
 * to you afterwards, and "Unassigned tickets" still unassigned. Resetting
 * clears the filters someone set, not the list they are looking at.
 */
export const resetTicketFilters = ({
    setSearchParams,
    handleQueryParams,
    selectedTicket,
    currentUserId,
}) => {
    setSearchParams({});

    if ("assigned-tickets" === selectedTicket) {
        handleQueryParams({ ...defaultFilterParams, qsupportStaff: currentUserId });
        return;
    }

    if ("unassigned-tickets" === selectedTicket) {
        handleQueryParams({ ...defaultFilterParams, qsupportStaff: 0, qassigneeIdRelation: 'not_equal' });
        return;
    }

    if ("unresolved-tickets" === selectedTicket) {
        handleQueryParams({ ...defaultFilterParams, qunresolved: "true" });
        return;
    }

    handleQueryParams(defaultFilterParams);
};
