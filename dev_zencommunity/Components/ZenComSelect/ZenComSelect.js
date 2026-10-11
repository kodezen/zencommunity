import React from 'react';
import { Select, Portal, Flex, Text, Box } from '@chakra-ui/react';

const ZenComSelect = ({
    collection,
    label,
    placeholder,
    renderItem,
    ...props
}) => {
    return (
        <Select.Root multiple collection={collection} size="sm" width="100%" zIndex={1500} {...props}>
            <Select.HiddenSelect />
            <Select.Label>{label}</Select.Label>
            <Select.Control>
                <Select.Trigger>
                    <Select.ValueText placeholder={placeholder} />
                </Select.Trigger>
                <Select.IndicatorGroup>
                    <Select.Indicator />
                </Select.IndicatorGroup>
            </Select.Control>
            <Portal>
                <Select.Positioner>
                    <Select.Content>
                        {collection.items.map((item) => (
                            <Select.Item item={item} key={item.value}>
                                {renderItem ? renderItem(item) : (
                                    <Text fontSize="sm" fontWeight="semibold">{item.label}</Text>
                                )}
                                <Select.ItemIndicator />
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Positioner>
            </Portal>
        </Select.Root>
    );
};

export default ZenComSelect;
