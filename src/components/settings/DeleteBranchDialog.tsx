import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeleteBranchMode = "delete_all" | "migrate_to_main";

type BranchSummary = {
  id: string;
  name: string;
  slug: string;
};

type DeleteBranchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: BranchSummary | null;
  mainBranchName: string | null;
  onDeleted: (result: { mode: DeleteBranchMode; mainLocationId: string }) => void;
};

const DeleteBranchDialog: React.FC<DeleteBranchDialogProps> = ({
  open,
  onOpenChange,
  branch,
  mainBranchName,
  onDeleted,
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<DeleteBranchMode>("migrate_to_main");
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode("migrate_to_main");
      setConfirmName("");
      setDeleting(false);
    }
  }, [open]);

  const nameMatches =
    branch && confirmName.trim().toLowerCase() === branch.name.trim().toLowerCase();

  const submit = async () => {
    if (!branch || !nameMatches) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/tenant/locations", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: branch.id,
          mode,
          confirmName: confirmName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not delete branch");

      toast({
        title: mode === "migrate_to_main" ? "Branch removed, data migrated" : "Branch and data deleted",
        description:
          mode === "migrate_to_main"
            ? `All records from "${branch.name}" were moved to ${mainBranchName ?? "Main"}.`
            : `All data for "${branch.name}" was permanently deleted.`,
      });

      onDeleted({ mode, mainLocationId: json.mainLocationId as string });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Could not delete branch",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!branch) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Delete branch permanently?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left text-sm text-muted-foreground">
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This cannot be undone</AlertTitle>
                <AlertDescription className="text-destructive/90">
                  Deleting <span className="font-semibold text-foreground">{branch.name}</span> affects
                  everything tied to this branch: customers, memberships, bills, sessions, bookings,
                  stations, inventory, cash records, tournaments, offers, and reports. Public booking
                  links using <span className="font-mono text-xs">{branch.slug}</span> will stop working.
                </AlertDescription>
              </Alert>

              <p className="font-medium text-foreground">Choose what happens to the data</p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMode("migrate_to_main")}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    mode === "migrate_to_main"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  <p className="font-medium text-foreground">Migrate everything to Main</p>
                  <p className="mt-1 text-xs">
                    Move customers, billing, sessions, bookings, and all other records to{" "}
                    <span className="font-medium">{mainBranchName ?? "your main branch"}</span>.
                    Customers with the same phone number will be merged.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("delete_all")}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    mode === "delete_all"
                      ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                      : "hover:bg-muted/50",
                  )}
                >
                  <p className="font-medium text-destructive">Delete all branch data</p>
                  <p className="mt-1 text-xs">
                    Permanently erase every customer, bill, session, booking, and setting for this branch.
                    Nothing is copied to Main.
                  </p>
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-branch-name">
                  Type <span className="font-semibold text-foreground">{branch.name}</span> to confirm
                </Label>
                <Input
                  id="confirm-branch-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={branch.name}
                  autoComplete="off"
                  disabled={deleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            variant="destructive"
            className="w-full gap-1.5"
            disabled={!nameMatches || deleting}
            onClick={() => void submit()}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {mode === "migrate_to_main" ? "Migrate to Main and delete branch" : "Delete all data and branch"}
          </Button>
          <AlertDialogCancel disabled={deleting} className="w-full mt-0">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBranchDialog;
