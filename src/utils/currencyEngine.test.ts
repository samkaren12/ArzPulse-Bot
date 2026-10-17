import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findAssetByQuery,
  convertCurrency,
  normalizeDigits,
  TRANSLATIONS,
  TON_WALLET,
  TRON_WALLET,
} from './currencyEngine.ts';
import {
  generateAiogramBotCode,
  generateInstallBashScript,
  generateMultilangReadme,
  generateOneLineCurlCommands,
} from './codeGenerators.ts';

test('generateOneLineCurlCommands produces valid bash <(curl -Ls ...) one-liner', () => {
  const cmds = generateOneLineCurlCommands('samkaren', 'ArzPulse-Bot');
  assert.equal(
    cmds.bashSubshell,
    'bash <(curl -Ls https://raw.githubusercontent.com/samkaren/ArzPulse-Bot/main/install.sh)'
  );
  assert.ok(cmds.sudoPipe.includes('curl -fsSL'));
});

test('normalizeDigits converts Persian and Arabic digits to English numbers', () => {
  assert.equal(normalizeDigits('۱۲۳۴۵'), '12345');
  assert.equal(normalizeDigits('١٠٠.٥'), '100.5');
});

test('findAssetByQuery matches Persian, English, Russian, Arabic, Chinese, and Turkish names', () => {
  assert.equal(findAssetByQuery('دلار')?.code, 'USD');
  assert.equal(findAssetByQuery('ترون')?.code, 'TRX');
  assert.equal(findAssetByQuery('تون کوین')?.code, 'TON');
  assert.equal(findAssetByQuery('بیت کوین')?.code, 'BTC');
  assert.equal(findAssetByQuery('Доллар США')?.code, 'USD');
  assert.equal(findAssetByQuery('波场')?.code, 'TRX');
  assert.equal(findAssetByQuery('Türk Lirası')?.code, 'TRY');
});

test('convertCurrency accurately converts USD to TRX and custom amounts', () => {
  const res1 = convertCurrency(1, 'دلار', 'ترون');
  assert.ok(res1);
  assert.equal(res1.fromAsset.code, 'USD');
  assert.equal(res1.toAsset.code, 'TRX');
  assert.ok(res1.convertedAmount > 3.5 && res1.convertedAmount < 5.0);

  const res10 = convertCurrency(10, 'USD', 'TRX');
  assert.ok(res10);
  assert.ok(Math.abs(res10.convertedAmount - res1.convertedAmount * 10) < 0.0001);
});

test('all 6 required languages exist in TRANSLATIONS with complete keys', () => {
  const requiredLangs = ['fa', 'en', 'ru', 'ar', 'zh', 'tr'] as const;
  for (const lang of requiredLangs) {
    assert.ok(TRANSLATIONS[lang], `Missing translation for ${lang}`);
    assert.ok(TRANSLATIONS[lang].btnPrice.length > 0);
    assert.ok(TRANSLATIONS[lang].btnConvert.length > 0);
    assert.ok(TRANSLATIONS[lang].btnOwnerPanel.length > 0);
  }
});

test('generators include exact TON and TRON wallets, colored keyboards, and sudo arz CLI', () => {
  const botCode = generateAiogramBotCode();
  assert.ok(botCode.includes('ReplyKeyboardMarkup'));
  assert.ok(botCode.includes('style="success"'));
  assert.ok(botCode.includes('style="primary"'));
  assert.ok(botCode.includes('style="danger"'));
  assert.ok(botCode.includes(TON_WALLET));
  assert.ok(botCode.includes(TRON_WALLET));

  const installScript = generateInstallBashScript();
  assert.ok(installScript.includes('/usr/local/bin/arz'));
  assert.ok(installScript.includes('certbot --nginx'));

  const readme = generateMultilangReadme();
  assert.ok(readme.includes(TON_WALLET));
  assert.ok(readme.includes(TRON_WALLET));
  assert.ok(readme.includes('sudo arz'));
});
