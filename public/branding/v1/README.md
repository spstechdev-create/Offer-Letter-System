# Immutable SPS letter assets v1

These files are copied from the supplied legacy application, not fetched at render time.

| File | Source |
| --- | --- |
| utem-header.png | internWeb/utem-header.png |
| utem-watermark.png | internWeb/UTEM.png |
| footer-banner.png | internWeb/footer-banner.png |
| server-assets/branding/v1/signature.jpg (private) | internWeb/SIGNPROF.jpg |
| sps-logo.png | studentregistration/images/sps-logo.png |
| fonts/NotoSans-Regular.ttf | notofonts/noto-fonts, hinted/ttf/NotoSans |
| fonts/NotoSans-Bold.ttf | notofonts/noto-fonts, hinted/ttf/NotoSans |

Noto Sans is distributed under the included SIL Open Font License (`fonts/OFL.txt`). The bundled font covers Latin, Greek and Cyrillic text; the generator rejects unsupported glyphs explicitly. Use passport spelling in Latin characters for scripts not yet covered.

Never replace an asset in this directory after letters using `sps-v1` have been issued. Add a new directory and branding version instead. The legacy banner contains a 25th anniversary mark; review and introduce a new version if current branding is required. Signatory images are only included when the saved signatory explicitly specifies `signatureAsset: 'sps-v1'`.
