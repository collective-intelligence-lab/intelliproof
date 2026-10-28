-- RAG ingestion schema for the Jina 768-dimensional embedding model.

ALTER TABLE supporting_documents
    ADD COLUMN IF NOT EXISTS indexing_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS indexing_error TEXT,
    ADD COLUMN IF NOT EXISTS indexing_progress INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ;

ALTER TABLE supporting_documents
    DROP CONSTRAINT IF EXISTS supporting_documents_indexing_status_check;

ALTER TABLE supporting_documents
    ADD CONSTRAINT supporting_documents_indexing_status_check
    CHECK (indexing_status IN ('pending', 'processing', 'ready', 'failed'));

ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- The original table must use the same dimension as backend/embedding.py.
-- Existing incompatible vectors cannot be converted losslessly, so only rows
-- from a previous incompatible schema are removed before changing the type.
DO $$
DECLARE
    current_vector_type TEXT;
BEGIN
    SELECT format_type(attribute.atttypid, attribute.atttypmod)
    INTO current_vector_type
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.document_chunks'::regclass
      AND attribute.attname = 'embedding'
      AND NOT attribute.attisdropped;

    IF current_vector_type IS DISTINCT FROM 'vector(768)' THEN
        TRUNCATE TABLE document_chunks;
        ALTER TABLE document_chunks
            ALTER COLUMN embedding TYPE vector(768)
            USING NULL::vector(768);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS document_chunks_user_created_at_idx
    ON document_chunks (user_id, created_at, id);

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
    ON document_chunks (document_id);

CREATE OR REPLACE FUNCTION ingest_document_chunks(
    p_document_id UUID,
    p_user_id UUID,
    p_chunks JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    IF p_chunks IS NULL OR jsonb_typeof(p_chunks) <> 'array' THEN
        RAISE EXCEPTION 'p_chunks must be a JSON array';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));

    DELETE FROM document_chunks
    WHERE document_id = p_document_id
      AND user_id = p_user_id;

    INSERT INTO document_chunks (
        document_id,
        user_id,
        chunk_index,
        content,
        metadata,
        embedding
    )
    SELECT
        p_document_id,
        p_user_id,
        (chunk->>'chunk_index')::INTEGER,
        chunk->>'content',
        COALESCE(chunk->'metadata', '{}'::JSONB),
        (chunk->>'embedding')::VECTOR(768)
    FROM jsonb_array_elements(p_chunks) AS chunk;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    DELETE FROM document_chunks
    WHERE id IN (
        SELECT id
        FROM (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY user_id
                    ORDER BY created_at ASC, id ASC
                ) AS row_number
            FROM document_chunks
            WHERE user_id = p_user_id
        ) ranked
        WHERE row_number > 5000
    );

    RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION ingest_document_chunks(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ingest_document_chunks(UUID, UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION match_graph_document_chunks(
    query_embedding VECTOR(768),
    match_threshold FLOAT,
    match_count INT,
    p_user_id UUID,
    p_graph_id UUID
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.metadata,
        (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM document_chunks AS dc
    INNER JOIN supporting_documents AS document
        ON document.id = dc.document_id
    WHERE dc.user_id = p_user_id
      AND document.graph_id = p_graph_id
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION match_graph_document_chunks(VECTOR(768), FLOAT, INT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_graph_document_chunks(VECTOR(768), FLOAT, INT, UUID, UUID) TO service_role;