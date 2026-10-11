import { Popover, Portal } from "@chakra-ui/react";
import { useState } from "react";

const ZenComPopover = ({
  trigger,
  children,
  placement = "bottom-end",
  isOpen = false,
  onOpenChange,
  arrowIcon = false,
  size = "sm"
}) => {
  const [open, setOpen] = useState(isOpen);

  const handleOpenChange = (e) => {
    setOpen(e.open);
    if (onOpenChange) onOpenChange(e.open);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={handleOpenChange}
      positioning={{ placement }}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content 
            w={
              size === "xs" ? "200px" :
              size === "sm" ? "228px" :
              size === "md" ? "300px" :
              size === "lg" ? "400px" : "auto"
            }
          >
            {arrowIcon && <Popover.Arrow />}
            <Popover.Body p="0" bg="var(--zencom-background)">{children}</Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default ZenComPopover;
