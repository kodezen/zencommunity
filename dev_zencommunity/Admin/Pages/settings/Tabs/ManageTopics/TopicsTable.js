import React from 'react';
import { __ } from '@wordpress/i18n';
import { Table } from '../../../../Components/ui';

const TopicsTable = () => {
  return (
    <div className="tw-mt-2.5 tw-max-h-[calc(100vh-351px)] tw-overflow-y-auto tw-rounded-md tw-border tw-border-solid tw-border-zc-border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{__("Title", "zencommunity")}</Table.ColumnHeader>
            <Table.ColumnHeader>{__("Groups", "zencommunity")}</Table.ColumnHeader>
            <Table.ColumnHeader className="tw-text-right">{__("Admin only", "zencommunity")}</Table.ColumnHeader>
            <Table.ColumnHeader className="tw-text-right">{__("Actions", "zencommunity")}</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {items.map((item, index) => (
            <Table.Row key={`${item.id}-${index}`}>
              <Table.Cell>{item.title}</Table.Cell>
              <Table.Cell>{item.groups}</Table.Cell>
              <Table.Cell className="tw-text-right">{String(item.admin_only)}</Table.Cell>
              <Table.Cell className="tw-text-right"></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
};

const items = [
  { id: 1, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 2, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 3, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 4, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
  { id: 5, title: "Demo title", groups: "Demo Group", admin_only: false },
]

export default TopicsTable;
