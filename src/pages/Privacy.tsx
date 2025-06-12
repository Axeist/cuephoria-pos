
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

const Privacy: React.FC = () => {
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
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-gray-300">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
            <p>
              Cuephoria may collect personal information including but not limited to name, contact details, 
              and payment information when you register or book our services.
            </p>
            <p>
              We also collect usage data such as gaming preferences, session duration, and purchase history 
              to improve our services and customize your experience.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
            <p>
              We use collected information to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process bookings and payments</li>
              <li>Personalize your gaming experience</li>
              <li>Communicate regarding services and promotions</li>
              <li>Improve our facilities and offerings</li>
              <li>Maintain security and prevent fraud</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Information Sharing</h2>
            <p>
              We do not sell or rent your personal information to third parties. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service providers who assist in our operations</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your explicit consent</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
              <li>Lodge a complaint with relevant authorities</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Changes to Privacy Policy</h2>
            <p>
              Cuephoria reserves the right to update this privacy policy at any time. Changes will be posted on our website, 
              and your continued use of our services after such modifications constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
        
        <div className="mt-12 flex justify-center">
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

export default Privacy;
