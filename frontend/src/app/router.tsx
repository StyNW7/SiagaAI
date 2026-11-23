import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { PageLoader } from '@/components/common/data-state';
import { AppLayout } from '@/layouts/app-layout';
import { RouteError } from './error-boundary';

const LandingPage = lazy(() => import('@/pages/landing-page'));
const DashboardPage = lazy(() => import('@/pages/dashboard-page'));
const MapPage = lazy(() => import('@/pages/map-page'));
const MyRiskPage = lazy(() => import('@/pages/my-risk-page'));
const ActionPlanPage = lazy(() => import('@/pages/action-plan-page'));
const FamilyPage = lazy(() => import('@/pages/family-page'));
const CommunityPage = lazy(() => import('@/pages/community-page'));
const AlertsPage = lazy(() => import('@/pages/alerts-page'));
const ProfilePage = lazy(() => import('@/pages/profile-page'));
const SettingsPage = lazy(() => import('@/pages/settings-page'));
const AboutPage = lazy(() => import('@/pages/about-page'));
const AuthPage = lazy(() => import('@/pages/auth-page'));
const NotFoundPage = lazy(() => import('@/pages/not-found-page'));

const Standalone = () => (
  <Suspense fallback={<PageLoader className="min-h-safe-screen" />}>
    <Outlet />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <Standalone />,
        children: [
          { path: '/', element: <LandingPage /> },
          { path: '/auth', element: <AuthPage /> },
        ],
      },
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'map', element: <MapPage /> },
          { path: 'risk', element: <MyRiskPage /> },
          { path: 'action-plan', element: <ActionPlanPage /> },
          { path: 'family', element: <FamilyPage /> },
          { path: 'community', element: <CommunityPage /> },
          { path: 'alerts', element: <AlertsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'about', element: <AboutPage /> },
        ],
      },
      {
        element: <Standalone />,
        children: [{ path: '*', element: <NotFoundPage /> }],
      },
    ],
  },
]);
