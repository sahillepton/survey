import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSurveys } from "./action";
import SurveyTable from "@/components/survey-table";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import Header from "@/components/header";

const SurveysPage = async () => {
  const cookieStore = await cookies();
  const user = cookieStore.get("user")?.value;
  if (!user) {
    redirect("/login");
  }
  const userData = await JSON.parse(user);
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["surveys"],
    queryFn: () => getSurveys(userData.role, userData.user_id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Header user={userData} />
      <SurveyTable user={userData} />
    </HydrationBoundary>
  );
};

export default SurveysPage;
