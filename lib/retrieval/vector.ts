/**
 * جستجوی برداری روی ایندکس متراکمِ درون‌حافظه.
 *
 * ایندکس یک `Float32Array` تخت به‌طول `chunkCount × dimensions` ـه. برای
 * ۲۳۵۸ تکه × ۱۵۳۶ بعد می‌شه ~۱۳.۸ مگابایت — یعنی پیمایش کامل (brute force)
 * در چند میلی‌ثانیه تموم می‌شه و هیچ ساختار ANN یا دیتابیس برداری لازم
 * نیست. (ADR-003)
 */

export class VectorIndex {
  private readonly data: Float32Array;
  readonly dimensions: number;
  readonly count: number;

  constructor(data: Float32Array, dimensions: number) {
    this.data = data;
    this.dimensions = dimensions;
    this.count = data.length / dimensions;
    if (!Number.isInteger(this.count)) {
      throw new Error(
        `طول ایندکس برداری (${data.length}) بر ابعاد (${dimensions}) بخش‌پذیر نیست.`,
      );
    }
  }

  /**
   * شباهت کسینوسی بین کوئری و همه‌ی تکه‌ها.
   * بردارهای OpenAI از پیش نرمال‌شده‌ن، پس ضرب داخلی همون کسینوسه؛ ولی
   * کوئری رو دفاعی نرمال می‌کنیم تا اگر ارائه‌دهنده رفتارش فرق کرد نشکنه.
   */
  search(queryVector: number[] | Float32Array, topK = 50): Array<[number, number]> {
    if (queryVector.length !== this.dimensions) {
      throw new Error(
        `ابعاد کوئری (${queryVector.length}) با ایندکس (${this.dimensions}) نمی‌خونه.`,
      );
    }

    let norm = 0;
    for (let i = 0; i < queryVector.length; i++) norm += queryVector[i] * queryVector[i];
    norm = Math.sqrt(norm) || 1;

    const scores = new Float32Array(this.count);
    for (let doc = 0; doc < this.count; doc++) {
      const offset = doc * this.dimensions;
      let dot = 0;
      for (let d = 0; d < this.dimensions; d++) {
        dot += this.data[offset + d] * queryVector[d];
      }
      scores[doc] = dot / norm;
    }

    // انتخاب topK بدون مرتب‌سازی کل آرایه
    const idx = Array.from({ length: this.count }, (_, i) => i);
    idx.sort((a, b) => scores[b] - scores[a]);
    return idx.slice(0, topK).map((i) => [i, scores[i]] as [number, number]);
  }
}
