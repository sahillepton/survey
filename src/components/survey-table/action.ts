"use server"

import { createClient } from "@/lib/supabase";
import { Mux } from "@mux/mux-node"

const mux = new Mux({
    tokenId: "7f1ca50f-349b-464a-95b2-73fa0751925b",
    tokenSecret: "MdHABlNRtlqfKmcL3p6W90iK3+ZWMh9OhoxN0D3THJoWAAcbIiCTNIECZjcCEJfDUPH85fPnGHe",
});


export const uploadToMux = async (surveyId : string, videoId : string, publicUrl : string) => {
    try {
        const supabase = await createClient();
        console.log(publicUrl, "publicUrl");
       
        const asset = await mux.video.assets.create({
            inputs : [{url: publicUrl}],
            playback_policies : ["public"],
        })
        console.log(asset.id, "asset");

        await supabase.from("assets").insert({
            video_id : videoId,
            asset_id : asset.id
        })

        return {
            success : true,
            message : "Video uploaded to Mux",
            assetId : asset.id
        }
    } catch(error) {
        console.log(error);
    }
}   