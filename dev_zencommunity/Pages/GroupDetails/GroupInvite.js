import React from 'react';
import { personAdd, personJoined } from '../../../assets/staticIcons';
import { __ } from '@wordpress/i18n';
import { Button, Icon, useBreakpointValue } from '@chakra-ui/react';
import { useStyles } from '../../utils/chakra';

const GroupInvite = ({ setInviteModal }) => {
    const { primaryBtnInsideContent } = useStyles();
    const isMobile = useBreakpointValue({ base: true, md: false });

    return (
        <>
            <Button
                {...primaryBtnInsideContent}
                onClick={() => setInviteModal(true)}
            >
                <Icon as={personAdd} size="sm" /> {__('Invite', 'zencommunity')}
            </Button>

            <Button
                size="sm"
                background="transparent"
                border="1px solid var(--zencom-border-color)"
                color="var(--zencom-font-color)"
                cursor="default"
            >
                <Icon as={personJoined} size="sm" /> {!isMobile ? __('Already joined', 'zencommunity') : null}
            </Button>
        </>
    );
};

export default GroupInvite;
