CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "rag_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"content" text NOT NULL,
	"positions" jsonb DEFAULT '[]' NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rag_chunks_owner_id_idx" ON "rag_chunks" ("owner_id");--> statement-breakpoint
CREATE INDEX "rag_chunks_embedding_idx" ON "rag_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "rag_documents_owner_id_idx" ON "rag_documents" ("owner_id");--> statement-breakpoint
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_rag_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "rag_documents"("id") ON DELETE CASCADE;