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
interface UploadedFile {
  file: File;
  preview?: string;
  type: "video" | "audio";
  status?: "pending" | "uploading" | "done" | "error";
}

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
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const isUploading = files.some((f) => f.status === "uploading");
  const queryClient = useQueryClient();
  const { mutate: deleteVideo } = useMutation({
    mutationKey: ["upload-video"],
    mutationFn: async (videoId: string) => {
      const { data, error } = await supabase
        .from("videos")
        .update({ survey_id: null })
        .eq("id", videoId);
      console.log(data, "data");
      console.log(error, "error");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

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

  const uploadToSupabase = async (file: File) => {
    const filePath = `${surveyId}/${file.name}`;
    console.log(filePath, "filePath");

    const { data, error } = await supabase.storage
      .from("test")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    console.log(data, "data");
    console.log(error, "error");

    const {
      data: { publicUrl },
    } = supabase.storage.from("test").getPublicUrl(filePath);

    console.log(publicUrl, "publicUrl");

    const { data: videoData } = await supabase
      .from("videos")
      .insert({
        name: file.name,
        url: publicUrl,
        survey_id: surveyId,
      })
      .select()
      .single();
    console.log(videoData, "videoData");

    const result = await uploadToMux(surveyId, videoData.id, publicUrl);
    console.log(result, "result");
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        await uploadToSupabase(file.file);
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "error" } : f))
        );
      }
    }
  };

  return (
    <Dialog>
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
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>Upload audio or video files.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 bg-gray-11 flex items-center justify-center p-[50px] rounded-md border-3 border-dashed border-gray-9 hover:bg-gray-200 transition-all duration-300 hover:border-gray-400">
          <div>
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Image src="/select-file.png" alt="" width={80} height={80} />
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

        <p>Uploaded Videos</p>
        {videos.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
            {videos.map((f, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-1 text-sm border-b last:border-b-0 gap-2"
              >
                <video
                  src={f.url}
                  className="w-12 h-12 object-cover rounded"
                  controls={false}
                />

                <p>{f.name}</p>

                <button
                  type="button"
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => {
                    deleteVideo(f.id);
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p>Uploaded Files</p>

        {files.length > 0 && (
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
        <DialogFooter>
          <Button
            disabled={files.length === 0 || isUploading}
            onClick={handleUpload}
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadViewDialog;
