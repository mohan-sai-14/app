import LoginForm from "@/components/login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-background">
      <LoginForm />
      
      <div className="mt-4 flex items-center">
        <span className="text-sm text-muted-foreground mr-2">Theme:</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
