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

	// 삽입 위치 계산
	let dest = selection.active.translate(0, -selection.active.character);
	const startSpace = ' '.repeat(line.firstNonWhitespaceCharacterIndex);
	
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
	let log = `${startSpace}console.log(${logMessage}, ${text});`;

	// 삽입 위치 조정
	if (before) {
		log += '\n';
	} else {
		dest = dest.translate(0, line.text.length);
		log = '\n' + log;
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
