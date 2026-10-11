import { HStack, Skeleton, Table } from '@chakra-ui/react';
import React from 'react';

const TableLoader = ({ tableHeaders }) => {
  return (
    <Table.ScrollArea>
      <Table.Root size="sm" variant="striped">
        <Table.Header bg="var(--zencom-background)">
          <Table.Row>
            <Table.ColumnHeader p="10px 14px">
              <Skeleton height="18px" width="18px" rounded="md" />
            </Table.ColumnHeader>

            {tableHeaders.map((header, idx) => (
              <Table.ColumnHeader key={idx} p="14px 12px">
                <Skeleton height="14px" width="80px" />
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {[...Array(3)].map((_, grpIndex) => (
            <React.Fragment key={grpIndex}>
              {/* Skeleton Group Header */}
              <Table.Row bg="var(--zencom-background)">
                <Table.Cell p="8px 14px">
                  <Skeleton height="18px" width="18px" rounded="md" />
                </Table.Cell>
                <Table.Cell colSpan={7} p={3}>
                  <Skeleton height="16px" width="120px" />
                </Table.Cell>
              </Table.Row>

              {/* Skeleton Table Rows */}
              {[...Array(1)].map((__, rowIndex) => (
                <Table.Row key={rowIndex} bg="var(--zencom-background)" borderBottom="1px solid var(--zencom-border-color)">
                  {/* Checkbox */}
                  <Table.Cell p="10px 14px">
                    <Skeleton height="18px" width="18px" rounded="md" />
                  </Table.Cell>

                  {/* ID + Type */}
                  <Table.Cell p="10px 14px">
                    <HStack spacing={2}>
                      <Skeleton height="14px" width="40px" />
                      <Skeleton height="20px" width="60px" rounded="md" />
                    </HStack>
                  </Table.Cell>

                  {/* Status Badge */}
                  <Table.Cell p="10px 14px">
                    <Skeleton height="20px" width="60px" rounded="md" />
                  </Table.Cell>

                  {/* Subject */}
                  <Table.Cell p="14px 12px">
                    <Skeleton height="14px" width="160px" />
                  </Table.Cell>

                  {/* Posted By */}
                  <Table.Cell p="14px 12px">
                    <Skeleton height="14px" width="80px" />
                  </Table.Cell>

                  {/* Requested */}
                  <Table.Cell p="14px 12px">
                    <Skeleton height="14px" width="70px" />
                  </Table.Cell>

                  {/* Product */}
                  <Table.Cell p="14px 12px">
                    <Skeleton height="14px" width="100px" />
                  </Table.Cell>

                  {/* Assignees */}
                  <Table.Cell p="14px 12px">
                    <HStack spacing="-6px">
                      {[1, 2, 3].map((avatar, i) => (
                        <Skeleton
                          key={i}
                          height="28px"
                          width="28px"
                          rounded="full"
                        />
                      ))}
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </React.Fragment>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
};

export default TableLoader;