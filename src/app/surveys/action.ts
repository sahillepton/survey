"use server";

import { Survey } from "@/lib/definitions";
import { createClient } from "@/lib/supabase";

export const getSurveys = async (
  role: string,
  userId: string,
  page: number = 1,
  search?: string,
  uploadStatus?: "All" | "Uploaded" | "Not Uploaded",
  dateRangeStart?: Date | null,
  dateRangeEnd?: Date | null
): Promise<{ data: Survey[]; count: number }> => {
  const supabase = await createClient();
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let baseQuery = supabase.from("surveys").select("id", { count: "exact" });

  if (role === "manager") {
    baseQuery = baseQuery.eq("user_id", userId).eq("manager_id", userId);
  } else if (role !== "admin") {
    baseQuery = baseQuery.eq("user_id", userId);
  }

  if (search && search.trim() !== "") {
    baseQuery = baseQuery.ilike("name", `${search.trim()}%`);
  }

  if (uploadStatus === "Uploaded") {
    baseQuery = baseQuery.eq("is_video_uploaded", true);
  } else if (uploadStatus === "Not Uploaded") {
    baseQuery = baseQuery.eq("is_video_uploaded", false);
  }

  if (dateRangeStart && dateRangeEnd) {
    const start = new Date(dateRangeStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(dateRangeEnd);
    end.setHours(23, 59, 59, 999);

    baseQuery = baseQuery.gte("timestamp", start.toISOString()).lte("timestamp", end.toISOString());
  }

  let dataQuery = supabase
    .from("surveys")
    .select(`
      id, name, timestamp, is_video_uploaded,
      videos (id, name, url, mux_playback_id),
      gps_tracks (id, name, duration)
    `)
    .order("timestamp", { ascending: false })
    .range(from, to);

  if (role === "manager") {
    dataQuery = dataQuery.eq("user_id", userId).eq("manager_id", userId);
  } else if (role !== "admin") {
    dataQuery = dataQuery.eq("user_id", userId);
  }
  if (search && search.trim() !== "") dataQuery = dataQuery.ilike("name", `${search.trim()}%`);
  if (uploadStatus === "Uploaded") dataQuery = dataQuery.eq("is_video_uploaded", true);
  if (uploadStatus === "Not Uploaded") dataQuery = dataQuery.eq("is_video_uploaded", false);
  if (dateRangeStart && dateRangeEnd) {
    const start = new Date(dateRangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRangeEnd);
    end.setHours(23, 59, 59, 999);
    dataQuery = dataQuery.gte("timestamp", start.toISOString()).lte("timestamp", end.toISOString());
  }


  const [countResult, dataResult] = await Promise.all([
    baseQuery,
    dataQuery
  ]);

  if (countResult.error) throw countResult.error;
  if (dataResult.error) throw dataResult.error;

  const { count } = countResult;
  const { data } = dataResult;


  return {
    data: data as unknown as Survey[],
    count: count ?? 0,
  };
};
