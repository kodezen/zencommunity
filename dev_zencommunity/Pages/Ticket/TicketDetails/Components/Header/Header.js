import { Box } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import HeaderDesktop from "./HeaderDesktop";

const Header = ({
  ticketData,
  updatedSingleTicket,
  setReplyTo,
  ticketLoading,
  onPrev,
  onNext,
  canPrev,
  canNext,
}) => {
  return (
    <>
      <Box display={{ base: "none", sm: "none", md: "none", lg: "block", xl: "block" }} className="zencom-ticket-details-header">
        <HeaderDesktop
          ticketData={ticketData}
          updatedSingleTicket={updatedSingleTicket}
          setReplyTo={setReplyTo}
          ticketLoading={ticketLoading}
          onPrev={onPrev}
          onNext={onNext}
          canPrev={canPrev}
          canNext={canNext}
        />
      </Box>
    </>
  );
};

export default Header;
