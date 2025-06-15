
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useHowToUsePopup() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch dismissal status for this user
  useEffect(() => {
    const fetchPreference = async () => {
      if (!user || user.isAdmin) {
        setShouldShow(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("user_preferences")
        .select("how_to_use_dismissed")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setShouldShow(true); // Default: show popup if no record exists
      } else {
        setShouldShow(!data.how_to_use_dismissed);
      }
      setLoading(false);
    };
    fetchPreference();
  }, [user]);

  // Update preference in Supabase
  const dismiss = useCallback(async () => {
    if (!user) return;

    // Upsert preference row
    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        how_to_use_dismissed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (!error) setShouldShow(false);
  }, [user]);

  const reset = useCallback(async () => {
    if (!user) return;
    // For admin testing or re-showing tutorial
    await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        how_to_use_dismissed: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    setShouldShow(true);
  }, [user]);

  return { shouldShow, loading, dismiss, reset };
}
