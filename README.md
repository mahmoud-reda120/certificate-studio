# Certificate Studio

برنامج ديسكتوب لتوليد شهادات تقدير بالجملة من Excel.

## للأصدقاء — التحميل

بعد نشر أول إصدار:

**https://github.com/mahmoud-reda120/certificate-studio/releases/latest**

- Windows → ملف `.exe`
- Linux → ملف `.AppImage`
- macOS → ملف `.dmg`

التطبيق يتحقق من التحديثات تلقائياً عند الفتح ويطلب إعادة التشغيل عند توفر نسخة جديدة.

## للمطور (أنت)

### 1) رفع المشروع على GitHub (مرة واحدة)

```bash
cd ~/Documents/certificate-studio
bash scripts/publish-to-github.sh
```

هيسألك تسجيل دخول GitHub لو لسه مش مسجّل، يعمل repo ويرفع الكود.

### 2) كل تعديل عادي (كود فقط)

```bash
git add -A
git commit -m "وصف التعديل"
git push
```

### 3) نشر نسخة للأصدقاء (بناء + تحديث تلقائي)

```bash
# احفظ أي تعديلات أولاً
git add -A && git commit -m "وصف" && git push

# ارفع رقم الإصدار وابنِ packages لكل المنصات
bash scripts/release.sh patch
```

`patch` = 0.1.0 → 0.1.1 · `minor` · `major`

GitHub Actions هتبني الملفات وتضعها في **Releases**. ابعت لصحابك نفس لينك `releases/latest`.

### تطوير محلي

```bash
npm install
npm run dev
# أو
npm run start
```

## هيكل مختصر

- `src/main` — Electron + قارئ Excel + auto-update  
- `src/renderer` — واجهة المحرر والتصدير  
- `.github/workflows/release.yml` — بناء الإصدارات  
- `scripts/publish-to-github.sh` — أول رفع  
- `scripts/release.sh` — إصدار جديد للأصدقاء  
