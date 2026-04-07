import { Toaster } from "@/components/ui/sonner";
import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import ProfileSetupModal from "./components/ProfileSetupModal";
import StripeConfigurationSetup from "./components/StripeConfigurationSetup";
import { AuthProvider } from "./contexts/AuthContext";
import ChannelAnalyticsPage from "./pages/ChannelAnalyticsPage";
import ChannelPage from "./pages/ChannelPage";
import ChannelSettingsPage from "./pages/ChannelSettingsPage";
import CourseManagementPage from "./pages/CourseManagementPage";
import CoursePlayerPage from "./pages/CoursePlayerPage";
import FollowingPage from "./pages/FollowingPage";
import HomePage from "./pages/HomePage";
import MyChannelsPage from "./pages/MyChannelsPage";
import PaymentFailurePage from "./pages/PaymentFailurePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PlaylistEditPage from "./pages/PlaylistEditPage";
import PlaylistPlayerPage from "./pages/PlaylistPlayerPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import SearchPage from "./pages/SearchPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import UploadPage from "./pages/UploadPage";
import WatchPage from "./pages/WatchPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    },
  },
});

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload/$channelId",
  component: UploadPage,
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch/$videoId",
  component: WatchPage,
});

const channelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channel/$channelId",
  component: ChannelPage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});

const profileSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/profile",
  component: ProfileSettingsPage,
});

const myChannelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-channels",
  component: MyChannelsPage,
});

const followingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/following",
  component: FollowingPage,
});

const channelSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channel/$channelId/settings",
  component: ChannelSettingsPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscriptions",
  component: SubscriptionsPage,
});

const courseManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channel/$channelId/courses/manage",
  component: CourseManagementPage,
});

const coursePlayerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/course/$courseId/play",
  component: CoursePlayerPage,
});

const playlistsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playlists",
  component: PlaylistsPage,
});

const playlistEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playlist/$playlistId/edit",
  component: PlaylistEditPage,
});

const playlistPlayerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playlist/$playlistId/play",
  component: PlaylistPlayerPage,
});

const paymentSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-success",
  component: PaymentSuccessPage,
});

const paymentFailureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-failure",
  component: PaymentFailurePage,
});

const channelAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/channel/$channelId/analytics",
  component: ChannelAnalyticsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  uploadRoute,
  watchRoute,
  channelRoute,
  searchRoute,
  profileSettingsRoute,
  myChannelsRoute,
  followingRoute,
  channelSettingsRoute,
  subscriptionsRoute,
  courseManagementRoute,
  coursePlayerRoute,
  playlistsRoute,
  playlistEditRoute,
  playlistPlayerRoute,
  paymentSuccessRoute,
  paymentFailureRoute,
  channelAnalyticsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <InternetIdentityProvider>
            <AuthProvider>
              <RouterProvider router={router} />
              <Toaster />
              <ProfileSetupModal />
              <StripeConfigurationSetup />
            </AuthProvider>
          </InternetIdentityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
