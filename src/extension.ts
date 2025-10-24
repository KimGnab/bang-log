// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// 지원하는 언어 목록
const SUPPORTED_LANGUAGES = [
	'javascript',
	'typescript',
	'javascriptreact',
	'typescriptreact',
	'vue',
	'svelte'
] as const;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, "bang-log" is now active!');

	// Register console.log command (insert after current line)
	const consoleLog = vscode.commands.registerCommand('bang-log.clog', () => {
		doLog(false);
	});

	// Register console.log before command (insert before current line)
	const consoleLogBefore = vscode.commands.registerCommand('bang-log.clogBefore', () => {
		doLog(true);
	});

	context.subscriptions.push(consoleLog, consoleLogBefore);
}

/**
 * 현재 위치에서 statement가 끝나는 위치를 찾습니다 (세미콜론이 있는 줄).
 * @param document 문서
 * @param position 현재 커서 위치
 * @returns statement가 끝나는 줄의 끝 위치 또는 null
 */
function findStatementEnd(document: vscode.TextDocument, position: vscode.Position): vscode.Position | null {
	const openBrackets = ['{', '[', '('];
	const closeBrackets = ['}', ']', ')'];
	const bracketPairs: { [key: string]: string } = { '{': '}', '[': ']', '(': ')' };
	
	// 현재 줄에서 커서 이전의 텍스트를 분석하여 블럭 내부에 있는지 확인
	const stack: string[] = [];
	
	// 문서 시작부터 현재 위치까지 스캔
	for (let lineNum = 0; lineNum <= position.line; lineNum++) {
		const line = document.lineAt(lineNum);
		const endChar = lineNum === position.line ? position.character : line.text.length;
		
		for (let char = 0; char < endChar; char++) {
			const ch = line.text[char];
			
			if (openBrackets.includes(ch)) {
				stack.push(ch);
			} else if (closeBrackets.includes(ch)) {
				if (stack.length > 0) {
					const lastOpen = stack[stack.length - 1];
					if (bracketPairs[lastOpen] === ch) {
						stack.pop();
					}
				}
			}
		}
	}
	
	// 스택이 비어있으면 블럭 내부가 아님
	if (stack.length === 0) {
		return null;
	}
	
	// 모든 블럭이 닫히고 세미콜론을 만날 때까지 스캔
	// 현재 위치부터 끝까지 스캔
	for (let lineNum = position.line; lineNum < document.lineCount; lineNum++) {
		const line = document.lineAt(lineNum);
		const startChar = lineNum === position.line ? position.character : 0;
		
		for (let char = startChar; char < line.text.length; char++) {
			const ch = line.text[char];
			
			if (openBrackets.includes(ch)) {
				stack.push(ch);
			} else if (closeBrackets.includes(ch)) {
				if (stack.length > 0) {
					const lastOpen = stack[stack.length - 1];
					if (bracketPairs[lastOpen] === ch) {
						stack.pop();
					}
				}
			} else if (ch === ';' && stack.length === 0) {
				// 모든 블럭이 닫히고 세미콜론을 만남
				return new vscode.Position(lineNum, line.text.length);
			}
		}
		
		// 줄 끝에서 스택이 비었으면 세미콜론 없이도 statement가 끝났을 수 있음
		if (stack.length === 0 && lineNum > position.line) {
			// 하지만 JavaScript에서는 세미콜론이 없어도 괜찮은 경우가 있음
			// 다음 줄을 확인해서 새로운 statement인지 판단
			if (lineNum + 1 < document.lineCount) {
				const nextLine = document.lineAt(lineNum + 1);
				const nextLineText = nextLine.text.trim();
				// 빈 줄이거나 새로운 statement의 시작이면 여기가 끝
				if (!nextLineText || /^(const|let|var|function|class|if|for|while|return|export|import|interface|type)/.test(nextLineText)) {
					return new vscode.Position(lineNum, line.text.length);
				}
			} else {
				// 마지막 줄
				return new vscode.Position(lineNum, line.text.length);
			}
		}
	}
	
	return null;
}

function doLog(before: boolean): void {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const lang = editor.document.languageId;
	
	if (!SUPPORTED_LANGUAGES.includes(lang as any)) {
		vscode.window.showWarningMessage(`Bang Log: ${lang}는 지원되지 않는 언어입니다.`);
		return;
	}

	const selection = editor.selection;
	const line = editor.document.lineAt(selection.active.line);
	let text = editor.document.getText(selection);
	
	// 선택한 텍스트가 없으면 현재 단어 선택
	if (!text) {
		const wordRange = editor.document.getWordRangeAtPosition(selection.active);
		if (wordRange) {
			text = editor.document.getText(wordRange);
		} else {
			vscode.window.showWarningMessage('Bang Log: 로깅할 텍스트를 선택하세요.');
			return;
		}
	}

	// 멀티라인일 경우 백틱, 아니면 싱글쿼트
	const isMultiline = /\r\n|\r|\n/g.test(text);
	const wrapChar = isMultiline ? '`' : "'";
	
	// 파일명 가져오기
	const fileName = path.basename(editor.document.fileName);
	
	// 문자열 이스케이프 처리
	const escapedText = isMultiline 
		? text.replace(/`/g, '\\`').replace(/\$/g, '\\$')  // 백틱과 $ 이스케이프
		: text.replace(/'/g, "\\'");  // 싱글쿼트 이스케이프
	
	const logMessage = `${wrapChar}${fileName} > ${escapedText}:${wrapChar}`;
	
	// 삽입 위치 계산
	let dest: vscode.Position;
	let startSpace: string;
	let log: string;

	// 삽입 위치 조정
	if (before) {
		// before 모드: 현재 줄 이전에 삽입
		dest = selection.active.translate(0, -selection.active.character);
		startSpace = ' '.repeat(line.firstNonWhitespaceCharacterIndex);
		log = `${startSpace}console.log(${logMessage}, ${text});\n`;
	} else {
		// after 모드: 블럭 내부인지 확인하고 statement 끝을 찾기
		const statementEnd = findStatementEnd(editor.document, selection.active);
		
		if (statementEnd) {
			// 블럭 내부에 있으면 statement 끝 다음 줄에 삽입
			const statementLine = editor.document.lineAt(statementEnd.line);
			
			// statement 끝나는 줄이 문서의 마지막 줄이거나, 다음 줄이 존재하는지 확인
			if (statementEnd.line + 1 < editor.document.lineCount) {
				// 다음 줄이 존재하면 그 줄의 시작 위치에 삽입
				dest = new vscode.Position(statementEnd.line + 1, 0);
				startSpace = ' '.repeat(statementLine.firstNonWhitespaceCharacterIndex);
				log = `${startSpace}console.log(${logMessage}, ${text});\n`;
			} else {
				// 다음 줄이 없으면 (마지막 줄) 줄 끝에 개행 후 삽입
				dest = new vscode.Position(statementEnd.line, statementLine.text.length);
				startSpace = ' '.repeat(statementLine.firstNonWhitespaceCharacterIndex);
				log = `\n${startSpace}console.log(${logMessage}, ${text});`;
			}
		} else {
			// 블럭 외부에 있으면 현재 줄 다음에 삽입
			if (line.lineNumber + 1 < editor.document.lineCount) {
				// 다음 줄이 존재하면 그 줄의 시작 위치에 삽입
				dest = new vscode.Position(line.lineNumber + 1, 0);
				startSpace = ' '.repeat(line.firstNonWhitespaceCharacterIndex);
				log = `${startSpace}console.log(${logMessage}, ${text});\n`;
			} else {
				// 다음 줄이 없으면 (마지막 줄) 줄 끝에 개행 후 삽입
				dest = new vscode.Position(line.lineNumber, line.text.length);
				startSpace = ' '.repeat(line.firstNonWhitespaceCharacterIndex);
				log = `\n${startSpace}console.log(${logMessage}, ${text});`;
			}
		}
	}

	// 에디터에 로그 삽입
	editor.edit((editBuilder) => {
		editBuilder.insert(dest, log);
	}).then(success => {
		if (!success) {
			vscode.window.showErrorMessage('Bang Log: 로그 삽입에 실패했습니다.');
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
