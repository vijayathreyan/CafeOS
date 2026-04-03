-- ============================================================
-- Migration 004 — Create bill-photos storage bucket
-- Used by supervisor expense entry (Section 8.1)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bill-photos',
  'bill-photos',
  false,
  5242880,  -- 5 MB per photo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
