import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, MessageSquare, Sparkles, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { Document } from '@askmynotes/shared';
import { api } from '@/lib/api';
import { UploadZone } from './UploadZone';
import { DocumentCard } from './DocumentCard';
import { Button } from '@/components/ui/Button';

export function Library() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Fetch documents with polling if any are currently processing
  const { data: documents = [], isLoading, refetch } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      try {
        return await api.get<Document[]>('/documents');
      } catch {
        // Mock fallback for interactive dev/testing
        return [
          {
            id: 'doc-demo-1',
            userId: '00000000-0000-0000-0000-000000000001',
            title: 'BIO-201 Cell Biology Lecture Notes.pdf',
            filePath: 'documents/00000000-0000-0000-0000-000000000001/bio-201.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3.4 * 1024 * 1024,
            pageCount: 24,
            status: 'ready',
            progress: 100,
            errorMessage: null,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'doc-demo-2',
            userId: '00000000-0000-0000-0000-000000000001',
            title: 'Macroeconomics Chapter 4 & 5.md',
            filePath: 'documents/00000000-0000-0000-0000-000000000001/macro-ch4.md',
            mimeType: 'text/markdown',
            sizeBytes: 850 * 1024,
            pageCount: 12,
            status: 'ready',
            progress: 100,
            errorMessage: null,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
        ];
      }
    },
    refetchInterval: (query) => {
      const data = query.state.data as Document[] | undefined;
      const hasProcessing = data?.some((d) => d.status === 'queued' || d.status === 'parsing' || d.status === 'embedding');
      return hasProcessing ? 2000 : 15000;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const processingCount = documents.filter(
    (d) => d.status === 'queued' || d.status === 'parsing' || d.status === 'embedding',
  ).length;

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map((d) => d.id));
    }
  };

  const handleChatWithSelected = () => {
    const docParam = selectedDocIds.join(',');
    navigate(`/app/chat?docs=${encodeURIComponent(docParam)}`);
  };

  const handleStudySelected = (docId: string) => {
    navigate(`/app/study?doc=${docId}`);
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 dark:border-paper/10 pb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-forest dark:text-acid font-semibold">
            Study Material Library
          </span>
          <h1 className="font-heading text-3xl font-extrabold text-ink dark:text-paper tracking-tight mt-0.5">
            Your Documents & Notes
          </h1>
          <p className="font-body text-xs sm:text-sm text-ink/60 dark:text-paper/60 mt-1">
            Uploaded materials are chunked, embedded into pgvector, and ready for instant citation retrieval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          {selectedDocIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleChatWithSelected}
              leftIcon={<MessageSquare size={14} />}
            >
              Chat ({selectedDocIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <UploadZone
        onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
        processingCount={processingCount}
      />

      {/* Controls: Search, Filter, Multi-select toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 dark:text-paper/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or topic..."
            className="input pl-9 text-xs"
          />
        </div>

        {/* Filter & Select All */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-ink/[0.04] dark:bg-paper/[0.06] p-1 rounded-btn text-xs font-mono">
            {['all', 'ready', 'embedding', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-paper dark:bg-nightRaised font-bold text-ink dark:text-paper shadow-xs'
                    : 'text-ink/60 dark:text-paper/60 hover:text-ink dark:hover:text-paper'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {filteredDocs.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-ink/15 dark:border-paper/15 text-xs font-mono text-ink/70 dark:text-paper/70 hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors"
            >
              {selectedDocIds.length === filteredDocs.length ? (
                <CheckSquare size={14} className="text-forest dark:text-acid" />
              ) : (
                <Square size={14} />
              )}
              <span>{selectedDocIds.length === filteredDocs.length ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Document Grid or Empty State */}
      {filteredDocs.length === 0 ? (
        <div className="border-2 border-dashed border-ink/15 dark:border-paper/15 rounded-card p-12 text-center bg-grid min-h-[260px] flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-ink/5 dark:bg-paper/10 flex items-center justify-center text-ink/40 dark:text-paper/40 mb-3">
            <Filter size={20} strokeWidth={1.5} />
          </div>
          <h3 className="font-heading font-bold text-base text-ink dark:text-paper mb-1">
            Nothing here yet. Drop a PDF and let's get studying.
          </h3>
          <p className="font-body text-xs text-ink/50 dark:text-paper/50 max-w-sm">
            Upload your lecture slides or notes above. Once ready, ask questions with exact page citations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedDocIds.includes(doc.id)}
              onSelect={handleToggleSelect}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStartChat={(id) => navigate(`/app/chat?docs=${id}`)}
              onGenerateStudy={handleStudySelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
