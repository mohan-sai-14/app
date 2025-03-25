
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu } from "lucide-react";

export function Navigation({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex h-screen">
      {/* Navigation sidebar */}
      <div className={`${isOpen ? 'w-64' : 'w-0'} bg-background border-r transition-all duration-300 overflow-hidden`}>
        {children}
      </div>

      {/* Toggle button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-4 left-4 lg:flex"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Main content */}
      <div className="flex-1">
        <div className="container mx-auto p-4">
          {/* Your page content goes here */}
        </div>
      </div>
    </div>
  );
}
