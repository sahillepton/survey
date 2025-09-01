import { z } from "zod";

// 1. Define schema for your env variables
export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().min(1, {message : "Email is required"}),
  password: z.string().min(6, {message : "Password must be at least 6 characters long"}),
});

export type LoginSchema = z.infer<typeof loginSchema>;


export type LoginState = {
    error : {
        email? : string[];
        password? : string[];
    } | null;
    success ?: boolean;
}  | undefined


export type User = {
  user_id: string,
  username: string,
  email: string,
  role: string,
  location: string | null,
  manager_id: string | null,
  password: string
}


export type Survey = {
  gps_track_id : string | null,
  gps_tracks : {
    id : string,
    duration : string,
    name : string
  },
  id : string,
  is_video_uploaded : string,
  name : string,
  timestamp : string,
  video_id : string | null,
  videos : {
    id : string,
    mux_playback_id : string,
    url : string
  }[],
  hasMore : boolean
}