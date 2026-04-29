import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Setup from "@/pages/Setup";
import Dashboard from "@/pages/Dashboard";
import Process from "@/pages/Process";
import Tool from "@/pages/Tool";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Docs from "@/pages/Docs";
import SplashScreen from "@/components/SplashScreen";
import { useEffect, useRef, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});

function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<"idle" | "out" | "in">("idle");
  const prevLocationRef = useRef(location);

  useEffect(() => {
    if (location !== prevLocationRef.current) {
      prevLocationRef.current = location;
      setTransitionState("out");
      const t1 = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionState("in");
      }, 120);
      const t2 = setTimeout(() => setTransitionState("idle"), 280);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setDisplayChildren(children);
      return undefined;
    }
  }, [location, children]);

  return (
    <div style={{
      opacity: transitionState === "out" ? 0 : 1,
      transform: transitionState === "out" ? "translateY(6px)" : "translateY(0)",
      transition: transitionState === "out"
        ? "opacity 120ms ease, transform 120ms ease"
        : "opacity 200ms ease, transform 200ms ease",
    }}>
      {displayChildren}
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return null;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/dashboard");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) return <SplashScreen />;
  return <Component />;
}

function AppRoutes() {
  const { isLoading } = useAuth();
  const [location] = useLocation();

  // Hold the splash for the entire bootstrap so we don't briefly flash the
  // login or any public page before redirecting authenticated users.
  if (isLoading) return <SplashScreen />;

  return (
    <PageTransition key={location}>
      <Switch>
        <Route path="/login" component={() => <PublicRoute component={Login} />} />
        <Route path="/register" component={() => <PublicRoute component={Register} />} />
        <Route path="/setup" component={() => <ProtectedRoute component={Setup} />} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/process" component={() => <ProtectedRoute component={Process} />} />
        <Route path="/tool" component={() => <ProtectedRoute component={Tool} />} />
        <Route path="/history" component={() => <ProtectedRoute component={History} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route path="/docs" component={() => <ProtectedRoute component={Docs} />} />
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route component={() => <Redirect to="/dashboard" />} />
      </Switch>
    </PageTransition>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}
