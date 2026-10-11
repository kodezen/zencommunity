import { Button, HStack, Text } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { __ } from '@wordpress/i18n';
import { google_auth_uri } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';

const LoginWithGoogle = () => {


  return (
      <Button
        onClick={() => window.location.href = google_auth_uri}
        variant="outline"
        borderColor="#CCD1FF"
        borderRadius="md"
        w="100%"
        py={5}
        
      >
        <HStack spacing={3}>
          <FcGoogle size="20px" />
          <ZCLabel label={__('Login with Google', 'zencommunity')} />
            
         
        </HStack>
      </Button>
    )
};

export default LoginWithGoogle;
