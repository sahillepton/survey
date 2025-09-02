import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const HomePage = async () => {
  const cookieStore = await cookies();
  const user = cookieStore.get("user")?.value;

  if (!user) {
    redirect("/login");
  }

  redirect("/surveys");
};

export default HomePage;
