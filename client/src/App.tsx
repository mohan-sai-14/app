import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/ui/theme-toggle";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import { useEffect } from "react";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user && location !== "/") {
        setLocation("/");
      } else if (user) {
        if (location === "/") {
          if (user.role === "admin") {
            setLocation("/admin");
          } else {
            setLocation("/student");
          }
        }
      }
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Login} />
      {/* Handle exact admin route */}
      <Route path="/admin">
        {(params) => <AdminDashboard />}
      </Route>
      {/* Handle admin subroutes like /admin/something */}
      <Route path="/admin/:tab">
        {(params) => <AdminDashboard />}
      </Route>
      {/* Handle exact student route */}
      <Route path="/student">
        {(params) => <StudentDashboard />}
      </Route>
      {/* Handle student subroutes like /student/something */}
      <Route path="/student/:tab">
        {(params) => <StudentDashboard />}
      </Route>
      <Route path="/:rest*">
        {(params) => <NotFound />}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
