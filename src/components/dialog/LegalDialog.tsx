import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LegalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'contact';
}

const LegalDialog: React.FC<LegalDialogProps> = ({ isOpen, onClose, type }) => {
  const getContent = () => {
    switch (type) {
      case 'terms':
        return {
          title: 'Terms and Conditions',
          content: (
            <div className="space-y-6 text-gray-300">
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">1. Acceptance of Terms</h3>
                <p className="text-sm">
                  By accessing and using Cuephoria's services, you agree to be bound by these Terms and Conditions. 
                  If you do not agree to these terms, please do not use our services.
                </p>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">2. Membership and Gaming Sessions</h3>
                <p className="text-sm">
                  Cuephoria provides gaming facilities and services on a pre-booking or walk-in basis, subject to availability.
                  Members may receive preferential rates and privileges as communicated in our membership plans.
                </p>
                <p className="text-sm">
                  All gaming sessions are charged according to our current rate card. Time extensions may be 
                  subject to availability and additional charges.
                </p>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">3. Conduct and Responsibilities</h3>
                <p className="text-sm">
                  Users must maintain appropriate conduct within our premises. Cuephoria reserves the right to refuse service 
                  to anyone engaging in disruptive, abusive, or inappropriate behavior.
                </p>
                <p className="text-sm">
                  Users are responsible for any damage caused to equipment, furniture, or fixtures through improper use.
                  Such damage may result in charges equivalent to repair or replacement costs.
                </p>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">4. Refunds and Cancellations</h3>
                <p className="text-sm">
                  Bookings may be cancelled or rescheduled at least 2 hours prior to the reserved time without penalty.
                  Late cancellations or no-shows may be charged a fee equivalent to 50% of the booking amount.
                </p>
                <p className="text-sm">
                  Refunds for technical issues or service interruptions will be assessed on a case-by-case basis by management.
                </p>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">5. Modifications to Terms</h3>
                <p className="text-sm">
                  Cuephoria reserves the right to modify these terms at any time. Changes will be effective immediately 
                  upon posting on our website or premises. Continued use of our services constitutes acceptance of modified terms.
                </p>
              </section>
            </div>
          )
        };

      case 'privacy':
        return {
          title: 'Privacy Policy',
          content: (
            <div className="space-y-6 text-gray-300">
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">1. Information We Collect</h3>
                <p className="text-sm">
                  Cuephoria may collect personal information including but not limited to name, contact details, 
                  and payment information when you register or book our services.
                </p>
                <p className="text-sm">
                  We also collect usage data such as gaming preferences, session duration, and purchase history 
                  to improve our services and customize your experience.
                </p>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">2. How We Use Your Information</h3>
                <p className="text-sm">We use collected information to:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Process bookings and payments</li>
                  <li>Personalize your gaming experience</li>
                  <li>Communicate regarding services and promotions</li>
                  <li>Improve our facilities and offerings</li>
                  <li>Maintain security and prevent fraud</li>
                </ul>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">3. Information Sharing</h3>
                <p className="text-sm">
                  We do not sell or rent your personal information to third parties. We may share information with:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Service providers who assist in our operations</li>
                  <li>Legal authorities when required by law</li>
                  <li>Business partners with your explicit consent</li>
                </ul>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">4. Your Rights</h3>
                <p className="text-sm">You have the right to:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Access your personal information</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Lodge a complaint with relevant authorities</li>
                </ul>
              </section>
              
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">5. Changes to Privacy Policy</h3>
                <p className="text-sm">
                  Cuephoria reserves the right to update this privacy policy at any time. Changes will be posted on our website, 
                  and your continued use of our services after such modifications constitutes acceptance of the updated policy.
                </p>
              </section>
            </div>
          )
        };

      case 'contact':
        return {
          title: 'Contact Us',
          content: (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="h-10 w-10 rounded-full bg-cuephoria-purple/20 flex items-center justify-center mb-3">
                      <Phone className="h-5 w-5 text-cuephoria-purple" />
                    </div>
                    <h4 className="font-semibold mb-2 text-white">Phone</h4>
                    <a href="tel:+918637625155" className="text-gray-300 hover:text-white transition-colors text-sm">
                      +91 86376 25155
                    </a>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="h-10 w-10 rounded-full bg-cuephoria-blue/20 flex items-center justify-center mb-3">
                      <Mail className="h-5 w-5 text-cuephoria-blue" />
                    </div>
                    <h4 className="font-semibold mb-2 text-white">Email</h4>
                    <a href="mailto:contact@cuephoria.in" className="text-gray-300 hover:text-white transition-colors text-sm">
                      contact@cuephoria.in
                    </a>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="h-10 w-10 rounded-full bg-cuephoria-orange/20 flex items-center justify-center mb-3">
                      <Clock className="h-5 w-5 text-cuephoria-orange" />
                    </div>
                    <h4 className="font-semibold mb-2 text-white">Business Hours</h4>
                    <p className="text-gray-300 text-sm">11:00 AM - 11:00 PM</p>
                    <p className="text-gray-400 text-xs mt-1">Every day</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-black/20 border-gray-700">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="h-10 w-10 rounded-full bg-cuephoria-green/20 flex items-center justify-center mb-3">
                      <MapPin className="h-5 w-5 text-cuephoria-green" />
                    </div>
                    <h4 className="font-semibold mb-2 text-white">Visit Us</h4>
                    <p className="text-gray-300 text-sm">Cuephoria Gaming Lounge</p>
                    <a 
                      href="https://maps.app.goo.gl/cuephoria" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cuephoria-purple hover:underline mt-2 text-xs"
                    >
                      View on Google Maps
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        };

      default:
        return { title: '', content: null };
    }
  };

  const { title, content } = getContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-black/90 backdrop-blur-md border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {content}
        </ScrollArea>
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LegalDialog;