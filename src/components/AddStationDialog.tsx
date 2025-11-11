import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePOS } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { generateId } from '@/utils/pos.utils';

// Create a schema for station validation - allow custom type
const stationSchema = z.object({
  name: z.string().min(2, { message: 'Station name must be at least 2 characters.' }),
  type: z.string().min(1, { message: 'Please enter a station type.' }),
  hourlyRate: z.coerce.number()
    .min(10, { message: 'Rate must be at least ₹10.' })
    .max(5000, { message: 'Rate cannot exceed ₹5000.' })
});

type StationFormValues = z.infer<typeof stationSchema>;

interface AddStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddStationDialog: React.FC<AddStationDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { stations, setStations } = usePOS();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Existing station types for suggestions
  const existingTypes = Array.from(new Set(stations.map(s => s.type))).sort((a, b) => a.localeCompare(b));
  
  // Initialize the form
  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      type: 'ps5',
      hourlyRate: 100,
    },
  });

  // Watch the type field to conditionally change the label and pricing
  const selectedType = form.watch('type');

  const onSubmit = async (values: StationFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Enforce name and type to match
      const finalName = values.name.trim();
      const finalType = finalName;
      
      // Generate a proper UUID for the new station
      const stationId = crypto.randomUUID();
      
      // Create a new station object
      const newStation = {
        id: stationId,
        name: finalName,
        type: finalType,
        hourlyRate: values.hourlyRate,
        isOccupied: false,
        currentSession: null
      };
      
      // First add to Supabase
      const { error } = await supabase
        .from('stations')
        .insert({
          id: stationId,
          name: finalName,
          type: finalType,
          hourly_rate: values.hourlyRate,
          is_occupied: false
        });
      
      if (error) {
        console.error('Error adding station to Supabase:', error);
        toast({
          title: "Error",
          description: "Could not add the station to the database",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Then update local state
      setStations([...stations, newStation]);
      
      // Show success toast
      toast({
        title: "Station Added",
        description: `${finalName} has been added successfully.`,
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error in adding station:', error);
      toast({
        title: "Error",
        description: "Something went wrong while adding the station",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading gradient-text">Add New Station</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter station name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Keep type in sync with name
                        form.setValue('type', e.target.value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Type</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Select or type a station type"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Keep name in sync with type
                        form.setValue('name', e.target.value, { shouldValidate: true });
                      }}
                    />
                  </FormControl>
                  
                  {existingTypes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {existingTypes.map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            form.setValue('type', t, { shouldValidate: true });
                            form.setValue('name', t, { shouldValidate: true });
                          }}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === 'vr' ? '15 Min Rate (₹)' : 'Hourly Rate (₹)'}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="10" step="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Station'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStationDialog;
