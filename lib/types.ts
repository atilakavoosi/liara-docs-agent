/** یک تکه از مستندات، واحد بازیابی. */
export interface DocChunk {
  id: number;
  /** URL واقعی و قابل‌کلیک روی docs.liara.ir — مبنای citation */
  sourceUrl: string;
  /** عنوان صفحه (از اولین `# `) */
  title: string;
  /** مسیر heading به‌شکل breadcrumb، برای بافت دادن به تکه */
  headingPath: string;
  /** سرویس: paas | ai | dbaas | iaas | one-click-apps | ... */
  service: string;
  /** پلتفرم/محصول در صورت وجود: nextjs | laravel | postgresql | ... */
  platform: string | null;
  /** متن تکه، آماده برای دادن به مدل */
  text: string;
  /** تعداد تقریبی توکن، برای بودجه‌بندی context */
  tokens: number;
}

export interface IndexManifest {
  builtAt: string;
  chunkCount: number;
  docCount: number;
  embeddingModel: string;
  dimensions: number;
}

/** نتیجه‌ی بازیابی: یک تکه به‌همراه امتیاز و توضیح اینکه چرا انتخاب شد. */
export interface RetrievalHit {
  chunk: DocChunk;
  score: number;
  /** سهم هر روش در امتیاز نهایی — برای پنل شفافیت در UI */
  signals: { bm25Rank?: number; vectorRank?: number; rerank?: number };
}
