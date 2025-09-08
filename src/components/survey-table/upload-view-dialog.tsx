"use client";
import { UploadIcon, VideoIcon, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUppyWithSupabase } from "@/hooks/useUppyWithSupabase";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

import { Dashboard } from "@uppy/react";
const UploadViewDialog = ({
  isVideoUploaded,
  surveyId,
  videos,
}: {
  isVideoUploaded: boolean;
  surveyId: string;
  videos: {
    id: string;
    mux_playback_id: string;
    url: string;
  }[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);

  const uppy = useUppyWithSupabase({
    bucketName: "videos",
    folder: surveyId,
    accessToken: null,
    surveyId: surveyId,
  });

  const handleUploadComplete = async (surveyId: string, fileName: string) => {
    const toastId = toast.loading("Processing upload...");
    try {
      const publicUrl = `https://bharatnet.survey.rio.software/storage/v1/object/public/videos/${surveyId}/${fileName}`;

      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .insert({
          name: fileName,
          url: publicUrl,
          survey_id: surveyId,
        })
        .select()
        .single();

      if (videoError) throw videoError;
      const { error: surveyError } = await supabase
        .from("surveys")
        .update({
          video_id: videoData.id,
          is_video_uploaded: true,
        })
        .eq("id", surveyId);

      if (surveyError) throw surveyError;

      queryClient.invalidateQueries({ queryKey: ["surveys"] });

      toast.success("Video uploaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Error processing upload:", error);
      toast.error("Failed to process upload", { id: toastId });
    }
  };

  const handleComplete = useCallback(
    (result: any) => {
      setIsUploading(false);
      if (result.successful?.length > 0) {
        const uploadedFile = result.successful[0];
        handleUploadComplete(surveyId, uploadedFile.name);
      }
    },
    [surveyId, handleUploadComplete]
  );

  const handleError = useCallback((file: any, error: any) => {
    setIsUploading(false);
    console.error("Upload error:", error);
  }, []);

  const handleUploadStart = useCallback(() => {
    setIsUploading(true);
  }, []);

  useEffect(() => {
    uppy.on("upload", handleUploadStart);
    return () => {
      uppy.off("upload", handleUploadStart);
    };
  }, [uppy, handleUploadStart]);

  useEffect(() => {
    uppy.on("complete", handleComplete);
    return () => {
      uppy.off("complete", handleComplete);
    };
  }, [uppy, handleComplete]);

  useEffect(() => {
    uppy.on("upload-error", handleError);
    return () => {
      uppy.off("upload-error", handleError);
    };
  }, [uppy, handleError]);

  const { mutate: deleteVideo } = useMutation({
    mutationKey: ["delete-video", surveyId],
    mutationFn: async (surveyId: string) => {
      await supabase
        .from("surveys")
        .update({ video_id: null })
        .eq("id", surveyId);

      await supabase.from("videos").delete().eq("survey_id", surveyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setOpen(false);
      toast.success("Video deleted successfully!");
    },
  });

  const isVideo = videos.length > 0;

  console.log(isVideo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs px-3 py-1 rounded-md flex items-center gap-1"
          >
            {isVideoUploaded ? (
              <>
                <VideoIcon className="w-4 h-4" />
                View Video
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                Upload Video
              </>
            )}
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className={`${isVideo ? "block" : "hidden"}`}>
          <DialogTitle>Uploaded Video</DialogTitle>
          <DialogDescription>Uploaded video files.</DialogDescription>
        </DialogHeader>

        {!isVideoUploaded && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <Dashboard
              uppy={uppy}
              hideProgressDetails={false}
              proudlyDisplayPoweredByUppy={false}
              height={200}
              width="100%"
              showRemoveButtonAfterComplete={false}
              theme="light"
              showLinkToFileUploadResult={false}
            />
          </div>
        )}

        {videos.length > 0 && isVideo && (
          <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 hover:shadow-md transition-all duration-300">
            {videos.map((f, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-1 text-sm border-b last:border-b-0 gap-2 cursor-pointer"
                onClick={() => {
                  router.push(
                    `https://geotagvideo.vercel.app/video/${surveyId}`
                  );
                }}
              >
                <video
                  className="w-12 h-12 object-cover rounded"
                  controls={false}
                >
                  <source src={f.url} type="video/mp4" />
                </video>

                <button
                  type="button"
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVideo(surveyId);
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadViewDialog;
