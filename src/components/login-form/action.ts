"use server";
import { cookies } from "next/headers";

import { loginSchema, LoginState } from "@/lib/definitions";
import {createClient} from "@/lib/supabase"


export const loginAction = async (prevState: LoginState, formData: FormData) => {
  const email = formData.get("email");
  const password = formData.get("password");

  const supabase = await createClient();


  const validatedData = loginSchema.safeParse({
    email,
    password,
  });


    if(!validatedData.success){
        return {
            error : validatedData.error.flatten().fieldErrors,
        }
    }

    try {
       const {data: user, error} = await supabase.from("users").select("*").eq("email", validatedData.data.email).single();

        if(!user){
            return {
                error : {
                    email : ["Invalid email address or password"],
                }
            }
        }


        const userData = user;


        const cookieStore = await cookies();

        cookieStore.set({
            name: "user",
            value: JSON.stringify(userData),
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 365 * 100,
        });
       


        return {
            success : true,
            error : null
        }


    } catch (error) {
        console.error(error);
        return {
            error : {
                password : ["An error occurred while logging in"],
            }
        }
    }

};