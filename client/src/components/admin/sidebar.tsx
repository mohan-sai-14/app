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

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();

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
        "w-64 bg-white dark:bg-background shadow-md fixed left-0 top-0 bottom-0 transform transition-transform z-20 pt-16",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                className={cn(
                  "flex items-center w-full justify-start",
                  isActive(item.path) 
                    ? "bg-primary text-primary-foreground" 
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsOpen(false);
                  }
                }}
                asChild
              >
                <Link href={item.path}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
