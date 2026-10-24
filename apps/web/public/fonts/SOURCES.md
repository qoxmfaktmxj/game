# Font sources

Self-hosted on 2026-10-23. No runtime font CDN is required.

## Gowun Batang

- Authors: The Gowun Batang Project Authors (https://github.com/yangheeryu/Gowun-Batang).
- Official source and license verified at https://github.com/google/fonts/tree/main/ofl/gowunbatang.
- Browser-ready WOFF2 files: `@fontsource/gowun-batang` version `5.3.0`, from https://registry.npmjs.org/@fontsource/gowun-batang/-/gowun-batang-5.3.0.tgz.
- The downloaded archive was extracted to a temporary research directory; no package scripts or installation were run.
- Korean and Latin subsets are preserved byte-for-byte, with filenames shortened locally. Font names are unchanged.
- Original license: `GowunBatang-OFL.txt` (SIL Open Font License 1.1).

## Pretendard

- Author: Kil Hyung-jin.
- Version: `1.3.9`.
- Official binary: https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2.
- Original license: https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/LICENSE.txt, included as `Pretendard-LICENSE.txt`.
- Font binary is unchanged. The reserved font name is retained.

Load `/fonts/fonts.css`, use `Gowun Batang` for headings and `Pretendard` for the interface. All faces use `font-display: swap`. Avoid preloading the entire font set; only preload a face proven critical after rendering.
