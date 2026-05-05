import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Stock from "@/pages/stock";
import Recipes from "@/pages/recipes";
import RecipeDetail from "@/pages/recipe-detail";
import Suggestions from "@/pages/suggestions";
import Shopping from "@/pages/shopping";
import Chat from "@/pages/chat";
import History from "@/pages/history";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/stock" component={Stock} />
        <Route path="/recipes" component={Recipes} />
        <Route path="/recipes/:id" component={RecipeDetail} />
        <Route path="/suggestions" component={Suggestions} />
        <Route path="/shopping" component={Shopping} />
        <Route path="/chat" component={Chat} />
        <Route path="/history" component={History} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
