const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/qr-code.mjs <production-url>");
  console.error("Example: node scripts/qr-code.mjs https://ln-kitchen-menu.vercel.app");
  process.exit(1);
}

const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(url)}`;

console.log("\nL&N Kitchen Menu — QR Code\n");
console.log("Production URL:", url);
console.log("\nDownload QR image:");
console.log(qrApi);
console.log("\nVercel deploy steps:");
console.log("1. Push this repo to GitHub");
console.log("2. Import at https://vercel.com/new");
console.log("3. Deploy (Next.js auto-detected)");
console.log("4. Run: node scripts/qr-code.mjs <your-vercel-url>");
console.log("5. Print the QR image for table tents\n");
