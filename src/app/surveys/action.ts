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

  // Base query with count
  let baseQuery = supabase
    .from("surveys")
    .select(
      `
      *,
      videos (id, name, url, mux_playback_id),
      gps_tracks (id, name, duration)
    `,
      { count: "exact" }
    )
    .order("timestamp", { ascending: false });

  // Role-based filtering
  if (role === "manager") {
    baseQuery = baseQuery.eq("user_id", userId).eq("manager_id", userId);
  } else if (role !== "admin") {
    baseQuery = baseQuery.eq("user_id", userId);
  }

  // Search filtering
  if (search && search.trim() !== "") {
    baseQuery = baseQuery.ilike("name", `%${search.trim()}%`);
  }

  if (uploadStatus === "Uploaded") {
    baseQuery = baseQuery.eq("is_video_uploaded", "true");
  } else if (uploadStatus === "Not Uploaded") {
    baseQuery = baseQuery.eq("is_video_uploaded", "false");
  }

  if (dateRangeStart && dateRangeEnd) {
    const start = new Date(dateRangeStart);
    start.setHours(0, 0, 0, 0); // start of the day
  
    const end = new Date(dateRangeEnd);
    end.setHours(23, 59, 59, 999); // end of the day
  
    baseQuery = baseQuery.gte("timestamp", start.toISOString()).lte("timestamp", end.toISOString());
  }
  

  // First, get count
  const { count, error: countError } = await baseQuery;
  if (countError) throw countError;

  // Only apply range if there’s enough rows
  let query = baseQuery;
  if (from < (count ?? 0)) {
    query = query.range(from, to);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    data: data as unknown as Survey[],
    count: count ?? 0,
  };
};
