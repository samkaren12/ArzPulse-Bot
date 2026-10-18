import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findAssetByQuery,
  convertCurrency,
  normalizeDigits,
  getAssetTomanPrice,
  TRANSLATIONS,
  TON_WALLET,
  TRON_WALLET,
  ARZDIGITAL_USD_URL,
} from './currencyEngine.ts';
import {
  generateAiogramBotCode,
  generateInstallBashScript,
  generateMultilangReadme,
  generateOneLineCurlCommands,
  generateDirectZero404ServerCommand,
} from './codeGenerators.ts';

test('generateOneLineCurlCommands and generateDirectZero404ServerCommand include Bot Token, Owner ID prompts, and ArzDigital engine', () => {
  const cmds = generateOneLineCurlCommands('samkaren', 'ArzPulse-Bot');
  assert.equal(
    cmds.bashSubshell,
    'bash <(curl -Ls https://raw.githubusercontent.com/samkaren/ArzPulse-Bot/main/install.sh)'
  );
  const zero404 = generateDirectZero404ServerCommand();
  assert.ok(zero404.includes('Enter your Telegram Bot API Token'));
  assert.ok(zero404.includes('Enter your Numeric Owner Telegram ID'));
  assert.ok(zero404.includes('ARZ_INSTALLER_EOF'));
  assert.ok(zero404.includes('/opt/arzpulse/bot.py'));
  assert.ok(zero404.includes(ARZDIGITAL_USD_URL));
});

test('normalizeDigits converts Persian and Arabic digits to English numbers', () => {
  assert.equal(normalizeDigits('۱۲۳۴۵'), '12345');
  assert.equal(normalizeDigits('١٠٠.٥'), '100.5');
});

test('findAssetByQuery matches Persian, English, Russian, Arabic, Chinese, and Turkish names including ArzDigital currencies', () => {
  assert.equal(findAssetByQuery('دلار')?.code, 'USD');
  assert.equal(findAssetByQuery('ترون')?.code, 'TRX');
  assert.equal(findAssetByQuery('تون کوین')?.code, 'TON');
  assert.equal(findAssetByQuery('بیت کوین')?.code, 'BTC');
  assert.equal(findAssetByQuery('پوند')?.code, 'GBP');
  assert.equal(findAssetByQuery('دینار عراق')?.code, 'IQD');
  assert.equal(findAssetByQuery('دینار کویت')?.code, 'KWD');
  assert.equal(findAssetByQuery('دلار کانادا')?.code, 'CAD');
  assert.equal(findAssetByQuery('Доллар США')?.code, 'USD');
  assert.equal(findAssetByQuery('波场')?.code, 'TRX');
  assert.equal(findAssetByQuery('Türk Lirası')?.code, 'TRY');
});

test('convertCurrency accurately converts USD to TRX, USD to IRT (Toman), and custom amounts using ArzDigital rates', () => {
  const res1 = convertCurrency(1, 'دلار', 'ترون');
  assert.ok(res1);
  assert.equal(res1.fromAsset.code, 'USD');
  assert.equal(res1.toAsset.code, 'TRX');
  assert.ok(res1.convertedAmount > 2.5 && res1.convertedAmount < 4.5);
  assert.equal(res1.tomanValue, getAssetTomanPrice(res1.fromAsset));

  const resToman = convertCurrency(1, 'USD', 'IRT');
  assert.ok(resToman);
  assert.equal(resToman.convertedAmount, 262400);

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

test('generators include exact TON and TRON wallets, colored keyboards, ArzDigital API, and sudo arz CLI', () => {
  const botCode = generateAiogramBotCode();
  assert.ok(botCode.includes('ReplyKeyboardMarkup'));
  assert.ok(botCode.includes('style="success"'));
  assert.ok(botCode.includes('style="primary"'));
  assert.ok(botCode.includes('style="danger"'));
  assert.ok(botCode.includes('lake.arzdigital.com/web/api/v1/pub/coins/'));
  assert.ok(botCode.includes(ARZDIGITAL_USD_URL));
  assert.ok(botCode.includes(TON_WALLET));
  assert.ok(botCode.includes(TRON_WALLET));

  const installScript = generateInstallBashScript();
  assert.ok(installScript.includes('/usr/local/bin/arz'));
  assert.ok(installScript.includes('certbot --nginx'));

  const readme = generateMultilangReadme();
  assert.ok(readme.includes(TON_WALLET));
  assert.ok(readme.includes(TRON_WALLET));
  assert.ok(readme.includes('sudo arz'));
  assert.ok(readme.includes(ARZDIGITAL_USD_URL));
});
