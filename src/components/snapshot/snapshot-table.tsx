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

interface SnapshotTableProps {
  data: Record<string, unknown>[];
}

export function SnapshotTable({ data }: SnapshotTableProps) {
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
          if (val === null || val === undefined) return "\u2014";
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        },
      }),
    );
  }, [data, columnHelper]);

  // eslint-disable-next-line react-hooks/incompatible-library
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
    initialState: { pagination: { pageSize: 25 } },
  });

  if (data.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted">
        {t("snapshot.noData")}
      </Text>
    );
  }

  return (
    <Box w="full">
      <Input
        size="sm"
        placeholder={t("chat.tableSearch")}
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        mb="3"
        maxW="320px"
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
                    px="2"
                    py="2"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{ asc: " \u2191", desc: " \u2193" }[
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
                    px="2"
                    py="1"
                    maxW="300px"
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
        <Box display="flex" justifyContent="space-between" mt="2">
          <Text fontSize="sm" color="fg.muted">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
          </Text>
          <Box display="flex" gap="2">
            <Text
              as="button"
              cursor="pointer"
              onClick={() => table.previousPage()}
              aria-disabled={!table.getCanPreviousPage()}
              color={table.getCanPreviousPage() ? "fg" : "fg.muted"}
            >
              {"\u2190"}
            </Text>
            <Text
              as="button"
              cursor="pointer"
              onClick={() => table.nextPage()}
              aria-disabled={!table.getCanNextPage()}
              color={table.getCanNextPage() ? "fg" : "fg.muted"}
            >
              {"\u2192"}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
