
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

const ShippingAndDelivery: React.FC = () => {
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
        <h1 className="text-3xl font-bold mb-8">Shipping and Delivery Policy</h1>
        
        <div className="space-y-8 text-gray-300">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Service Delivery</h2>
            <p>
              Cuephoria operates as a gaming lounge and rental facility. Our services are delivered on-site at our physical location. 
              We do not ship physical products or equipment to customer addresses.
            </p>
            <p>
              All gaming sessions, equipment rentals, and services must be accessed at our premises located at Cuephoria Gaming Lounge.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Booking Fulfillment</h2>
            <p>
              When you make a booking through our website or booking system:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your booking is confirmed immediately upon successful payment</li>
              <li>You will receive a confirmation notification with booking details</li>
              <li>Services are available at the scheduled time slot you selected</li>
              <li>You must arrive at our premises to access your booked services</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Equipment Availability</h2>
            <p>
              All gaming equipment, including PlayStation 5 consoles, VR headsets, and 8-ball pool tables, are available on-site only. 
              Equipment is maintained and serviced regularly to ensure optimal performance during your rental period.
            </p>
            <p>
              Equipment availability is subject to prior bookings and maintenance schedules. We recommend booking in advance to secure 
              your preferred time slot and equipment.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Service Access</h2>
            <p>
              To access your booked services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Arrive at our premises at your scheduled time</li>
              <li>Present your booking confirmation (digital or printed)</li>
              <li>Our staff will assist you in accessing your booked station or equipment</li>
              <li>Services begin at the scheduled start time and end at the scheduled end time</li>
            </ul>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. No Physical Shipping</h2>
            <p>
              Cuephoria does not offer shipping or delivery services for any physical products or equipment. All services must be 
              accessed at our physical location. We do not ship gaming consoles, controllers, or any other equipment to customer addresses.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Digital Services</h2>
            <p>
              While we do not ship physical items, certain digital services such as tournament registrations, membership activations, 
              and booking confirmations are delivered electronically via email or SMS upon successful payment.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Changes to This Policy</h2>
            <p>
              Cuephoria reserves the right to update this shipping and delivery policy at any time. Changes will be posted on our website, 
              and your continued use of our services after such modifications constitutes acceptance of the updated policy.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">8. Contact for Questions</h2>
            <p>
              If you have any questions about our shipping and delivery policy, please contact us at:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Phone: +91 86376 25155</li>
              <li>Email: contact@cuephoria.in</li>
              <li>Visit us at our premises during business hours (11:00 AM - 11:00 PM)</li>
            </ul>
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

export default ShippingAndDelivery;

