import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bot } from "lucide-react";
import { User } from "@/lib/auth";

interface HeaderProps {
  user: User;
  onLogout: () => Promise<void>;
}

export default function StudentHeader({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-background shadow-md z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="h-5 w-5 text-primary mr-2" />
          <h1 className="text-lg font-semibold">Robotics Club</h1>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <div className="flex items-center space-x-2">
            <span className="hidden md:inline text-sm font-medium">{user.name}</span>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
