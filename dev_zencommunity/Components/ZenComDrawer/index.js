import React from 'react';
import { __ } from '@wordpress/i18n';
import { Button, CloseButton, Drawer, Portal, Separator, Text } from '@chakra-ui/react';
import { useStyles } from '../../utils/chakra';

const ZenComDrawer = ({
  children,
  placement = "end",
  title,
  triggerContent = __("Open", "zencommunity"),
  triggerClassname,
  size,
  clearBtnClassname,
  clearBtnTitle = "Clear",
  saveBtnClassname,
  saveBtnTitle = "Save changes",
  isHeader = true,
  isFooter = false,
  bodyPadding = "6px",
  marginTop = "0",
  width,
  closerPositionTop = "16px",
  closerPositionRight = "",
  defaultOpen = false,
  backdrop = true,
  isClose = true,
}) => {
  const { primaryBtn, secondaryBtn } = useStyles();
  return (
    <Drawer.Root placement={placement} size={size} defaultOpen={defaultOpen}>
      <Drawer.Trigger asChild>
        <Button {...triggerClassname}>
          {triggerContent}
        </Button>
      </Drawer.Trigger>
      <Portal>
        {backdrop && <Drawer.Backdrop />}
        <Drawer.Positioner margin={marginTop}>
          <Drawer.Content width={width} background={'var(--zencom-background)'} color={'var(--zencom-font-color)'}>
            {isHeader ? (
              <>
                <Drawer.Header p={6}>
                  <Text
                    color='var(--zencom-font-color)'
                    fontSize='14px'
                    marginBottom="0px"
                    padding="0"
                  >
                    {title}
                  </Text>
                </Drawer.Header>

                <Separator size="sm" borderColor="var(--zencom-border-color)" />
              </>
            ) : (
              null
            )}

            <Drawer.Body padding={bodyPadding}>
              {children}
            </Drawer.Body>

            {isFooter && (
              <Drawer.Footer>
                <Button {...secondaryBtn} {...clearBtnClassname}>{__(`${clearBtnTitle}`, "zencommunity")}</Button>
                <Button {...primaryBtn} {...saveBtnClassname}>{__(`${saveBtnTitle}`, "zencommunity")}</Button>
              </Drawer.Footer>
            )}

            {isClose ? (
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" top={closerPositionTop} right={closerPositionRight} />
              </Drawer.CloseTrigger>
            ) : (
              null
            )}
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};

export default ZenComDrawer;