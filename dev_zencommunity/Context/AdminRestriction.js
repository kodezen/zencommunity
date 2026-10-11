import React, { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";
import ZenComLoader from "@Components/ZenComLoader";
import { site_url, current_user_can, community_path } from "@Utils/helper";

export default function AdminRestriction({ children }) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!current_user_can?.manage_options) {
            window.location.href = site_url + community_path;
        } else {
            setLoading(false);
        }
    }, []);

    // @TODO: Fix the loading width and UI
    if (loading) {
        return (
            <Box width="100%" margin="auto">
                <ZenComLoader maxW={{ base: "100%", md: "100%", lg: "600px" }} margin="20px auto" />
            </Box>
        );
    }

    return <>{children}</>;
}
