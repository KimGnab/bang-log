import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Bang Log Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	/**
	 * 테스트용 문서를 생성하고 커맨드를 실행한 후 결과를 확인하는 헬퍼 함수
	 */
	async function testLogInsertion(
		input: string,
		cursorLine: number,
		cursorChar: number,
		expectedOutput: string,
		command: string = 'bang-log.clog'
	): Promise<void> {
		// 임시 파일로 문서 생성 (파일명을 위해)
		const uri = vscode.Uri.parse('untitled:test.ts');
		const document = await vscode.workspace.openTextDocument(uri);

		const editor = await vscode.window.showTextDocument(document);

		// 텍스트 삽입
		await editor.edit(editBuilder => {
			editBuilder.insert(new vscode.Position(0, 0), input);
		});

		// 약간의 대기 시간
		await new Promise(resolve => setTimeout(resolve, 50));

		// 커서 위치 설정 및 단어 선택
		const position = new vscode.Position(cursorLine, cursorChar);
		const wordRange = editor.document.getWordRangeAtPosition(position);
		
		if (wordRange) {
			editor.selection = new vscode.Selection(wordRange.start, wordRange.end);
		} else {
			// 단어 범위를 찾지 못한 경우
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			throw new Error(`단어를 찾지 못했습니다 at line ${cursorLine}, char ${cursorChar}`);
		}

		// 약간의 대기 시간
		await new Promise(resolve => setTimeout(resolve, 50));

		// 커맨드 실행
		await vscode.commands.executeCommand(command);

		// 결과 확인 전 대기
		await new Promise(resolve => setTimeout(resolve, 100));

		// 결과 확인
		const result = editor.document.getText();
		
		// 문서 닫기
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

		assert.strictEqual(result.trim(), expectedOutput.trim(), 
			`Expected:\n${expectedOutput}\n\nGot:\n${result}`);
	}

	test('객체 리터럴 내부에서 변수 선택 시 블럭 외부에 로그 삽입', async () => {
		const input = `const initialData = {
  meta,
  optionSpecList,
};`;

		const expected = `const initialData = {
  meta,
  optionSpecList,
};
console.log('test.ts > meta:', meta);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('중첩된 객체 내부에서 변수 선택 시 가장 가까운 블럭 외부에 로그 삽입', async () => {
		const input = `const obj = {
  nested: {
    value,
  }
};`;

		const expected = `const obj = {
  nested: {
    value,
  }
};
console.log('test.ts > value:', value);`;

		await testLogInsertion(input, 2, 4, expected);
	});

	test('배열 내부에서 변수 선택 시 블럭 외부에 로그 삽입', async () => {
		const input = `const arr = [
  item1,
  item2,
];`;

		const expected = `const arr = [
  item1,
  item2,
];
console.log('test.ts > item1:', item1);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('함수 호출의 객체 인자 내부에서 변수 선택 시 블럭 외부에 로그 삽입', async () => {
		const input = `doSomething({
  name,
  value,
});`;

		const expected = `doSomething({
  name,
  value,
});
console.log('test.ts > name:', name);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('블럭 외부에서 변수 선택 시 다음 줄에 로그 삽입', async () => {
		const input = `const name = "test";
const value = 123;`;

		const expected = `const name = "test";
console.log('test.ts > name:', name);
const value = 123;`;

		await testLogInsertion(input, 0, 6, expected);
	});

	test('clogBefore 명령 - 현재 줄 이전에 로그 삽입', async () => {
		const input = `const name = "test";
const value = 123;`;

		const expected = `console.log('test.ts > name:', name);
const name = "test";
const value = 123;`;

		await testLogInsertion(input, 0, 6, expected, 'bang-log.clogBefore');
	});

	test('한 줄 객체 리터럴에서 변수 선택', async () => {
		const input = `const obj = { name, value };
const next = "something";`;

		const expected = `const obj = { name, value };
console.log('test.ts > name:', name);
const next = "something";`;

		await testLogInsertion(input, 0, 14, expected);
	});

	test('화살표 함수 파라미터로 전달된 객체 내부', async () => {
		const input = `items.map(item => ({
  id,
  name,
}));`;

		const expected = `items.map(item => ({
  id,
  name,
}));
console.log('test.ts > id:', id);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('세미콜론이 없는 객체 리터럴', async () => {
		const input = `const obj = {
  name,
  value
}
const next = "test"`;

		const expected = `const obj = {
  name,
  value
}
console.log('test.ts > name:', name);
const next = "test"`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('배열의 배열 내부', async () => {
		const input = `const matrix = [
  [a, b],
  [c, d],
];`;

		const expected = `const matrix = [
  [a, b],
  [c, d],
];
console.log('test.ts > a:', a);`;

		await testLogInsertion(input, 1, 3, expected);
	});

	test('함수 인자로 전달된 배열 내부', async () => {
		const input = `doSomething([
  item1,
  item2,
]);`;

		const expected = `doSomething([
  item1,
  item2,
]);
console.log('test.ts > item1:', item1);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('여러 개의 중첩된 블럭 - 깊은 중첩', async () => {
		const input = `const data = {
  user: {
    profile: {
      name,
    },
  },
};`;

		const expected = `const data = {
  user: {
    profile: {
      name,
    },
  },
};
console.log('test.ts > name:', name);`;

		await testLogInsertion(input, 3, 6, expected);
	});

	test('삼항 연산자와 객체', async () => {
		const input = `const result = condition ? {
  value,
  status,
} : null;`;

		const expected = `const result = condition ? {
  value,
  status,
} : null;
console.log('test.ts > value:', value);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('export 문과 함께 사용되는 객체', async () => {
		const input = `export const config = {
  apiKey,
  endpoint,
};`;

		const expected = `export const config = {
  apiKey,
  endpoint,
};
console.log('test.ts > apiKey:', apiKey);`;

		await testLogInsertion(input, 1, 2, expected);
	});

	test('객체 메서드 내부', async () => {
		const input = `const obj = {
  method: function() {
    return {
      value,
    };
  }
};`;

		const expected = `const obj = {
  method: function() {
    return {
      value,
    };
  }
};
console.log('test.ts > value:', value);`;

		await testLogInsertion(input, 3, 6, expected);
	});

	test('destructuring과 함께 사용', async () => {
		const input = `const { a, b } = obj;
const result = 123;`;

		const expected = `const { a, b } = obj;
console.log('test.ts > a:', a);
const result = 123;`;

		await testLogInsertion(input, 0, 8, expected);
	});

	test('배열 destructuring', async () => {
		const input = `const [first, second] = arr;
const next = "value";`;

		const expected = `const [first, second] = arr;
console.log('test.ts > first:', first);
const next = "value";`;

		await testLogInsertion(input, 0, 7, expected);
	});

	test('객체 스프레드와 함께', async () => {
		const input = `const merged = {
  ...base,
  extra,
};`;

		const expected = `const merged = {
  ...base,
  extra,
};
console.log('test.ts > extra:', extra);`;

		await testLogInsertion(input, 2, 2, expected);
	});
});
