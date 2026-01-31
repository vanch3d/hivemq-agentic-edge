import { Box, Input, Table, Text } from "@chakra-ui/react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface ChatTableProps {
  /** Array of objects to render as rows */
  data: Record<string, unknown>[];
  /** Max rows per page (default 10) */
  pageSize?: number;
}

/**
 * Generic table for rendering query results inside the chat drawer.
 * Auto-generates columns from object keys and provides search, sort, and pagination.
 */
export function ChatTable({ data, pageSize = 10 }: ChatTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columnHelper = createColumnHelper<Record<string, unknown>>();

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map((key) =>
      columnHelper.accessor((row) => row[key], {
        id: key,
        header: key,
        cell: (info) => {
          const val = info.getValue();
          if (val === null || val === undefined) return "—";
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        },
      }),
    );
  }, [data, columnHelper]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  if (data.length === 0) {
    return (
      <Text fontSize="xs" color="fg.muted">
        {t("chat.noResults")}
      </Text>
    );
  }

  return (
    <Box fontSize="xs" w="full">
      <Input
        size="xs"
        placeholder={t("chat.tableSearch")}
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        mb="1"
      />
      <Box overflowX="auto">
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.ColumnHeader
                    key={header.id}
                    cursor={header.column.getCanSort() ? "pointer" : "default"}
                    onClick={header.column.getToggleSortingHandler()}
                    whiteSpace="nowrap"
                    px="1"
                    py="1"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{ asc: " ↑", desc: " ↓" }[
                      header.column.getIsSorted() as string
                    ] ?? ""}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map((row) => (
              <Table.Row key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    px="1"
                    py="0.5"
                    maxW="200px"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      {table.getPageCount() > 1 && (
        <Box display="flex" justifyContent="space-between" mt="1">
          <Text color="fg.muted">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
          </Text>
          <Box display="flex" gap="1">
            <Text
              as="button"
              cursor="pointer"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              color={table.getCanPreviousPage() ? "fg" : "fg.muted"}
            >
              ←
            </Text>
            <Text
              as="button"
              cursor="pointer"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              color={table.getCanNextPage() ? "fg" : "fg.muted"}
            >
              →
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
