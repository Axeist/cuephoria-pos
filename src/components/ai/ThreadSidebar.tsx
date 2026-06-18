/**
 * ThreadSidebar — list of saved chat threads for the current tenant+user.
 *
 * Two variants share the same core `ThreadList`:
 *   - <ThreadSidebar />      desktop rail (collapsible)
 *   - <ThreadListBody />     body-only, used inside the mobile sheet
 *
 * A thread row shows its auto-generated title, the last-active time, and
 * the model badge. Inline actions (rename, delete) appear on hover.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AI_MODELS } from "@/services/openRouterService";
import type { ChatThread } from "@/services/aiChatHistory";

interface CommonProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

function modelLabel(id: string): string {
  return AI_MODELS.find((m) => m.id === id)?.label ?? id;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

interface SidebarProps extends CommonProps {
  collapsed: boolean;
  onToggleCollapsed: (next: boolean) => void;
}

export const ThreadSidebar: React.FC<SidebarProps> = ({
  threads,
  activeThreadId,
  onNew,
  onSelect,
  onRename,
  onDelete,
  collapsed,
  onToggleCollapsed,
}) => {
  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: collapsed ? 58 : 272 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="relative hidden md:flex flex-col border-r border-white/5 bg-white/[0.015] backdrop-blur-xl"
      style={{ minWidth: 58 }}
    >
      {/* top bar */}
      <div className="flex h-12 items-center gap-1 border-b border-white/5 px-2">
        <Button
          onClick={() => onToggleCollapsed(!collapsed)}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/55 hover:bg-white/5 hover:text-white"
          title={collapsed ? "Expand chats" : "Collapse chats"}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="inline-flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.span>
        </Button>
        {!collapsed && (
          <span className="select-none text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Conversations
          </span>
        )}
      </div>

      {/* new chat */}
      <div className="p-2">
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNew}
          className={`group flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-left text-[13px] font-medium text-white transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--accent) / 0.15) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 22px -10px hsl(var(--primary) / 0.55)",
          }}
          title="Start a new chat"
        >
          <Plus className="h-4 w-4 text-[hsl(var(--primary))]" />
          {!collapsed && <span>New chat</span>}
        </motion.button>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <AnimatePresence initial={false}>
          {threads.length === 0 && !collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 px-3 text-center text-[11px] text-white/40"
            >
              No saved chats yet. Your conversations appear here automatically.
            </motion.div>
          )}

          {threads.map((t) => (
            <ThreadRow
              key={t.id}
              thread={t}
              active={t.id === activeThreadId}
              collapsed={collapsed}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};

/** Body-only variant used inside the mobile Sheet. */
export const ThreadListBody: React.FC<CommonProps> = ({
  threads,
  activeThreadId,
  onNew,
  onSelect,
  onRename,
  onDelete,
}) => {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button
          onClick={onNew}
          className="w-full justify-start gap-2 text-[13px] font-medium"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
          }}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {threads.length === 0 ? (
          <div className="mt-4 px-3 text-center text-[12px] text-white/45">
            No saved chats yet.
          </div>
        ) : (
          threads.map((t) => (
            <ThreadRow
              key={t.id}
              thread={t}
              active={t.id === activeThreadId}
              collapsed={false}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface RowProps {
  thread: ChatThread;
  active: boolean;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const ThreadRow: React.FC<RowProps> = ({
  thread,
  active,
  collapsed,
  onSelect,
  onRename,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== thread.title) onRename(thread.id, next);
    else setDraft(thread.title);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`group relative my-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] transition-colors ${
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/75 hover:bg-white/[0.04] hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {/* Active indicator bar */}
      {active && !collapsed && (
        <motion.span
          layoutId="thread-indicator"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
          style={{ background: "hsl(var(--primary))" }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        />
      )}

      <button
        onClick={() => onSelect(thread.id)}
        className="flex flex-1 items-center gap-2 overflow-hidden"
      >
        <MessageSquare className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-[hsl(var(--primary))]" : "text-white/40"}`} />

        {!collapsed && !editing && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{thread.title}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/40">
              <span className="truncate">{modelLabel(thread.modelId)}</span>
              <span>·</span>
              <span className="whitespace-nowrap">{relativeTime(thread.updatedAt)}</span>
            </div>
          </div>
        )}

        {!collapsed && editing && (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(thread.title);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-7 border-white/10 bg-white/5 px-2 text-[12px] text-white"
          />
        )}
      </button>

      {!collapsed && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
              title="Thread options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-36 border-white/10 bg-[hsl(var(--background)/0.95)] backdrop-blur-xl"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="text-[12px]"
            >
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread.id);
              }}
              className="text-[12px] text-red-300 focus:text-red-200"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
};

export default ThreadSidebar;
