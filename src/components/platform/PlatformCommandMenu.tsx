import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Building2,
  Shield,
  Sparkles,
  Megaphone,
  FlaskConical,
  Activity,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
};

export const PlatformCommandMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load organizations for instant search
  const orgsQuery = useQuery({
    queryKey: ["platform", "command-menu-orgs"],
    queryFn: async () => {
      const res = await fetch("/api/platform/organizations", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load orgs");
      return json.organizations as OrgRow[];
    },
    staleTime: 60_000,
    enabled: open, // Only fetch when command menu is opened
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    const handleOpenCustom = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-platform-command-palette", handleOpenCustom);

    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-platform-command-palette", handleOpenCustom);
    };
  }, []);

  const runCommand = (action: () => void) => {
    action();
    setOpen(false);
    setSearch("");
  };

  const orgs = orgsQuery.data ?? [];

  return (
    <AnimatePresence>
      {open && (
        <DialogOverlay setOpen={setOpen}>
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0a21]/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[450px]"
          >
            <Command label="Platform Operator command menu" className="flex flex-col h-full font-quicksand">
              <div className="relative flex items-center px-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search pages, organizations, or actions..."
                  className="w-full bg-transparent py-4 pl-9 pr-4 text-zinc-100 placeholder-zinc-500 border-none outline-none focus:ring-0 text-sm"
                  autoFocus
                />
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[9px] font-bold text-zinc-500 shrink-0">
                  ESC
                </kbd>
              </div>

              <Command.List className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5 border-t border-white/5 max-h-[350px]">
                <Command.Empty className="py-8 text-center text-zinc-500 text-sm">
                  No matching operators or logs found.
                </Command.Empty>

                <Command.Group
                  heading="Navigation"
                  className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-3 py-2 mt-2 block"
                >
                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <LayoutDashboard className="h-4 w-4 text-zinc-400" />
                    <span>Go to Overview Dashboard</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform/organizations"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <Building2 className="h-4 w-4 text-zinc-400" />
                    <span>Go to Organizations List</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform/admins"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <Shield className="h-4 w-4 text-zinc-400" />
                    <span>Go to Admins Roster</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform/plans"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <Sparkles className="h-4 w-4 text-zinc-400" />
                    <span>Go to Billing Plans</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform/broadcasts"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <Megaphone className="h-4 w-4 text-zinc-400" />
                    <span>Go to System Broadcasts</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform/sandbox"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <FlaskConical className="h-4 w-4 text-zinc-400" />
                    <span>Go to Demo Sandboxes</span>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/platform/audit"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <span>Go to Platform Audit Log</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group
                  heading="Actions"
                  className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-2 mt-2 block"
                >
                  <Command.Item
                    onSelect={() =>
                      runCommand(() => {
                        queryClient.invalidateQueries({ queryKey: ["platform"] });
                        queryClient.invalidateQueries({ queryKey: ["platform-sandbox-grants"] });
                      })
                    }
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                  >
                    <RefreshCw className="h-4 w-4 text-zinc-400" />
                    <span>Refresh Console Cache</span>
                  </Command.Item>
                </Command.Group>

                {orgs.length > 0 && (
                  <Command.Group
                    heading="Organizations"
                    className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest px-3 py-2 mt-2 block"
                  >
                    {orgs.map((org) => (
                      <Command.Item
                        key={org.id}
                        onSelect={() => runCommand(() => navigate(`/platform/organizations/${org.id}`))}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Building2 className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="truncate">{org.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0 bg-white/5 px-1.5 py-0.5 rounded">
                          {org.slug}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </DialogOverlay>
      )}
    </AnimatePresence>
  );
};

const DialogOverlay: React.FC<{
  children: React.ReactNode;
  setOpen: (o: boolean) => void;
}> = ({ children, setOpen }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4 bg-black/70 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
};
