"use server";
import { cookies } from "next/headers";

import { loginSchema, LoginState } from "@/lib/definitions";
import { prisma } from "@/lib/prisma";


export const loginAction = async (prevState: LoginState, formData: FormData) => {
  const email = formData.get("email");
  const password = formData.get("password");


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
       const user = await prisma.users.findUnique({
        where : {
            email : validatedData.data.email,
        }
       })

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