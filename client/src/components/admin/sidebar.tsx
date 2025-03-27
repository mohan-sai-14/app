import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  QrCode, 
  ClipboardCheck, 
  Users, 
  FileText,
  TestTube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: string;
}

export default function Sidebar({ isOpen, setIsOpen, activeTab }: SidebarProps) {
  const [location] = useLocation();

  // Log state changes for debugging
  useEffect(() => {
    console.log("Sidebar isOpen state changed:", isOpen);
  }, [isOpen]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, setIsOpen]);

  const isActive = (path: string) => {
    if (path === "/admin" && location === "/admin") {
      return true;
    }
    return location.startsWith(path) && path !== "/admin";
  };

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: <LayoutDashboard className="mr-2 h-5 w-5" /> },
    { path: "/admin/qr-generator", label: "QR Generator", icon: <QrCode className="mr-2 h-5 w-5" /> },
    { path: "/admin/qr-test", label: "QR Test", icon: <TestTube className="mr-2 h-5 w-5" /> },
    { path: "/admin/attendance", label: "Attendance", icon: <ClipboardCheck className="mr-2 h-5 w-5" /> },
    { path: "/admin/students", label: "Students", icon: <Users className="mr-2 h-5 w-5" /> },
    { path: "/admin/reports", label: "Reports", icon: <FileText className="mr-2 h-5 w-5" /> },
  ];

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 w-[280px] transform transition-transform duration-200 ease-in-out",
        "border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <span className="font-medium">Menu</span>
        <Button
          variant="destructive"
          size="icon"
          className="inline-flex"
          onClick={() => setIsOpen(false)}
          aria-label="Close Sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant={isActive(item.path) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start text-base",
              isActive(item.path) && "bg-muted font-medium"
            )}
            asChild
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              }
            }}
          >
            <Link href={item.path} className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
