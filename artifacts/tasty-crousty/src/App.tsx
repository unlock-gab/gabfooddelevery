import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/lib/auth";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Customer
import Restaurants from "@/pages/customer/Restaurants";
import RestaurantDetail from "@/pages/customer/RestaurantDetail";
import Checkout from "@/pages/customer/Checkout";
import OrderTracking from "@/pages/customer/OrderTracking";
import Orders from "@/pages/customer/Orders";
import AddressBook from "@/pages/customer/AddressBook";
import CustomerProfile from "@/pages/customer/Profile";

// Restaurant dashboard
import RestaurantDashboard from "@/pages/restaurant/Dashboard";

// Driver dashboard
import DriverDashboard from "@/pages/driver/Dashboard";

// Admin panel
import AdminDashboard from "@/pages/admin/Dashboard";

import NotFound from "@/pages/not-found";

// Configure API base URL and auth token
// The generated API client already includes /api prefix in every path.
// In the browser the Vite proxy routes /api → localhost:8080, so no
// additional base URL prefix is needed.
setBaseUrl(import.meta.env.VITE_API_URL ?? null);
setAuthTokenGetter(() => localStorage.getItem("tc_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/login" component={Login} />
      <Route path="/connexion" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/inscription" component={Register} />

      {/* Customer routes */}
      <Route path="/restaurants" component={Restaurants} />
      <Route path="/restaurants/:restaurantId" component={RestaurantDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/orders/:orderId" component={OrderTracking} />
      <Route path="/account/addresses" component={AddressBook} />
      <Route path="/profile" component={CustomerProfile} />

      {/* Role dashboards */}
      <Route path="/dashboard" component={RestaurantDashboard} />
      <Route path="/restaurant" component={RestaurantDashboard} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/livreur" component={DriverDashboard} />
      <Route path="/admin" component={AdminDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
