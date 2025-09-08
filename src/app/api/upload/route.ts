import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const surveyId = formData.get("surveyId") as string;

    if (!file || !surveyId) {
      return new Response(JSON.stringify({ error: "Missing file or surveyId" }), { status: 400 });
    }

    const filePath = `${surveyId}/${file.name}`;

    
    const s3Client = new S3Client({
      region: "auto", 
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/test`,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!,
        secretAccessKey: "dummy",
      },
    });

    
    const parallelUpload = new Upload({
      client: s3Client,
      params: {
        Bucket: "test",   
        Key: filePath,    
        Body: file.stream(), 
      },
      leavePartsOnError: false,
    });

    await parallelUpload.done();

    
    const supabase = await createClient();
    const { data: { publicUrl } } = supabase.storage.from("test").getPublicUrl(filePath);

    return new Response(JSON.stringify({ publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
