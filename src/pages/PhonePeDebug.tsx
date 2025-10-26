import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PhonePeDebug() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testAmount, setTestAmount] = useState('1');

  const testConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://admin.cuephoria.in/api/phonepe/test');
      const data = await response.json();
      setTestResults({ type: 'config', data });
      if (data.ok) {
        toast.success('✅ PhonePe configuration is working!');
      } else {
        toast.error('❌ PhonePe configuration has issues');
      }
    } catch (error) {
      setTestResults({ type: 'config', error: error.message });
      toast.error('❌ Failed to test configuration');
    } finally {
      setLoading(false);
    }
  };

  const testPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://admin.cuephoria.in/api/phonepe/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(testAmount) })
      });
      const data = await response.json();
      setTestResults({ type: 'payment', data });
      
      if (data.ok && data.url) {
        toast.success('✅ Test payment created! Redirecting to PhonePe...');
        // Open in new tab for testing
        window.open(data.url, '_blank');
      } else {
        toast.error('❌ Test payment creation failed');
      }
    } catch (error) {
      setTestResults({ type: 'payment', error: error.message });
      toast.error('❌ Failed to create test payment');
    } finally {
      setLoading(false);
    }
  };

  const testReturnHandler = () => {
    const testUrl = `https://admin.cuephoria.in/api/phonepe/debug-return?merchantTransactionId=TEST123&status=success&code=SUCCESS`;
    window.open(testUrl, '_blank');
    toast.info('🧪 Opening return handler test page');
  };

  const testActualReturnHandler = () => {
    const testUrl = `https://admin.cuephoria.in/api/phonepe/return?merchantTransactionId=TEST123&status=success&code=SUCCESS`;
    window.open(testUrl, '_blank');
    toast.info('🧪 Testing actual return handler');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🔧 PhonePe Debug Center</h1>
          <p className="text-gray-400">Test and debug your PhonePe integration</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">1. Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Check if your PhonePe environment variables and OAuth are working.
              </p>
              <Button 
                onClick={testConfiguration} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Testing...' : 'Test Configuration'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">2. Test Payment Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-gray-300">Test Amount (₹)</Label>
                <Input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="mt-1 bg-black/30 border-white/10 text-white"
                  min="1"
                  max="1000"
                />
              </div>
              <Button 
                onClick={testPayment} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Test Payment'}
              </Button>
              <p className="text-xs text-gray-500">
                This will create a real PhonePe payment and redirect to their page.
                Use ₹1 for testing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">3. Test Return Handler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Test if your return handler is working with mock data.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={testReturnHandler}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Test Debug Return Handler
                </Button>
                <Button 
                  onClick={testActualReturnHandler}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  Test Actual Return Handler
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">4. Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Check browser console and network tab for detailed logs.
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Open browser DevTools (F12)</p>
                <p>• Check Console tab for logs</p>
                <p>• Check Network tab for API calls</p>
                <p>• Look for PhonePe API responses</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {testResults && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">
                Test Results: {testResults.type === 'config' ? 'Configuration' : 'Payment'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/30 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <a 
            href="/public/booking" 
            className="text-cuephoria-purple hover:underline"
          >
            ← Back to Booking Page
          </a>
        </div>
      </div>
    </div>
  );
}
