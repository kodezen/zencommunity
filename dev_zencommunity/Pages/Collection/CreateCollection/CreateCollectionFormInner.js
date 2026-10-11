import React from 'react';
import { useFormikContext } from 'formik';
import { Button, Flex, Field, Input, Tag, Textarea } from "@chakra-ui/react"
import { __ } from '@wordpress/i18n';
import { generateSlug } from '@Utils/helper';
import { useStyles } from '../../../utils/chakra';

const CreateCollectionFormInner = ({ setIsOpen }) => {
    const { submitForm, values, setFieldValue } = useFormikContext();
    const { commonInput, primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();

    return (
        <>
            <Flex flexDirection="column" gap={6}>
                <Field.Root required>
                    <Field.Label color="var(--zencom-font-color)">
                        {__('Collection name', 'zencommunity')} <Field.RequiredIndicator />
                    </Field.Label>
                    <Input
                        type='text'
                        placeholder={__('Enter your collection name', 'zencommunity')}
                        variant="outline"
                        defaultValue={values?.name}
                        onChange={(e) => {
                            setFieldValue('name', e.target.value)
                            setFieldValue('slug', generateSlug(e.target.value))
                        }}
                        {...commonInput}
                    />
                </Field.Root>

                <Field.Root>
                    <Field.Label color="var(--zencom-font-color)">
                        {__('Collection slug', 'zencommunity')}
                        <Tag.Root bg='gray.100' color="gray.800" padding="2px 8px" borderRadius="sm">
                            <Tag.Label>{__('Optional', 'zencommunity')}</Tag.Label>
                        </Tag.Root>
                    </Field.Label>
                    <Input
                        type='text'
                        placeholder={__('Enter Collection slug', 'zencommunity')}
                        variant="outline"
                        defaultValue={values?.slug}
                        onChange={(e) => {
                            setFieldValue('slug', generateSlug(e.target.value))
                        }}
                        {...commonInput}
                    />
                </Field.Root>

                <Field.Root>
                    <Field.Label color="var(--zencom-font-color)">
                        {__('Collection description', 'zencommunity')}
                    </Field.Label>
                    <Textarea
                        size="xl"
                        placeholder={__('Enter collection description', 'zencommunity')}
                        defaultValue={values?.description}
                        onChange={(e) => {
                            setFieldValue('description', e.target.value)
                        }}
                        {...commonInput}
                    />
                </Field.Root>
            </Flex>

            <Flex
                justifyContent="flex-end"
                gap={2}
                borderTop="1px solid var(--zencom-border-color)"
                paddingTop={5}
                marginTop={5}
            >
                <Button {...primaryBtnInsideContentTrans} onClick={() => setIsOpen(false)}>{__('Cancel', 'zencommunity')}</Button>

                <Button
                    onClick={() => { submitForm() }}
                    {...primaryBtnInsideContent}
                >
                    {__('Save', 'zencommunity')}
                </Button>
            </Flex>
        </>
    );
};

export default CreateCollectionFormInner;
