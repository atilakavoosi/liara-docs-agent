import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ایندکس بازیابی با fs از روی دیسک خونده می‌شه، نه با import. پس Next
  // به‌طور خودکار نمی‌فهمه که این فایل‌ها وابستگی runtime ـن و ممکنه در
  // خروجی standalone جاشون بذاره. اینجا صریح اعلامشون می‌کنیم تا اگه
  // مجبور شدیم به پلتفرم Docker لیارا سوییچ کنیم، دیپلوی نشکنه.
  outputFileTracingIncludes: {
    "/api/**": ["./data/**"],
  },
};

export default nextConfig;
