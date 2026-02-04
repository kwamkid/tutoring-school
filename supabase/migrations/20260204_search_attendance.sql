-- =====================================================
-- RPC: search_attendance
-- Server-side search, filter by subject, with pagination
-- Searches: student name, nickname, parent name, parent phone
-- =====================================================

-- Drop existing function first (return type may have changed)
DROP FUNCTION IF EXISTS search_attendance(TEXT, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_attendance(
  p_search TEXT DEFAULT NULL,
  p_subject_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  subject_id UUID,
  teacher_id UUID,
  purchase_id UUID,
  credits_used INTEGER,
  checked_at TIMESTAMPTZ,
  notes TEXT,
  status TEXT,
  student_full_name TEXT,
  student_nickname TEXT,
  subject_name TEXT,
  subject_color TEXT,
  teacher_full_name TEXT,
  parent_full_name TEXT,
  parent_phone TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_offset INTEGER;
  v_search TEXT;
BEGIN
  v_offset := (p_page - 1) * p_per_page;
  v_search := CASE WHEN p_search IS NOT NULL AND p_search != '' THEN '%' || LOWER(p_search) || '%' ELSE NULL END;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      a.id,
      a.student_id,
      a.subject_id,
      a.teacher_id,
      a.purchase_id,
      a.credits_used,
      a.checked_at,
      a.notes,
      a.status,
      s.full_name AS student_full_name,
      s.nickname AS student_nickname,
      sub.name AS subject_name,
      sub.color AS subject_color,
      tp.full_name AS teacher_full_name,
      pp.full_name AS parent_full_name,
      pp.phone AS parent_phone
    FROM attendance a
    LEFT JOIN students s ON s.id = a.student_id
    LEFT JOIN subjects sub ON sub.id = a.subject_id
    LEFT JOIN profiles tp ON tp.id = a.teacher_id
    LEFT JOIN profiles pp ON pp.id = s.parent_id
    WHERE
      (p_subject_id IS NULL OR a.subject_id = p_subject_id)
      AND (
        v_search IS NULL
        OR LOWER(s.full_name) LIKE v_search
        OR LOWER(COALESCE(s.nickname, '')) LIKE v_search
        OR LOWER(COALESCE(pp.full_name, '')) LIKE v_search
        OR COALESCE(pp.phone, '') LIKE v_search
      )
  ),
  cnt AS (
    SELECT COUNT(*)::BIGINT AS total_count FROM filtered
  )
  SELECT f.*, cnt.total_count
  FROM filtered f, cnt
  ORDER BY f.checked_at DESC
  OFFSET v_offset
  LIMIT p_per_page;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
