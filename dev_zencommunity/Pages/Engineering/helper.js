import React from "react";
import { Box } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";

export const STATUSES = ["open", "in-progress", "fixed", "released", "wontfix", "duplicate"];
export const PRIORITIES = ["low", "medium", "high", "critical"];

export const STATUS_COLORS = {
    open: "#738496",
    "in-progress": "#2A3BEE",
    fixed: "#0F9D58",
    released: "#0F9D58",
    wontfix: "#A2ADB9",
    duplicate: "#A2ADB9",
};

export const PRIORITY_COLORS = {
    low: "#738496",
    medium: "#2A3BEE",
    high: "#E08600",
    critical: "#E2483D",
};

export const fieldStyle = {
    width: "100%",
    fontSize: "14px",
    border: "1px solid var(--zencom-border-color)",
    borderRadius: "4px",
    padding: "8px 10px",
    background: "var(--zencom-background)",
    color: "var(--zencom-font-color)",
    outline: "none",
};

export const labelTxt = (v) => String(v || "").replace("-", " ");

export const Chip = ({ value, colorMap }) => {
    const color = (colorMap && colorMap[value]) || "#738496";
    return (
        <Box
            as="span"
            fontSize="12px"
            fontWeight="600"
            textTransform="capitalize"
            color={color}
            bg={`color-mix(in srgb, ${color} 16%, transparent)`}
            borderRadius="999px"
            padding="3px 12px"
            whiteSpace="nowrap"
            display="inline-block"
            lineHeight="1.4"
        >
            {labelTxt(value)}
        </Box>
    );
};

export const StatusBadge = ({ status }) => <Chip value={status} colorMap={STATUS_COLORS} />;
export const PriorityBadge = ({ priority }) => <Chip value={priority} colorMap={PRIORITY_COLORS} />;
