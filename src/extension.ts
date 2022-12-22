////////////////////
// IMPORTS
////////////////////
import * as vscode from 'vscode';
import * as crypto from 'crypto';

////////////////////
// CONSTANTS
////////////////////
// Backend API Url
const SERVER_URL: string = 'https://suntenna.herokuapp.com/generations';
// Time out for requests
const REQUEST_TIMEOUT: number = 15000;

////////////////////
// REQUEST UTILITIES
////////////////////

/**
* Sends post request to SERVER_URL with documentUriHashId as id and dataString with request data
* @param {string} documentUriHashId
* @param {string} dataString
* @returns {Promise} 
*/
async function postRequest(documentUriHashId: string, dataString: string) {
	const https = require('node:https');

	return new Promise((resolve, reject) => {
	   const options = {
			method: "POST",
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': dataString.length,
			},
			timeout: REQUEST_TIMEOUT, // in ms
	   };
	   const req = https.request(`${SERVER_URL}/${documentUriHashId}`, options, (res) => {
		 if (res.statusCode < 200 || res.statusCode >= 300) {
			   return reject(new Error('statusCode=' + res.statusCode));
		   }

		   var body = [];
		   res.on('data', function(chunk) {
			   body.push(chunk);
		   });

		   res.on('end', function() {
			   try {
				   body = JSON.parse(Buffer.concat(body).toString());
			   } catch(e) {
				   reject(e);
			   }
			   resolve(body);
		   });
	   });

	   req.on('error', (e) => {
		 reject(e.message);
	   });
	   // send the request
	   req.write(dataString);
	   req.end();
   });
}

/**
* Sends get request to SERVER_URL to retrieve tests generated for documentUriHashId
* @param {string} documentUriHashId
* @returns {Promise} 
*/
async function getRequest(documentUriHashId: string) {
	const https = require('node:https');

	return new Promise((resolve, reject) => {
	   const options = {
			method: "GET",
			timeout: REQUEST_TIMEOUT, // in ms
	   };
	   const req = https.request(`${SERVER_URL}/${documentUriHashId}`, options, (res) => {
		 if (res.statusCode < 200 || res.statusCode >= 300) {
			   return reject(new Error('statusCode=' + res.statusCode));
		   }

		   var body = [];
		   res.on('data', function(chunk) {
			   body.push(chunk);
		   });

		   res.on('end', function() {
			   try {
				   body = JSON.parse(Buffer.concat(body).toString());
			   } catch(e) {
				   reject(e);
			   }
			   resolve(body);
		   });
	   });

	   req.on('error', (e) => {
		 reject(e.message);
	   });
	   
	   // send the request
	   req.end();
   });
}

////////////////////
// VSCODE UTILITIES
////////////////////
/**
* Returns active text editor
* @returns {vscode.TextEditor} 
*/
function getActiveTextEditor() {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) {
		vscode.window.showInformationMessage('No active text editor');
	}
	return activeTextEditor;
}

/**
* Appends text to end of document in a pretty way
* @param {string} text 
* @param {vscode.TextDocument} document
*/
async function prettyAddTextAsNewLine(text: string, document: vscode.TextDocument) {
	await addTextAsNewLine('\n', document);
	await addTextAsNewLine('\n', document);
	await fixTrailingSpaces(document);
	await addTextAsNewLine(text, document);
}

/**
* Appends text to end of document
* @param {string} text 
* @param {vscode.TextDocument} document
*/
async function addTextAsNewLine(text: string, document: vscode.TextDocument): Promise<boolean> {
	let lastLine = document.lineCount-1;
	let lastChar = document.lineAt(lastLine).text.length;

	let workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.insert(document.uri, new vscode.Position(lastLine, lastChar), text);

	return vscode.workspace.applyEdit(workspaceEdit);
}

/**
* Fixes trailing spaces at the end of document
* @param {vscode.TextDocument} document
*/
async function fixTrailingSpaces(document: vscode.TextDocument): Promise<boolean> {
	const lastLine = document.lineCount-1;
	let lastChar = document.lineAt(lastLine).text.length;
	let line = document.lineAt(lastLine);
	let trimmedLine = line.text.trim();
	let charRange = new vscode.Range(new vscode.Position(lastLine, 0), new vscode.Position(lastLine, lastChar));

	let workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.replace(document.uri, charRange, trimmedLine);

	return vscode.workspace.applyEdit(workspaceEdit);
}

/**
* Generates tests and appends them at the end of the document
* @param {PythonLanguageTextEditor} textEditor
* @param {vscode.TextDocument} activeDocument
*/
async function generateAndAddTests(textEditor: PythonLanguageTextEditor , activeDocument: vscode.TextDocument, line: vscode.TextLine) {
	const documentText: string = activeDocument.getText();
	const functionName = textEditor.getFunctionName(line.text);
	const documentUriString = activeDocument.uri.toString();
	const documentUriHashId = crypto.createHash('sha256').update(documentUriString).digest('hex');

  	const dataString = JSON.stringify({code: documentText, function_name: functionName});

	const postResponse: any = await postRequest(documentUriHashId, dataString).then((data) => {
    	return data;
	});

	vscode.window.showInformationMessage(postResponse.response);

	if (!postResponse || postResponse.state === 3) {
		return;
	}

	const interval = setInterval(async function() {
		const getResponse: any = await getRequest(documentUriHashId).then((data) => {
			return data;
		});

		if (getResponse && getResponse.state === 1) {
			vscode.window.showInformationMessage(postResponse.response);
		}
		else {
			textEditor.addResponseDataToFile(getResponse, activeDocument);
			clearInterval(interval);
			vscode.window.showInformationMessage("Test generation is now complete");
		}}, REQUEST_TIMEOUT);
};

//////////////////////////
// LANGUAGE EDITOR CLASSES
//////////////////////////

/////////////////////////////
// LANGUAGE EDITOR BASE CLASS
/////////////////////////////
class LanguageTextEditor {
    public fileExtension: string;
    public functionName: string;
    public commentCharacter: string;
    public assertStatements: Array<string>;

    constructor(fileExtension: string, functionName: string, commentCharacter: string, assertStatements: Array<string>) {
        this.fileExtension = fileExtension;
        this.functionName = functionName;
        this.commentCharacter = commentCharacter;
        this.assertStatements = assertStatements;
      }

    public isLineFunction(codeLine: string): boolean {
        return codeLine.includes(this.functionName);
    }

    public doesLineAssert(codeLine: string): boolean {
        for (const assertStatement of this.assertStatements){
            if (codeLine.includes(assertStatement)){
                return true;
            }
        }
        return false;
    }

    public isFileOfThisLanguage(fileName: string){
        return fileName.endsWith(this.fileExtension);
    }
}

///////////////////////////////
// LANGUAGE EDITOR PYTHON CLASS
///////////////////////////////
class PythonLanguageTextEditor extends LanguageTextEditor{
    constructor() {
        super("py", "def", '#', ["assert", "np.assert"]);
      };

    public getFunctionName(codeLine: string): string{
        const functionNameStart = codeLine.indexOf(this.functionName) + this.functionName.length + 1;
        const functionNameEnd = codeLine.indexOf("(");
        return codeLine.substring(functionNameStart, functionNameEnd);
    }

    public async addResponseDataToFile(responseData: any, activeDocument: vscode.TextDocument) {
        if (!responseData.response) {
            await prettyAddTextAsNewLine(this.getErrorMessageText(), activeDocument);
        }
    
        await prettyAddTextAsNewLine(responseData.response, activeDocument);
    }

    private getErrorMessageText(): string{
        return "# An error occured please try again later. The server is probably down for maintenance.";
    }
}

//////////////////////////////////////////////////
// EXTENSION ACTIVATION AND DEACTIVATION FUNCTIONS
//////////////////////////////////////////////////
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('Tenerate.generateTests', async () => {
	// Get text editor and text document information	
		const activeTextEditor = getActiveTextEditor();
		
		if (activeTextEditor) {
			const cursorPosition = activeTextEditor.selection.active;
			let activeDocument = activeTextEditor.document;
			const line: vscode.TextLine = activeDocument.lineAt(cursorPosition);
			const fileSuffix: string = activeDocument.fileName.split(".").at(-1) || "";

			let pythonTextEditor = new PythonLanguageTextEditor();
			try {
				// Invoke endpoint for test generation if line has function 
				if (pythonTextEditor.isFileOfThisLanguage(fileSuffix) && pythonTextEditor.isLineFunction(line.text)) {
					generateAndAddTests(pythonTextEditor, activeDocument, line);
				}
			} catch(e) {
				let commentCharacter = "";
				
				if (pythonTextEditor.isFileOfThisLanguage(fileSuffix)) {
					commentCharacter = "#";
				}
	
				await prettyAddTextAsNewLine(`${commentCharacter} An error occured with test generation. Please try again later.`, activeDocument);
			}
		}
		
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}