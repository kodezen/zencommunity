import { __, sprintf } from '@wordpress/i18n';
import { Box, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { current_logged_user, global_roles, theme_settings } from '@Utils/helper';

const Views = ({ selectedTicket, setSelectedTicket, totalTickets, stats }) => {
  const isAdminOrSupportAgent = current_logged_user?.is_site_admin || global_roles?.support_agent;
  const selectedItem = localStorage.getItem("selectedTicket")
  const isThemeDark = theme_settings?.theme_mode === "dark";

  const ticketsData = [
    {
      label: __('All tickets', 'zencommunity'), value: 'all-tickets',
      count: stats?.total || stats?.you
    },
    ...(isAdminOrSupportAgent
      ? [
        {
          label: __('Your assigned tickets', 'zencommunity'), value: 'assigned-tickets',
          count: stats?.assigned
        },
        {
          label: __('Unassigned tickets', 'zencommunity'), value: 'unassigned-tickets',
          count: stats?.not_assigned
        },
      ]
      : []),
    {
      label: __('All unresolved tickets', 'zencommunity'), value: 'unresolved-tickets',
      count: stats?.all_unresolved
    },
    // { label: __('Deleted tickets', 'zencommunity'), value: 'deleted-tickets', count: 0, color: 'red.500', activeBg: 'red.50' },
  ];

  return (
    <Flex direction="column" gap={2}>
      {ticketsData.map((ticket) => {
        const isActive = selectedTicket === ticket.value;
        return (
          <Flex
            key={ticket.value}
            px="4"
            py="2"
            align="center"
            justify="space-between"
            cursor="pointer"
            fontSize="sm"
            borderRadius="4px"
            onClick={() => {
              setSelectedTicket(ticket.value)
              localStorage.setItem("selectedTicket", ticket.value)
            }}
            className={`zencom-menu zencom-menu--${isActive ? 'active' : 'inactive'}`}
          >
            <ZCLabel
              // translators: %s: ticket?.label
              label={sprintf(
                __('%s', 'zencommunity'),
                ticket?.label
              )}
              type="subTitle"
              fontWeight="500"
              fontSize="14px"
              color={isActive ? 'var(--zencom-primary-color)' : 'color-mix(in srgb, var(--zencom-font-color) 70%, transparent)'}
            />
            <ZCLabel
              // translators: %s: ticket.count
              label={sprintf(
                __('%s', 'zencommunity'),
                ticket?.count
              )}
              type="subTitle"
              fontWeight="500"
              fontSize="14px"
              color={isActive ? 'var(--zencom-primary-color)' : 'color-mix(in srgb, var(--zencom-font-color) 70%, transparent)'}
            />
          </Flex>
        );
      })}
    </Flex>
  );
};

export default Views;