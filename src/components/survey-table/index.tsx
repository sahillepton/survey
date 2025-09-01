// @ts-nocheck
"use client";

import { getSurveys } from "@/app/surveys/action";
import { Survey, User } from "@/lib/definitions";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { DataTable } from "./data-table";
import { ColumnDef } from "@tanstack/react-table";
import { startTransition, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  BadgeCheckIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  SearchIcon,
} from "lucide-react";
import {
  Pagination,
  PaginationLink,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../ui/pagination";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import UploadViewDialog from "./upload-view-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";

const SurveyTable = ({ user }: { user: User }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "All" | "Uploaded" | "Not Uploaded"
  >("All");
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(
    undefined
  );
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined);

  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [
      "surveys",
      page,
      debouncedSearch,
      uploadStatus,
      dateRangeStart,
      dateRangeEnd,
    ],
    queryFn: () =>
      getSurveys(
        user.role,
        user.user_id,
        page,
        debouncedSearch,
        uploadStatus,
        dateRangeStart,
        dateRangeEnd
      ),
    enabled: !!user.user_id,
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });

  const surveys = data?.data as Survey[] | undefined;

  useEffect(() => {
    if (!data || isPlaceholderData) return;
    const totalPages = Math.ceil((data.count || 0) / 10);
    if (page < totalPages) {
      startTransition(() => {
        queryClient.prefetchQuery({
          queryKey: [
            "surveys",
            page + 1,
            debouncedSearch,
            uploadStatus,
            dateRangeStart,
            dateRangeEnd,
          ],
          queryFn: () =>
            getSurveys(
              user.role,
              user.user_id,
              page + 1,
              debouncedSearch,
              uploadStatus,
              dateRangeStart,
              dateRangeEnd
            ),
        });
      });
    }
  }, [
    page,
    data,
    debouncedSearch,
    uploadStatus,
    dateRangeStart,
    dateRangeEnd,
    queryClient,
    user.role,
    user.user_id,
  ]);

  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const columns: ColumnDef<Survey>[] = [
    {
      accessorKey: "name",
      header: () => <div className="text-center">Name</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="text-sm px-2 py-1 rounded-md truncate"
          >
            {row.original.name}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: () => <div className="text-center">Duration</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge
            variant="secondary"
            className="text-sm px-2 py-1 rounded-md flex items-center gap-1"
          >
            <ClockIcon className="w-3 h-3" />
            {formatSeconds(Number(row.original.gps_tracks.duration))}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: () => <div className="text-center">Timestamp</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="text-sm px-2 py-1 rounded-md flex items-center gap-1"
          >
            <CalendarIcon className="w-3 h-3" />
            {row.original.timestamp}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "is_video_uploaded",
      header: () => <div className="text-center">Video</div>,
      cell: ({ row }) => {
        const isUploaded = row.original.videos.length > 0;
        return (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={`${
                isUploaded
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              } text-sm px-2 py-1 rounded-md flex items-center gap-1`}
            >
              <BadgeCheckIcon className="w-3 h-3" />
              {isUploaded ? "Uploaded" : "Not Uploaded"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "uploads",
      header: () => <div className="text-center">Uploads</div>,
      cell: ({ row }) => (
        <UploadViewDialog
          isVideoUploaded={row.original.videos.length > 0}
          surveyId={row.original.id}
          videos={row.original.videos}
        />
      ),
    },
  ];

  const getPageNumbers = () => {
    if (!data) return [];
    const pages: (number | "...")[] = [];
    const totalPages = Math.ceil((data.count || 0) / 10);
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) pages.push(1, 2, 3, 4, "...", totalPages);
      else if (page >= totalPages - 2)
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      else pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className="container py-6 max-w-[1200px] mx-auto">
      <div className="mb-4 w-full flex justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-md w-64 h-8 p-2 bg-[#f4f4f5]">
            <SearchIcon size={16} />
            <Input
              type="search"
              placeholder="Search for route name"
              className="border-none ring-none shadow-none focus:ring-0 focus:outline-none focus:border-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setDateRangeStart(undefined);
                setDateRangeEnd(undefined);
              }}
              className="h-8 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 h-8">
          <Select
            value={uploadStatus}
            onValueChange={(value) =>
              setUploadStatus(value as "All" | "Uploaded" | "Not Uploaded")
            }
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              {uploadStatus}
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Uploaded">Uploaded</SelectItem>
              <SelectItem value="Not Uploaded">Not Uploaded</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-4">
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date-picker"
                    className="w-32 justify-between font-normal"
                  >
                    {dateRangeStart
                      ? dateRangeStart.toLocaleDateString()
                      : "Start date"}
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dateRangeStart}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setDateRangeStart(date);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date-picker"
                    className="w-32 justify-between font-normal"
                  >
                    {dateRangeEnd
                      ? dateRangeEnd.toLocaleDateString()
                      : "End date"}
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dateRangeEnd}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setDateRangeEnd(date);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={surveys || []}
        isFetching={isLoading}
      />

      <p className="text-sm text-gray-500 mt-1 text-center">
        {data?.count || 0} results found
      </p>
      <div className="flex items-center justify-center py-4 mt-4">
        <Pagination>
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((prev) => Math.max(prev - 1, 1));
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {getPageNumbers().map((num, idx) => (
              <PaginationItem key={idx}>
                {num === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Number(num));
                    }}
                    isActive={num === page}
                  >
                    {num}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const totalPages = Math.ceil((data?.count || 0) / 10);
                  setPage((prev) => Math.min(prev + 1, totalPages));
                }}
                className={
                  page >= Math.ceil((data?.count || 0) / 10)
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

export default SurveyTable;
