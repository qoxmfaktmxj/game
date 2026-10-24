# 실제 인증·운영 DB와 외부 두 사람 검증

Status: open
Label: needs-info

## 필요한 결정과 입력

2026-10-23 사용자 결정으로 실제 계정 연결·DB 적용·배포를 이후로 미뤘다. Vercel을 사용하며 Supabase 연결은 진행하지 않는다. 최종 인증·DB 방식과 Colyseus 서버 운영 방식을 배포 재개 시 확정한다. 현재 준비 상태는 `docs/deployment.md`를 따른다.

## 완료 조건

- 새 migration 적용 후 anon/authenticated가 비밀 스냅샷에 접근할 수 없는지 검증.
- 실제 두 계정·두 네트워크에서 초대와 자연 종료, DRAW 복구, 재경기 확인.
- HTTPS/WSS, 허용 Origin, 백업 복원과 기록 보관 정책 검수.

## Comments

로컬 구현 및 자동 검증은 완료. 외부 리소스와 자격증명을 임의로 생성하거나 배포하지 않았다.
