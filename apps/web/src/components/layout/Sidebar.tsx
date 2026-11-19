import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  MessageSquare, 
  Sparkles, 
  BarChart3, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  FileText,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);

  // Fetch recent conversations for quick navigation
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      return api.get<Array<{ id: string; title: string; createdAt: string }>>('/conversations');
    },
  });

  // Fetch documents for sidebar count
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      return api.get<Array<{ id: string; title: string }>>('/documents');
    },
  });

  const handleNewChat = () => {
    navigate('/app/chat');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api.delete(`/conversations/${id}`);
      refetchConversations();
    } catch {
      // Handled in demo
    }
  };

  return (
    <aside
      className={`h-screen border-r border-ink/10 dark:border-paper/10 bg-paper dark:bg-nightRaised flex flex-col justify-between transition-all duration-180 select-none z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header & New Chat */}
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-btn bg-ink dark:bg-paper flex items-center justify-center border border-ink shadow-offset-sm">
                <span className="font-heading font-black text-acid dark:text-night text-base">A</span>
              </div>
              <span className="font-heading font-bold text-lg tracking-tight text-ink dark:text-paper">
                AskMyNotes
              </span>
            </div>
          )}

          {isCollapsed && (
            <div className="w-8 h-8 mx-auto rounded-btn bg-ink dark:bg-paper flex items-center justify-center border border-ink shadow-offset-sm">
              <span className="font-heading font-black text-acid dark:text-night text-base">A</span>
            </div>
          )}

          <button
            onClick={onToggle}
            className="p-1.5 rounded-btn hover:bg-ink/5 dark:hover:bg-paper/5 text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* New Chat Action Button */}
        <button
          onClick={handleNewChat}
          className={`btn-primary flex items-center justify-center gap-2 py-2 text-xs font-semibold ${
            isCollapsed ? 'px-0 w-8 h-8 mx-auto' : 'w-full'
          }`}
          title="New Chat"
        >
          <Plus size={16} strokeWidth={2.5} />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <nav className="space-y-1">
          <NavLink
            to="/app/library"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-btn text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-acid/20 text-forest dark:text-acid font-semibold'
                  : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5 hover:text-ink dark:hover:text-paper'
              } ${isCollapsed ? 'justify-center px-0' : ''}`
            }
            title="Library"
          >
            <BookOpen size={16} strokeWidth={1.75} />
            {!isCollapsed && (
              <div className="flex-1 flex justify-between items-center">
                <span>Library</span>
                <span className="font-mono text-[10px] bg-ink/5 dark:bg-paper/10 px-1.5 py-0.5 rounded">
                  {documents.length}
                </span>
              </div>
            )}
          </NavLink>

          <NavLink
            to="/app/chat"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-btn text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-acid/20 text-forest dark:text-acid font-semibold'
                  : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5 hover:text-ink dark:hover:text-paper'
              } ${isCollapsed ? 'justify-center px-0' : ''}`
            }
            title="Chat & Citations"
          >
            <MessageSquare size={16} strokeWidth={1.75} />
            {!isCollapsed && <span>Chat</span>}
          </NavLink>

          <NavLink
            to="/app/study"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-btn text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-acid/20 text-forest dark:text-acid font-semibold'
                  : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5 hover:text-ink dark:hover:text-paper'
              } ${isCollapsed ? 'justify-center px-0' : ''}`
            }
            title="Flashcards & Quizzes"
          >
            <Sparkles size={16} strokeWidth={1.75} />
            {!isCollapsed && <span>Study Tools</span>}
          </NavLink>

          <NavLink
            to="/app/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-btn text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-acid/20 text-forest dark:text-acid font-semibold'
                  : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5 hover:text-ink dark:hover:text-paper'
              } ${isCollapsed ? 'justify-center px-0' : ''}`
            }
            title="Admin & System Metrics"
          >
            <BarChart3 size={16} strokeWidth={1.75} />
            {!isCollapsed && <span>Metrics & Admin</span>}
          </NavLink>
        </nav>

        {/* Recent Conversations List */}
        {!isCollapsed && (
          <div className="pt-4 border-t border-ink/10 dark:border-paper/10">
            <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-ink/50 dark:text-paper/50">
              Recent Chats
            </div>
            <div className="space-y-0.5">
              {conversations.length === 0 ? (
                <div className="px-3 py-2 text-xs text-ink/40 dark:text-paper/40 italic">
                  No chats yet
                </div>
              ) : (
                conversations.map((c) => (
                  <NavLink
                    key={c.id}
                    to={`/app/chat/${c.id}`}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-3 py-1.5 rounded-btn text-xs transition-colors ${
                        isActive
                          ? 'bg-ink/10 dark:bg-paper/10 text-ink dark:text-paper font-medium'
                          : 'text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5 hover:text-ink dark:hover:text-paper'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={13} className="shrink-0 opacity-60" />
                      <span className="truncate">{c.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-danger transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </NavLink>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Profile & Sign Out footer */}
      <div className="p-3 border-t border-ink/10 dark:border-paper/10">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-ink/20 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-forest text-acid flex items-center justify-center font-bold text-xs shrink-0">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-ink dark:text-paper truncate">
                  {user?.user_metadata?.full_name || 'Alex Student'}
                </div>
                <div className="text-[11px] font-mono text-ink/50 dark:text-paper/50 truncate">
                  {user?.email || 'student@university.edu'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-btn hover:bg-ink/5 dark:hover:bg-paper/5 text-ink/60 dark:text-paper/60 hover:text-danger transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
