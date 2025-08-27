"use client";

import { User } from "@/lib/definitions";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

const Header = ({ user }: { user: User }) => {
  const router = useRouter();
  const handleLogout = () => {
    // Add your logout logic here
    router.push("/login");
  };

  return (
    <div className="flex justify-between items-center p-4">
      <h1 className="text-2xl font-bold">Survey Management</h1>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent className="w-20 p-1" align="end">
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default Header;
