import React from 'react';
import { Box, Flex, Separator, } from '@chakra-ui/react';
import Select from '@Components/ReactSelect';
import PostCard from '@Components/PostCard/PostCard';
import { __ } from '@wordpress/i18n';
import Posts from '@Components/Posts';
import { current_logged_user } from '@Utils/helper';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { createTicket, fetchMemberTickets, fetchTickets, getTicketAllConversations } from '@Redux/slices/ticketSlice/ticketSlice';
import ZenComLoader from '@Components/ZenComLoader';
import NoDataPost from '@Components/NoDataPost';
import { useState } from 'react';
import TicketCard from '@Components/PostCard/TicketCard';
import { createFeedPost } from '@Redux/slices/feedSlice/feedSlice';

const sortBy = [
  { label: "Latest", value: "Latest" },
  { label: "Date", value: "vue" },
]

const Ticket = ({ RecentActivities, activeSections, isCurrentUser }) => {
  // const memberTickets = useSelector(state => state.tickets.memberTickets);
  const tickets = useSelector(state => state.tickets);
  const [loading, setLoading] = useState();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchTickets());
  }, [dispatch]);

  const onSubmitHandler = async (values, actions, setSelectedTab, selectedTab) => {
    try {
      actions.setSubmitting(true);
      let formData = {
        content: values.content,
        title: values.title,
        meta: values.meta
      }

      if (values?.add_media_ids?.length > 0) {
        formData = {
          ...formData,
          add_media_ids: values?.add_media_ids
        }
      }

      if (selectedTab === "post") {
        await dispatch(createFeedPost({ group_id: values.group_id, formData: formData })).unwrap();
        actions.setValues({
          group_id: 0,
          title: "",
          content: "",
          status: "published",
          meta: {},
        });
      } else if (selectedTab === "tickets") {
        const payload = {
          title: values.title,
          content: values.content,
          product_id: values.product_id,
          type_id: values.type_id,
          priority_id: values.priority_id,
        };

        await dispatch(createTicket(payload)).unwrap();
        actions.setValues({
          title: "",
          content: "",
          product_id: 0,
          type_id: 0,
          priority_id: 0,
        });
      }
      actions.resetForm();
      setSelectedTab(null);
    } catch (error) {
      console.error("Form submission failed:", error);
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Flex mt="24px" gap={{ base: "0", md: "0", lg: "20px" }}>
      <Flex width={{ base: "100%", md: "100%", lg: "70%" }} direction={"column"} gap={"20px"}>
        <Box flex="1" maxWidth="100%">
          {activeSections && (
            <Flex flexDirection="column" gap={"16px"} borderRadius="4px" background="var(--zencom-background)" p={"20px"} marginBottom={6} width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "block", md: "block", lg: "none" }}>
              <RecentActivities />
            </Flex>
          )}

          {isCurrentUser && <Posts onSubmitHandler={onSubmitHandler} />}

          <TicketCard isCurrentUser={isCurrentUser} />
        </Box>
      </Flex>

      <Flex flexDirection="column" gap={"16px"} borderRadius="4px" background="var(--zencom-background)" p={"20px"} height="fit-content" width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "none", md: "none", lg: "block" }}>
        <RecentActivities />
      </Flex>
    </Flex>
  )
}

export default Ticket;
