// The bilingual email-copy exporter lives in the monorepo (../scripts/) and
// writes into the backend (src/Infrastructure/Identity/EmailAssets). Standalone
// frontend deployments (Vercel) have neither, so the step is skipped there and
// the API keeps owning that export in its own pipeline.
const fs = require('node:fs');
const path = require('node:path');

const exporter = path.resolve(__dirname, '..', '..', 'scripts', 'export-email-messages.cjs');
if (fs.existsSync(exporter)) {
  require('node:child_process').execFileSync(process.execPath, [exporter], { stdio: 'inherit' });
} else {
  console.log('Email copy exporter not present in standalone frontend repo — skipped');
}
