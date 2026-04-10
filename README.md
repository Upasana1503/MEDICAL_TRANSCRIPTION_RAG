# RAG-Tutorials

## Long Audio to RAG Pipeline

This project now supports a full long-audio pipeline:
1. Split long recordings into overlapping chunks.
2. Transcribe each chunk locally with Whisper.
3. Split transcript text into segments for retrieval.
4. Build FAISS index from transcript segments.
5. Retrieve relevant transcript chunks and answer with an LLM.

### 1) Ingest audio and build FAISS index

```bash
python audio_rag.py ingest \
  --audio-path /absolute/path/to/lecture_or_meeting.wav \
  --persist-dir faiss_transcript_store \
  --transcript-path audio/transcript_chunks.jsonl \
  --chunk-seconds 30 \
  --overlap-seconds 2 \
  --language en
```

### 2) Ask questions over the indexed transcript

```bash
python audio_rag.py ask \
  --question "What were the key action items?" \
  --persist-dir faiss_transcript_store \
  --top-k 5
```

`ask` now prints metrics immediately after each answer:
1. `Faithfulness` (always)
2. `Recall@K` (when `--relevant-chunk-ids` is provided)
3. `Semantic Answer Similarity` (when `--reference-answer` is provided)
4. `Query-Answer Embedding Similarity` (always)

Example with all metrics:

```bash
python audio_rag.py ask \
  --question "What were the key action items?" \
  --persist-dir faiss_transcript_store \
  --top-k 5 \
  --relevant-chunk-ids 0 1 \
  --reference-answer "The action items were to finalize the report and schedule the demo."
```

### 2.1) User-friendly interactive mode

Run one command and ask questions in a loop:

```bash
python app.py
```

Behavior:
1. Enter a question and get a clean answer immediately.
2. No extra prompts for relevant chunk IDs or reference answers.
3. Metrics are printed after the answer (`Faithfulness`, `Recall@K`, `Semantic Answer Similarity`, `Query-Answer Embedding Similarity`).
4. Type `exit` to quit.

Retrieval improvements in this build:
1. Hybrid reranking combines semantic similarity and query-token overlap.
2. Interactive mode uses `top_k=8` for broader context coverage.

### 3) Evaluate RAG quality with required metrics

Metrics implemented:
1. `Faithfulness` (hallucination control)
2. `Retrieval Recall@K` (retrieval quality)
3. `Semantic Answer Similarity` (embedding similarity to reference answer)
4. `Query-Answer Embedding Similarity` (alignment between question and generated answer)

Create an eval file (JSONL), one case per line:

```json
{"question":"What is the main topic?","reference_answer":"The talk explains machine learning basics.","relevant_chunk_ids":[0,1]}
{"question":"Which models are discussed?","reference_answer":"Logical, geometric, and probabilistic models.","relevant_chunk_ids":[2,3]}
```

Run evaluation:

```bash
python audio_rag.py evaluate \
  --eval-file audio/eval_cases.jsonl \
  --persist-dir faiss_transcript_store \
  --top-k 5 \
  --output-path audio/eval_results.json
```

### Notes

1. Set `GROQ_API_KEY` in your environment for answer generation.
2. Whisper transcription runs locally on CPU in this setup.
3. Works with long recordings by using retrieval as external memory.
