import React from 'react';
import { __ } from '@wordpress/i18n';
import { PrimaryButton } from '../../../../Components/ui';
import ZCLabel from '../../../../Components/Label';
import ZenComTopBar from '../../../../Components/ZenComTopBar';
import Select from 'react-select';
import SocialLinksCustomization from './SocialLinksCustomization';
import { current_logged_user, getAddonActiveStatus, namespace } from '@Utils/helper';
import { useFormikContext } from 'formik';
import { useSelector } from 'react-redux';
import Subtext from '../../../../Components/Subtext';
import Checkbox from '../../../../Components/FormikToggle';

const baseSortOptions = [
  { label: __("Latest", 'zencommunity'), value: "created_at" },
  { label: __("Title", 'zencommunity'), value: "title" },
  { label: __("Like", 'zencommunity'), value: "like_count" },
  { label: __("Comment", 'zencommunity'), value: "comment_count" },
  { label: __("Trending", 'zencommunity'), value: "trending" },
];

const Customization = () => {
  const { values, setFieldValue, dirty, submitForm } = useFormikContext();
  const activeAddons = useSelector(state => state?.addons?.activeAddons);
  const showFollow = getAddonActiveStatus(activeAddons, "FollowerAndBlocker") && !!current_logged_user;
  const groupDataSortBy = showFollow
    ? [
        ...baseSortOptions,
        { label: __("From Followings", 'zencommunity'), value: "from_followers" },
      ]
    : baseSortOptions;

  return (
    <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
      <>
        <ZenComTopBar
          isStickyScroll={true}
          title={__("Community Feeds Settings", "zencommunity")}
          subtitle={__("Adjust feed sorting, posting permissions, and profile visibility.", "zencommunity")}
          rightContent={
            <PrimaryButton onClick={submitForm} disabled={!dirty} >
              {__("Save changes", "zencommunity")}
            </PrimaryButton>
          }
        />

        <ZenComTopBar
          title={__("Community Preferences: ", "zencommunity")}
          subtitle={__("Define default behaviors and profile options for your community.", "zencommunity")}
          titleSize="16px"
          subtitleSize="sm"
          subtitleWeight="normal"
          marginBottom="16px"
          padding="0"
          borderBottomWidth="0"
        />

        <div className="tw-flex tw-flex-col tw-gap-5 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
          <div className="tw-flex tw-w-full tw-items-center tw-justify-between">
            <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
              <ZCLabel type='basic' label={__("Default Feed Sort By", "zencommunity")} />
              <Subtext>
                  {__("Set the default order of posts in the community feed.", "zencommunity")}
              </Subtext>
            </div>
            <Select
              options={groupDataSortBy}
              placeholder={__('Sort by', 'zencommunity')}
              className="zen-com-select zen-com-select--180"
              classNamePrefix="zen-com-select"
              value={groupDataSortBy.find(item => item?.value === values?.feed?.default_sort_by)}
              onChange={option => {
                setFieldValue('feed.default_sort_by', option.value)
              }}
            />
            {/* <Select
              options={userProfile}
              placeholder={__('Select...', 'zencommunity')}
              className="zen-com-select zen-com-select--164"
              classNamePrefix="zen-com-select"
            /> */}
          </div>

          <Checkbox
            title={__("Show placeholder image for missing covers", "zencommunity")}
            subtitle={__("Show a blurred placeholder when a group or profile has no cover image set. Turn off to show nothing instead.", "zencommunity")}
            name="feed.show_cover_placeholder"
            defaultValue={true}
          />

          {/* <Flex justifyContent="space-between" alignItems={{ base: "start", sm: "start", md: "center" }} width="100%">
            <VStack align="start" spacing={1}>
              <ZCLabel type='basic' label={__("Post title requirements", "zencommunity")} />
              <ZCLabel type="simple" color='#738496' label={__("When creating a new post, check if the post title is required or not", "zencommunity")} />
            </VStack>
            <RadioGroup.Root colorPalette="blue" defaultValue="optional">
              <Flex gap="6" flexWrap="wrap" justifyContent="flex-end">
                {items.map((item) => (
                  <RadioGroup.Item key={item.value} value={item.value}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText color="var(--zencom-font-color)">{item.label}</RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </Flex>
            </RadioGroup.Root>
          </Flex> */}

          <div className="tw-flex tw-w-full tw-items-center tw-justify-between">
            <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
              <span className="tw-text-sm tw-font-medium tw-leading-5 tw-text-zc-fg">
                {__("Enable Social Platforms for Sharing.", "zencommunity")}
              </span>
              <Subtext>
                {__("Add the social networks you want to enable for sharing your feed posts.", "zencommunity")}
              </Subtext>
            </div>

            <SocialLinksCustomization/>

            {/* <ZenComDrawer
              title={__("Profile social media links", "zencommunity")}
              triggerClassname={{ bg: "transparent", color: "var(--zencom-font-color)", border: "1px solid var(--zencom-border-color)" }}
              triggerContent={__("Customize", "zencommunity")} size={"md"}
              isFooter={true}
              bodyPadding="0"
            >
              <Box p="24px" background={'var(--zencom-background)'} color={'var(--zencom-font-color)'}>
                <Flex
                  direction="column"
                  gap="12px"
                  border="1px solid var(--zencom-border-color)" borderRadius="4px"
                >
                  {socialLinks?.map((item) => (
                    <Flex
                      key={item?.value}
                      alignItems="center"
                      gap="12px"
                      p="16px"
                      borderBottom="1px solid var(--zencom-border-color)"
                    >
                      <GripIcon cursor="pointer" />
                      <Icon w="24px" h="24px">
                        {item.icon}
                      </Icon>
                      <CheckBoxAndSwitch
                        label={item?.label}
                        width="100%"
                      />
                    </Flex>
                  ))}
                </Flex>
              </Box>
            </ZenComDrawer> */}
          </div>

          {/* <Flex justifyContent="space-between" alignItems="center" width="100%">
            <VStack align="start" spacing={1}>
              <Text
                color='var(--zencom-font-color)'
                fontSize={'14px'}
                fontWeight={'500'}
                lineHeight={"20px"}
              >
                {__("Customize Login/Signup Form", "zencommunity")}
              </Text>
              <Text
                color='#738496'
                fontSize={'14px'}
                fontWeight={'500'}
                lineHeight={"20px"}
              >
                {__("Customize your login and registration form settings", "zencommunity")}
              </Text>
            </VStack>
            <Button borderColor="var(--zencom-border-color)" variant="outline" bg="transparent" color="var(--zencom-font-color)" disabled={true}>
              {__('Customize', 'zencommunity')}
            </Button>
          </Flex> */}
        </div>
      </>
    </div>
  );
};

export default Customization;
