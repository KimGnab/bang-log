# bang-log

파일명이 포함된 간단한 console.log 확장 프로그램

## 기능

JavaScript/TypeScript 프로젝트에서 변수를 빠르게 로깅할 수 있습니다. 로그에 파일명이 자동으로 포함되어 디버깅이 더욱 편리합니다.

### 주요 기능

- **파일명 포함 로깅**: 로그 메시지에 현재 파일명이 자동으로 추가됩니다
- **빠른 단축키**: `Option+/` (Mac) 또는 `Alt+/` (Windows/Linux)로 즉시 로그 추가
- **스마트 삽입**: 현재 줄 아래 또는 위에 로그 추가 가능
- **들여쓰기 자동 적용**: 현재 코드의 들여쓰기를 자동으로 유지

## 사용 방법

### 기본 사용법

1. 로깅하고 싶은 변수를 드래그하여 선택
2. `Option+/` (Mac) 또는 `Alt+/` (Windows/Linux) 입력
3. console.log가 자동으로 추가됩니다

### 예시

```typescript
// main.ts 파일에서
const a = 1;
```

변수 `a`를 선택하고 `Option+/`를 누르면:

```typescript
const a = 1;
console.log('main.ts > a:', a);
```

### 단축키

- `Option+/` (Mac) / `Alt+/` (Windows/Linux): 현재 줄 **아래**에 console.log 추가
- `Option+Shift+/` (Mac) / `Alt+Shift+/` (Windows/Linux): 현재 줄 **위**에 console.log 추가

## 지원 언어

- JavaScript
- TypeScript
- JavaScript React (JSX)
- TypeScript React (TSX)
- Vue
- Svelte

## 개발

### 컴파일

```bash
pnpm run compile
```

### 테스트

```bash
pnpm run test
```

### 디버그

F5를 눌러 Extension Development Host 창에서 확장 프로그램을 테스트할 수 있습니다.

## Release Notes

### 0.0.1

초기 릴리즈
- 파일명이 포함된 console.log 기능
- JavaScript/TypeScript 지원
- 키보드 단축키 지원

**Enjoy!**
