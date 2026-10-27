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

## 2026-10-27 웹용 분할

원본 파일은 보존한다. 실제 서비스는 `scripts/subset-web-font.py`로 생성한 Pretendard WOFF2 구간 파일을 사용하며, 원본의 지원 문자 14,336개와 가변 굵기를 유지한다. `fonts.css`는 unicode-range로 필요한 구간만 요청한다. 현재 사용하지 않는 Gowun Batang과 전체 원본 글꼴은 운영 배포에서 제외한다. [검증 기록](../../../../docs/web-assets-and-workshop.md)을 참고한다.
