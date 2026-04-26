import React from 'react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--card-bg)] border-t border-[var(--card-border)] rounded-2xl shadow-soft">
      <span className="text-sm font-bold text-[var(--text-muted)]">
        {startIndex}–{endIndex} of {total}
      </span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--item-bg)] text-[var(--text-main)] hover:bg-[var(--card-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
        >
          <span className="text-xl leading-none">‹</span>
        </button>
        <span className="text-sm font-black text-[var(--text-main)] tracking-widest">
          {page} <span className="text-[10px] text-[var(--text-muted)] font-bold">OF</span> {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--item-bg)] text-[var(--text-main)] hover:bg-[var(--card-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
        >
          <span className="text-xl leading-none">›</span>
        </button>
      </div>
    </div>
  );
};
