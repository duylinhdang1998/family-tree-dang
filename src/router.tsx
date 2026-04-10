import { createBrowserRouter, Navigate } from 'react-router-dom'
import { App } from './App'
import { AuthGate } from './components/AuthGate'
import { HomePage } from './pages/HomePage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { ViewPage } from './pages/ViewPage'

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        path: '/admin',
        element: (
          <AuthGate>
            <HomePage />
          </AuthGate>
        ),
      },
      { path: '/login', element: <LoginPage /> },
      {
        path: '/settings',
        element: (
          <AuthGate>
            <SettingsPage />
          </AuthGate>
        ),
      },
      { path: '/view/:slug', element: <ViewPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
