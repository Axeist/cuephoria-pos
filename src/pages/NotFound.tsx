
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <MobileLayout title="Page Not Found" showUser={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="text-8xl font-bold text-muted-foreground">404</div>
        <h1 className="text-2xl font-bold">Oops! Page not found</h1>
        <p className="text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button 
          onClick={() => navigate('/dashboard')}
          className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
        >
          <Home className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </MobileLayout>
  );
};

export default NotFound;
