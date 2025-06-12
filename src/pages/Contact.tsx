
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Mail, Clock, MapPin } from 'lucide-react';
import Logo from '@/components/Logo';
import { 
  Card, 
  CardContent,
} from '@/components/ui/card';

const Contact: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-cuephoria-dark text-white flex flex-col">
      {/* Header */}
      <header className="h-20 flex items-center px-6 border-b border-gray-800 backdrop-blur-sm bg-cuephoria-dark/80">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4 text-gray-400 hover:text-white" 
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
        </div>
      </header>
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">Contact Us</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="bg-cuephoria-darker border-gray-800">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-cuephoria-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Phone</h3>
              <a href="tel:+918637625155" className="text-gray-300 hover:text-white transition-colors">
                +91 86376 25155
              </a>
            </CardContent>
          </Card>
          
          <Card className="bg-cuephoria-darker border-gray-800">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-cuephoria-blue/20 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-cuephoria-blue" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email</h3>
              <a href="mailto:contact@cuephoria.in" className="text-gray-300 hover:text-white transition-colors">
                contact@cuephoria.in
              </a>
            </CardContent>
          </Card>
          
          <Card className="bg-cuephoria-darker border-gray-800">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-cuephoria-orange/20 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-cuephoria-orange" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Business Hours</h3>
              <p className="text-gray-300">11:00 AM - 11:00 PM</p>
              <p className="text-gray-400 text-sm mt-1">Every day</p>
            </CardContent>
          </Card>
          
          <Card className="bg-cuephoria-darker border-gray-800">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-cuephoria-green/20 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-cuephoria-green" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
              <p className="text-gray-300">
                Cuephoria Gaming Lounge
              </p>
              <a 
                href="https://maps.app.goo.gl/cuephoria" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cuephoria-purple hover:underline mt-2 text-sm"
              >
                View on Google Maps
              </a>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 flex justify-center">
          <Button 
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </div>
      </main>
      
      {/* Simple footer */}
      <footer className="py-6 border-t border-gray-800">
        <div className="text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Cuephoria. All rights reserved.</p>
          <p className="text-xs mt-1">Designed and developed by RK™</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
