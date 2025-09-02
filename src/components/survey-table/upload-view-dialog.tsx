"use client";
import PQueue from "p-queue";
import { UploadIcon, VideoIcon, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Image from "next/image";
import { useState } from "react";
import { uploadToMux } from "./action";
import { supabase } from "@/lib/supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  preview?: string;
  type: "video" | "audio";
  status?: "pending" | "uploading" | "done" | "error";
}

const queue = new PQueue();

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
    name: string;
  }[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const queryClient = useQueryClient();

  // --- Delete video mutation ---
  const { mutate: deleteVideo } = useMutation({
    mutationKey: ["delete-video", surveyId],
    mutationFn: async (surveyId: string) => {
      await supabase
        .from("surveys")
        .update({ video_id: null })
        .eq("id", surveyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setOpen(false);
    },
  });

  // --- Upload video mutation (background) ---
  const uploadMutation = useMutation({
    mutationKey: ["upload-video", surveyId],
    mutationFn: async (file: File) => {
      const filePath = `${surveyId}/${file.name}`;
      await supabase.storage.from("test").upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

      const {
        data: { publicUrl },
      } = supabase.storage.from("test").getPublicUrl(filePath);

      const { data: videoData } = await supabase
        .from("videos")
        .insert({
          name: file.name,
          url: publicUrl,
          survey_id: surveyId,
        })
        .select()
        .single();

      await supabase
        .from("surveys")
        .update({ video_id: videoData.id, is_video_uploaded: "true" })
        .eq("id", surveyId);

      await uploadToMux(surveyId, videoData.id, publicUrl);

      return videoData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  const isVideo = videos.length > 0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const newFiles: UploadedFile[] = Array.from(event.target.files).map(
      (file) => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "audio",
        status: "pending",
      })
    );

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    files.forEach((f, idx) => {
      // immediately mark as uploading
      setFiles((prev) =>
        prev.map((file, i) =>
          i === idx ? { ...file, status: "uploading" } : file
        )
      );

      queue.add(() => {
        uploadMutation.mutate(f.file, {
          onSuccess: () => {
            setFiles((prev) =>
              prev.map((file, i) =>
                i === idx ? { ...file, status: "done" } : file
              )
            );
            toast.success(`Upload successful for ${f.file.name}`);
          },
          onError: () => {
            setFiles((prev) =>
              prev.map((file, i) =>
                i === idx ? { ...file, status: "error" } : file
              )
            );
            toast.error(`Upload failed for ${f.file.name}`);
          },
        });
      });
    });
  };

  const isUploading = files.some((f) => f.status === "uploading");

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
        <DialogHeader>
          <DialogTitle>
            {isVideo ? "Uploaded Video" : "Upload Video?"}
          </DialogTitle>
          <DialogDescription>
            {isVideo ? "Uploaded video files." : "Upload video files."}
          </DialogDescription>
        </DialogHeader>

        {/* File picker */}
        {!isVideo && (
          <div className="mt-4 bg-gray-11 flex items-center justify-center p-[50px] rounded-md border-3 border-dashed border-gray-9 hover:bg-gray-200 transition-all duration-300 hover:border-gray-400">
            <div>
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Image
                  src="/select-file.png"
                  alt=""
                  width={80}
                  height={80}
                  className="w-20 h-20"
                />
                <p className="text-purple-600 text-xs font-semibold">
                  Select File
                </p>
              </label>
              <input
                type="file"
                accept=".mp3,.wav,.mp4"
                id="file-upload"
                className="hidden"
                multiple
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {/* Existing uploaded videos */}
        {videos.length > 0 && isVideo && (
          <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 hover:shadow-md transition-all duration-300">
            {videos.map((f, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-1 text-sm border-b last:border-b-0 gap-2 cursor-pointer"
                onClick={() => {
                  router.push(
                    `https://geo-tagged-video-poc.vercel.app/video/${surveyId}`
                  );
                }}
              >
                <video
                  className="w-12 h-12 object-cover rounded"
                  controls={false}
                >
                  <source src={f.url} type="video/mp4" />
                </video>

                <p>{f.name}</p>

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

        {/* Files being uploaded */}
        {files.length > 0 && !isVideo && (
          <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
            {files.map((f, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-1 text-sm border-b last:border-b-0 gap-2"
              >
                {f.type === "video" ? (
                  <video
                    src={f.preview}
                    className="w-12 h-12 object-cover rounded"
                    controls={false}
                  />
                ) : (
                  <VideoIcon className="w-8 h-8 text-gray-400" />
                )}

                <div className="flex-1 truncate">{f.file.name}</div>
                <span className="text-gray-400 text-xs">
                  {(f.file.size / 1024 / 1024).toFixed(2)} MB
                </span>

                {f.status === "uploading" && (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                )}
                {f.status === "done" && (
                  <span className="text-green-600 text-xs">✔</span>
                )}
                {f.status === "error" && (
                  <span className="text-red-600 text-xs">✖</span>
                )}

                {f.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {!isVideo && (
          <DialogFooter>
            <Button
              disabled={files.length === 0 || isUploading}
              onClick={handleUpload}
            >
              Upload
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UploadViewDialog;
