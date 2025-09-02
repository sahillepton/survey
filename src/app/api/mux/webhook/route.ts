
import { createClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { Mux } from "@mux/mux-node"

const mux = new Mux({
    tokenId: "7f1ca50f-349b-464a-95b2-73fa0751925b",
    tokenSecret: "MdHABlNRtlqfKmcL3p6W90iK3+ZWMh9OhoxN0D3THJoWAAcbIiCTNIECZjcCEJfDUPH85fPnGHe",
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);
    const supabase = await createClient();

    switch (event.type) {
      case "video.upload.ready":
        const { data, error } = await supabase.from("assets").select("*").eq("asset_id", event.object.id).single();
        if (error) {
          console.error("Error fetching asset:", error);
        }
        if (data) {
          await supabase.from("videos").update({ mux_playback_id: `https://stream.mux.com/${event.playback_ids[0].id}.m3u8` }).eq("id", data.video_id);
        }
        break;
      case "video.asset.errored":
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
